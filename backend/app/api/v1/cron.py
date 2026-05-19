"""
Cron job router — triggered by Vercel Cron (vercel.json `crons`).

Vercel calls these GET endpoints on the configured schedule.
Each handler is protected by CRON_SECRET to prevent public access.

Set CRON_SECRET in Vercel env vars to a random string and add it to
the Authorization header Vercel sends (Settings → Cron Jobs → Secret).
"""

import logging
from fastapi import APIRouter, Header, HTTPException
from app.core.config import settings

router = APIRouter(prefix="/cron")
logger = logging.getLogger("nexuscrm.cron")


def _auth(authorization: str | None):
    """Vercel sends `Authorization: Bearer <CRON_SECRET>`."""
    expected = f"Bearer {settings.CRON_SECRET}"
    if not settings.CRON_SECRET or authorization != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


# ─── Nightly lead re-score  (02:00 UTC) ──────────────────────
@router.get("/rescore-leads")
async def rescore_leads(authorization: str | None = Header(None)):
    _auth(authorization)
    from app.core.database import get_db
    from app.core.background import enqueue

    db = get_db()
    queued = 0
    async for lead in db.leads.find(
        {"status": {"$nin": ["disqualified"]}},
        {"_id": 1, "tenant_id": 1},
    ):
        await enqueue("score_lead", {"lead_id": str(lead["_id"]), "tenant_id": lead["tenant_id"]})
        queued += 1

    logger.info("Cron rescore-leads: queued %d leads", queued)
    return {"status": "ok", "queued": queued}


# ─── Hourly scheduled reports  (:00 every hour) ──────────────
@router.get("/scheduled-reports")
async def scheduled_reports(authorization: str | None = Header(None)):
    _auth(authorization)
    from app.core.database import get_db
    from app.core.background import enqueue
    from datetime import datetime, timezone

    db = get_db()
    now = datetime.now(timezone.utc)
    queued = 0
    async for report in db.scheduled_reports.find({
        "enabled": True,
        "next_run": {"$lte": now},
    }):
        await enqueue("generate_report", {
            "report_id":  str(report["_id"]),
            "tenant_id":  report["tenant_id"],
            "report_type": report.get("type", "summary"),
        })
        queued += 1

    logger.info("Cron scheduled-reports: queued %d reports", queued)
    return {"status": "ok", "queued": queued}


# ─── SLA breach check  (every 5 min) ─────────────────────────
@router.get("/sla-check")
async def sla_check(authorization: str | None = Header(None)):
    _auth(authorization)
    from app.core.database import get_db
    from app.services.workflow_engine import trigger_event
    from datetime import datetime, timezone

    db = get_db()
    now = datetime.now(timezone.utc)
    breached = 0
    async for ticket in db.tickets.find({
        "status": {"$in": ["open", "in_progress"]},
        "sla_breach_at": {"$lte": now},
        "sla_breached_notified": {"$ne": True},
    }, {"_id": 1, "tenant_id": 1, "priority": 1}):
        await trigger_event("ticket.sla_breached", {
            "ticket_id": str(ticket["_id"]),
            "tenant_id": ticket["tenant_id"],
            "priority":  ticket.get("priority"),
        })
        await db.tickets.update_one(
            {"_id": ticket["_id"]},
            {"$set": {"sla_breached_notified": True}},
        )
        breached += 1

    logger.info("Cron sla-check: %d breaches fired", breached)
    return {"status": "ok", "breached": breached}


# ─── Churn score update  (every 6 hours) ─────────────────────
@router.get("/churn-scores")
async def churn_scores(authorization: str | None = Header(None)):
    _auth(authorization)
    from app.core.database import get_db
    from app.services.ai_scorer import predict_churn
    from app.services.workflow_engine import trigger_event
    from pymongo import UpdateOne
    from datetime import datetime, timezone

    db = get_db()
    updates, high_risk = [], []
    now = datetime.now(timezone.utc)

    async for account in db.accounts.find({}, {"_id": 1, "tenant_id": 1}):
        score, reason = await predict_churn(account)
        updates.append(UpdateOne(
            {"_id": account["_id"]},
            {"$set": {"churn_score": score, "churn_reason": reason, "churn_scored_at": now}},
        ))
        if score > 70:
            high_risk.append({"account_id": str(account["_id"]),
                               "tenant_id": account["tenant_id"], "churn_score": score})

    if updates:
        await db.accounts.bulk_write(updates, ordered=False)
    for payload in high_risk:
        await trigger_event("account.churn_risk", payload)

    logger.info("Cron churn-scores: updated %d accounts, %d high-risk", len(updates), len(high_risk))
    return {"status": "ok", "updated": len(updates), "high_risk": len(high_risk)}
