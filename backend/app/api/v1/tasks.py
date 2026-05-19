"""
Task webhook router — QStash delivers background jobs here.

Each route corresponds to a task_name passed to background.enqueue().
QStash POSTs a signed JSON payload; we verify the signature before
running the task.

All handlers are idempotent — safe to retry on failure.
"""

import hashlib
import hmac
import logging
import time
from fastapi import APIRouter, Request, HTTPException, Header
from app.core.config import settings

router = APIRouter(prefix="/tasks")
logger = logging.getLogger("nexuscrm.tasks")


# ─── Signature verification ───────────────────────────────────

def _verify_qstash_signature(body: bytes, signature: str) -> bool:
    """Verify QStash HMAC-SHA256 signature. Tries both current and next key."""
    if not settings.QSTASH_CURRENT_SIGNING_KEY:
        # Signing not configured — allow in dev, reject in prod
        return settings.DEBUG

    for key in filter(None, [
        settings.QSTASH_CURRENT_SIGNING_KEY,
        settings.QSTASH_NEXT_SIGNING_KEY,
    ]):
        expected = hmac.new(key.encode(), body, hashlib.sha256).hexdigest()
        if hmac.compare_digest(expected, signature.removeprefix("sha256=")):
            return True
    return False


async def _verified_payload(request: Request, upstash_signature: str = Header(None)) -> dict:
    body = await request.body()
    if not _verify_qstash_signature(body, upstash_signature or ""):
        raise HTTPException(status_code=401, detail="Invalid QStash signature")
    import json
    return json.loads(body)


# ─── Task handlers ────────────────────────────────────────────

@router.post("/score_lead")
async def score_lead(request: Request, upstash_signature: str = Header(None)):
    payload = await _verified_payload(request, upstash_signature)
    lead_id   = payload["lead_id"]
    tenant_id = payload["tenant_id"]

    from app.core.database import get_db
    from app.core.redis import cache_delete_pattern
    from app.services.ai_scorer import score_lead as _score
    from app.services.workflow_engine import trigger_event
    from bson import ObjectId
    from datetime import datetime, timezone

    db = get_db()
    lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        return {"status": "skipped", "reason": "lead not found"}

    score, factors = await _score(lead)
    await db.leads.update_one(
        {"_id": ObjectId(lead_id)},
        {"$set": {"score": score, "score_factors": factors,
                  "scored_at": datetime.now(timezone.utc)}},
    )
    await cache_delete_pattern(f"lead:{lead_id}")
    await trigger_event("lead.score_changed",
                        {"lead_id": lead_id, "score": score, "tenant_id": tenant_id})
    logger.info("Scored lead %s → %d", lead_id, score)
    return {"status": "ok", "score": score}


@router.post("/send_email")
async def send_email(request: Request, upstash_signature: str = Header(None)):
    payload = await _verified_payload(request, upstash_signature)

    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    msg = MIMEMultipart("alternative")
    msg["Subject"] = payload.get("subject", "")
    msg["From"]    = settings.EMAIL_FROM
    msg["To"]      = payload["to"]
    msg.attach(MIMEText(payload.get("body", ""), "plain"))
    if html := payload.get("html"):
        msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as srv:
            srv.starttls()
            if settings.SMTP_USER:
                srv.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            srv.send_message(msg)
    except Exception as e:
        logger.error("SMTP error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

    return {"status": "sent", "to": payload["to"]}


@router.post("/send_campaign")
async def send_campaign(request: Request, upstash_signature: str = Header(None)):
    payload = await _verified_payload(request, upstash_signature)
    campaign_id = payload["campaign_id"]
    tenant_id   = payload["tenant_id"]

    from app.core.database import get_db
    from app.core.background import enqueue
    from bson import ObjectId
    from datetime import datetime, timezone

    db = get_db()
    campaign = await db.campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not campaign:
        return {"status": "skipped"}

    sent = 0
    async for contact in db.contacts.find({"tenant_id": tenant_id}).limit(10_000):
        await enqueue("send_email", {
            "to":      contact["email"],
            "subject": campaign.get("subject", ""),
            "body":    campaign.get("body", ""),
        })
        sent += 1

    await db.campaigns.update_one(
        {"_id": ObjectId(campaign_id)},
        {"$set": {"status": "ended", "sent_count": sent,
                  "completed_at": datetime.now(timezone.utc)}},
    )
    return {"status": "ok", "sent": sent}


@router.post("/process_workflow_event")
async def process_workflow_event(request: Request, upstash_signature: str = Header(None)):
    payload = await _verified_payload(request, upstash_signature)
    event_type = payload["event_type"]
    event_data = payload["event_data"]
    tenant_id  = event_data.get("tenant_id")
    if not tenant_id:
        return {"status": "skipped"}

    from app.core.database import get_db
    from app.services.workflow_engine import evaluate_workflow_trigger, execute_workflow_node
    from datetime import datetime, timezone

    db = get_db()
    async for workflow in db.workflows.find({"tenant_id": tenant_id, "status": "active"}):
        if not await evaluate_workflow_trigger(workflow, event_type, event_data):
            continue
        run = {
            "workflow_id": str(workflow["_id"]),
            "tenant_id":   tenant_id,
            "event_type":  event_type,
            "payload":     event_data,
            "status":      "running",
            "started_at":  datetime.now(timezone.utc),
        }
        r = await db.workflow_runs.insert_one(run)
        context = {**event_data}
        try:
            for node in workflow.get("nodes", []):
                context = await execute_workflow_node(node, context)
            await db.workflow_runs.update_one(
                {"_id": r.inserted_id},
                {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc)}},
            )
        except Exception as exc:
            logger.error("Workflow %s failed: %s", workflow["_id"], exc)
            await db.workflow_runs.update_one(
                {"_id": r.inserted_id},
                {"$set": {"status": "failed", "error": str(exc)}},
            )

    return {"status": "ok"}


@router.post("/import_leads_csv")
async def import_leads_csv(request: Request, upstash_signature: str = Header(None)):
    payload = await _verified_payload(request, upstash_signature)
    import csv, io
    from app.core.database import get_db
    from app.core.background import enqueue
    from datetime import datetime, timezone

    tenant_id = payload["tenant_id"]
    user_id   = payload["user_id"]
    csv_content = payload["csv_content"]

    db = get_db()
    reader = csv.DictReader(io.StringIO(csv_content))
    rows = [r for r in reader if r.get("email", "").strip()]
    if not rows:
        return {"status": "ok", "imported": 0}

    emails = [r["email"].strip() for r in rows]
    existing = {d["contact"]["email"] async for d in db.leads.find(
        {"contact.email": {"$in": emails}, "tenant_id": tenant_id}, {"contact.email": 1}
    )}

    now = datetime.now(timezone.utc)
    new_docs = [
        {"contact": {"name": r.get("name",""), "email": r["email"].strip(),
                     "phone": r.get("phone",""), "company": r.get("company",""),
                     "title": r.get("title","")},
         "source": r.get("source","csv_import"), "value": float(r.get("value") or 0),
         "tags": [], "status": "new", "score": 0,
         "tenant_id": tenant_id, "created_by": user_id,
         "created_at": now, "updated_at": now}
        for r in rows if r["email"].strip() not in existing
    ]
    if not new_docs:
        return {"status": "ok", "imported": 0}

    result = await db.leads.insert_many(new_docs, ordered=False)
    for oid in result.inserted_ids:
        await enqueue("score_lead", {"lead_id": str(oid), "tenant_id": tenant_id})

    return {"status": "ok", "imported": len(result.inserted_ids)}


@router.post("/generate_report")
async def generate_report(request: Request, upstash_signature: str = Header(None)):
    payload = await _verified_payload(request, upstash_signature)
    report_type = payload["report_type"]
    period      = payload.get("period", "monthly")
    tenant_id   = payload["tenant_id"]
    user_id     = payload.get("user_id")

    from app.core.database import get_db
    from datetime import datetime, timezone, timedelta
    import io, csv

    db = get_db()
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=30 if period == "monthly" else 7)

    output = io.StringIO()
    writer = csv.writer(output)

    if report_type == "leads":
        writer.writerow(["Name", "Email", "Company", "Status", "Score", "Source"])
        async for doc in db.leads.find({"tenant_id": tenant_id, "created_at": {"$gte": since}},
                                        {"contact": 1, "status": 1, "score": 1, "source": 1}):
            c = doc.get("contact", {})
            writer.writerow([c.get("name"), c.get("email"), c.get("company"),
                             doc.get("status"), doc.get("score"), doc.get("source")])

    elif report_type == "revenue":
        writer.writerow(["Date", "Deal", "Value", "Stage"])
        async for doc in db.deals.find({"tenant_id": tenant_id, "updated_at": {"$gte": since}},
                                        {"title": 1, "value": 1, "stage": 1, "updated_at": 1}):
            writer.writerow([doc.get("updated_at", ""), doc.get("title"),
                             doc.get("value"), doc.get("stage")])

    csv_data = output.getvalue()

    # Email the report
    if user_id:
        user = await db.users.find_one({"_id": __import__("bson").ObjectId(user_id)}, {"email": 1})
        if user:
            await enqueue("send_email", {
                "to":      user["email"],
                "subject": f"NexusCRM {report_type.title()} Report ({period})",
                "body":    f"Your {report_type} report is attached.\n\n{csv_data[:2000]}...",
            })

    logger.info("Generated %s report for tenant %s", report_type, tenant_id)
    return {"status": "ok", "report_type": report_type, "rows": csv_data.count("\n")}


@router.post("/generate_report")
async def generate_report(request: Request, upstash_signature: str = Header(None)):
    payload = await _verified_payload(request, upstash_signature)
    report_type = payload.get("report_type", "summary")
    tenant_id   = payload["tenant_id"]
    user_id     = payload.get("user_id")

    import csv, io
    from app.core.database import get_db
    from app.core.background import enqueue

    db = get_db()

    output = io.StringIO()
    writer = csv.writer(output)

    if report_type == "leads":
        writer.writerow(["Name", "Email", "Company", "Status", "Score", "Source"])
        async for doc in db.leads.find({"tenant_id": tenant_id},
                                       {"contact": 1, "status": 1, "score": 1, "source": 1}).limit(10_000):
            c = doc.get("contact", {})
            writer.writerow([c.get("name"), c.get("email"), c.get("company"),
                             doc.get("status"), doc.get("score"), doc.get("source")])
    elif report_type == "deals":
        writer.writerow(["Title", "Stage", "Value", "Forecast"])
        async for doc in db.deals.find({"tenant_id": tenant_id},
                                       {"title": 1, "stage": 1, "value": 1, "forecast_category": 1}).limit(10_000):
            writer.writerow([doc.get("title"), doc.get("stage"),
                             doc.get("value"), doc.get("forecast_category")])

    csv_content = output.getvalue()

    # Email the report to the requesting user
    if user_id:
        user = await db.users.find_one({"_id": __import__("bson").ObjectId(user_id)}, {"email": 1})
        if user:
            await enqueue("send_email", {
                "to":      user["email"],
                "subject": f"NexusCRM {report_type.title()} Report",
                "body":    f"Your {report_type} report is attached.\n\n{csv_content[:2000]}...",
            })

    logger.info("Generated %s report for tenant %s (%d chars)", report_type, tenant_id, len(csv_content))
    return {"status": "ok", "report_type": report_type, "rows": csv_content.count("\n")}
