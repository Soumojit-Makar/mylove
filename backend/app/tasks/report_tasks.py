"""Report Celery tasks — generate and deliver reports."""
import asyncio
from app.core.celery_app import celery_app


def run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="app.tasks.report_tasks.generate_report_task", queue="reports")
def generate_report_task(report_type: str, period: str, tenant_id: str, user_id: str):
    async def _run():
        from app.core.database import connect_db, get_db
        from datetime import datetime, timezone
        await connect_db()
        db = get_db()
        now = datetime.now(timezone.utc)
        data = {}

        if report_type == "revenue":
            pipeline = [
                {"$match": {"tenant_id": tenant_id, "stage": "won"}},
                {"$group": {"_id": None, "total": {"$sum": "$value"},
                            "count": {"$sum": 1}, "avg": {"$avg": "$value"}}},
            ]
            r = await db.deals.aggregate(pipeline).to_list(1)
            data = r[0] if r else {}

        elif report_type == "leads":
            data["total"] = await db.leads.count_documents({"tenant_id": tenant_id})
            data["by_status"] = []
            for status in ["new", "mql", "sql", "disqualified"]:
                count = await db.leads.count_documents({"tenant_id": tenant_id, "status": status})
                data["by_status"].append({"status": status, "count": count})

        elif report_type == "sla":
            total = await db.tickets.count_documents({"tenant_id": tenant_id})
            breached = await db.tickets.count_documents({"tenant_id": tenant_id, "sla_breached": True})
            data = {"total": total, "breached": breached,
                    "compliance_rate": round((1 - breached / total) * 100, 1) if total else 100}

        report_doc = {
            "type": report_type, "period": period, "tenant_id": tenant_id,
            "generated_by": user_id, "data": data,
            "status": "ready", "created_at": now,
        }
        await db.reports.insert_one(report_doc)

    run_async(_run())


@celery_app.task(name="app.tasks.report_tasks.send_scheduled_reports", queue="reports")
def send_scheduled_reports():
    async def _run():
        from app.core.database import connect_db, get_db
        from datetime import datetime, timezone
        await connect_db()
        db = get_db()
        now = datetime.now(timezone.utc)
        async for sched in db.scheduled_reports.find({"active": True}):
            last = sched.get("last_sent_at")
            freq = sched.get("frequency", "weekly")
            from datetime import timedelta
            thresholds = {"hourly": timedelta(hours=1), "daily": timedelta(days=1),
                          "weekly": timedelta(weeks=1), "monthly": timedelta(days=30)}
            threshold = thresholds.get(freq, timedelta(weeks=1))
            if last and (now - last) < threshold:
                continue
            generate_report_task.delay(
                sched.get("report_type", "revenue"), sched.get("period", "30d"),
                sched["tenant_id"], sched.get("created_by", "system"),
            )
            await db.scheduled_reports.update_one(
                {"_id": sched["_id"]}, {"$set": {"last_sent_at": now}}
            )
    run_async(_run())
