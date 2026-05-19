"""Reports router — KPI scorecards, scheduled delivery, exports (Vercel-compatible)."""

import asyncio
import io
import csv
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from bson import ObjectId

from app.core.database import get_db
from app.core.security import require_permission
from app.core.redis import cache_set, cache_get

router = APIRouter(prefix="/reports")

_KPI_TTL = 300  # 5 min


def _s(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc


@router.get("/kpi-scorecard")
async def kpi_scorecard(user: dict = Depends(require_permission("reports.read"))):
    tid = user["tenant_id"]
    cache_key = f"reports:kpi:{tid}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    db = get_db()
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    leads_mtd, deals_won_mtd, tickets_resolved, rev = await asyncio.gather(
        db.leads.count_documents({"tenant_id": tid, "created_at": {"$gte": month_start}}),
        db.deals.count_documents({"tenant_id": tid, "stage": "won", "updated_at": {"$gte": month_start}}),
        db.tickets.count_documents({"tenant_id": tid, "status": "resolved", "updated_at": {"$gte": month_start}}),
        db.deals.aggregate([
            {"$match": {"tenant_id": tid, "stage": "won", "updated_at": {"$gte": month_start}}},
            {"$group": {"_id": None, "total": {"$sum": "$value"}}},
        ]).to_list(1),
    )

    result = {
        "period": "MTD",
        "metrics": [
            {"key": "revenue_mtd",       "label": "Revenue (MTD)",     "value": rev[0]["total"] if rev else 0, "unit": "USD"},
            {"key": "leads_mtd",         "label": "New Leads",         "value": leads_mtd},
            {"key": "deals_won",         "label": "Deals Won",         "value": deals_won_mtd},
            {"key": "tickets_resolved",  "label": "Tickets Resolved",  "value": tickets_resolved},
        ],
    }
    await cache_set(cache_key, result, ttl=_KPI_TTL)
    return result


@router.post("/schedule")
async def schedule_report(
    report_type: str,
    recipients: list,
    frequency: str,
    user: dict = Depends(require_permission("reports.create")),
):
    db = get_db()
    now = datetime.now(timezone.utc)
    doc = {
        "report_type": report_type,
        "recipients":  recipients,
        "frequency":   frequency,
        "tenant_id":   user["tenant_id"],
        "created_by":  str(user["_id"]),
        "enabled":     True,
        "next_run":    now,
        "created_at":  now,
        "updated_at":  now,
    }
    r = await db.scheduled_reports.insert_one(doc)
    return {"id": str(r.inserted_id), "message": "Report scheduled"}


@router.get("/scheduled")
async def list_scheduled(user: dict = Depends(require_permission("reports.read"))):
    db = get_db()
    items = [_s(d) async for d in db.scheduled_reports.find({"tenant_id": user["tenant_id"]})]
    return {"items": items}


@router.post("/export/{report_type}")
async def export_report(
    report_type: str,
    format: str = "csv",
    user: dict = Depends(require_permission("reports.read")),
):
    """
    Synchronous inline export — returns the file directly.

    On Vercel (max 30 s execution), we generate exports inline rather than
    queuing to Celery. For large tenants with >50K records, paginate or
    use a pre-signed S3 URL pattern instead.
    """
    db = get_db()
    tid = user["tenant_id"]

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)

        if report_type == "leads":
            writer.writerow(["Name", "Email", "Company", "Status", "Score", "Source", "Created"])
            async for doc in db.leads.find({"tenant_id": tid}, {"contact": 1, "status": 1, "score": 1, "source": 1, "created_at": 1}).limit(10_000):
                c = doc.get("contact", {})
                writer.writerow([
                    c.get("name"), c.get("email"), c.get("company"),
                    doc.get("status"), doc.get("score"), doc.get("source"),
                    doc.get("created_at", "").isoformat() if doc.get("created_at") else "",
                ])

        elif report_type == "deals":
            writer.writerow(["Title", "Stage", "Value", "Owner", "Forecast", "Created"])
            async for doc in db.deals.find({"tenant_id": tid}, {"title": 1, "stage": 1, "value": 1, "owner_id": 1, "forecast_category": 1, "created_at": 1}).limit(10_000):
                writer.writerow([
                    doc.get("title"), doc.get("stage"), doc.get("value"),
                    doc.get("owner_id"), doc.get("forecast_category"),
                    doc.get("created_at", "").isoformat() if doc.get("created_at") else "",
                ])

        elif report_type == "tickets":
            writer.writerow(["Number", "Title", "Status", "Priority", "Assigned To", "Created"])
            async for doc in db.tickets.find({"tenant_id": tid}, {"ticket_number": 1, "title": 1, "status": 1, "priority": 1, "assigned_to": 1, "created_at": 1}).limit(10_000):
                writer.writerow([
                    doc.get("ticket_number"), doc.get("title"), doc.get("status"),
                    doc.get("priority"), doc.get("assigned_to"),
                    doc.get("created_at", "").isoformat() if doc.get("created_at") else "",
                ])

        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{report_type}_{tid}.csv"'},
        )

    # JSON fallback
    collections = {"leads": db.leads, "deals": db.deals, "tickets": db.tickets}
    coll = collections.get(report_type, db.leads)
    items = [_s(d) async for d in coll.find({"tenant_id": tid}).limit(5_000)]
    return {"report_type": report_type, "total": len(items), "items": items}


@router.post("/generate")
async def generate_report(
    report_type: str,
    period: str = "monthly",
    user: dict = Depends(require_permission("reports.read")),
):
    """Queue a heavy report for async generation via QStash + email delivery."""
    from app.core.background import enqueue
    await enqueue("generate_report", {
        "report_type": report_type,
        "period":      period,
        "tenant_id":   user["tenant_id"],
        "user_id":     str(user["_id"]),
    })
    return {"message": "Report generation queued — you'll receive an email when ready"}
