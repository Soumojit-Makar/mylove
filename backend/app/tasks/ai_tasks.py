"""AI Celery tasks — lead scoring, churn prediction, CSV import (optimized)."""

import asyncio
from app.core.celery_app import celery_app


def _run(coro):
    """Run a coroutine in a fresh event loop (Celery workers are sync)."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="app.tasks.ai_tasks.score_lead_task", bind=True, max_retries=3)
def score_lead_task(self, lead_id: str, tenant_id: str):
    async def _inner():
        from app.core.database import connect_db, get_db
        from app.core.redis import cache_delete_pattern
        from app.services.ai_scorer import score_lead
        from app.services.workflow_engine import trigger_event
        from bson import ObjectId
        from datetime import datetime, timezone

        await connect_db()
        db = get_db()

        lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
        if not lead:
            return

        score, factors = await score_lead(lead)

        await db.leads.update_one(
            {"_id": ObjectId(lead_id)},
            {"$set": {"score": score, "score_factors": factors,
                      "scored_at": datetime.now(timezone.utc)}},
        )
        # Invalidate lead caches so next read reflects the new score
        await cache_delete_pattern(f"lead:{lead_id}")

        await trigger_event("lead.score_changed", {
            "lead_id": lead_id, "score": score, "tenant_id": tenant_id,
        })

    try:
        _run(_inner())
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)


@celery_app.task(name="app.tasks.ai_tasks.rescore_all_leads")
def rescore_all_leads():
    """Nightly batch: enqueue a score task for every active lead."""
    async def _inner():
        from app.core.database import connect_db, get_db
        await connect_db()
        db = get_db()
        # Stream cursor — don't load all leads into memory at once
        async for lead in db.leads.find(
            {"status": {"$nin": ["disqualified"]}},
            {"_id": 1, "tenant_id": 1},   # projection — only what the task needs
        ):
            score_lead_task.delay(str(lead["_id"]), lead["tenant_id"])

    _run(_inner())


@celery_app.task(name="app.tasks.ai_tasks.update_churn_scores")
def update_churn_scores():
    """Every 6 hours: recompute churn probability for all accounts."""
    async def _inner():
        from app.core.database import connect_db, get_db
        from app.services.ai_scorer import predict_churn
        from app.services.workflow_engine import trigger_event
        from datetime import datetime, timezone

        await connect_db()
        db = get_db()

        updates: list[dict] = []
        high_risk: list[dict] = []

        async for account in db.accounts.find({}, {"_id": 1, "tenant_id": 1}):
            score, reason = await predict_churn(account)
            updates.append({
                "filter": {"_id": account["_id"]},
                "update": {"$set": {
                    "churn_score": score,
                    "churn_reason": reason,
                    "churn_scored_at": datetime.now(timezone.utc),
                }},
            })
            if score > 70:
                high_risk.append({
                    "account_id": str(account["_id"]),
                    "tenant_id": account["tenant_id"],
                    "churn_score": score,
                })

        # Bulk write instead of one update_one per account
        if updates:
            from pymongo import UpdateOne
            ops = [UpdateOne(u["filter"], u["update"]) for u in updates]
            await db.accounts.bulk_write(ops, ordered=False)

        # Fire churn events after bulk write
        for payload in high_risk:
            await trigger_event("account.churn_risk", payload)

    _run(_inner())


@celery_app.task(name="app.tasks.ai_tasks.import_leads_csv_task")
def import_leads_csv_task(csv_content: str, tenant_id: str, user_id: str):
    """Import leads from CSV, skipping duplicates. Returns count of imported leads."""

    async def _inner() -> int:
        import csv
        import io
        from app.core.database import connect_db, get_db
        from datetime import datetime, timezone

        await connect_db()
        db = get_db()

        reader = csv.DictReader(io.StringIO(csv_content))
        rows = [r for r in reader if r.get("email", "").strip()]

        if not rows:
            return 0

        # Batch-fetch all emails that already exist — one round-trip instead of N
        emails = [r["email"].strip() for r in rows]
        existing_docs = await db.leads.find(
            {"contact.email": {"$in": emails}, "tenant_id": tenant_id},
            {"contact.email": 1},
        ).to_list(None)
        existing_emails = {d["contact"]["email"] for d in existing_docs}

        now = datetime.now(timezone.utc)
        new_docs = []
        for row in rows:
            email = row["email"].strip()
            if email in existing_emails:
                continue
            new_docs.append({
                "contact": {
                    "name":    row.get("name", ""),
                    "email":   email,
                    "phone":   row.get("phone", ""),
                    "company": row.get("company", ""),
                    "title":   row.get("title", ""),
                },
                "source":     row.get("source", "csv_import"),
                "value":      float(row.get("value") or 0),
                "tags":       [],
                "status":     "new",
                "score":      0,
                "tenant_id":  tenant_id,
                "created_by": user_id,
                "created_at": now,
                "updated_at": now,
            })

        if not new_docs:
            return 0

        # Bulk insert — one round-trip for all new leads
        result = await db.leads.insert_many(new_docs, ordered=False)
        inserted_ids = result.inserted_ids

        # Enqueue AI scoring for each new lead
        for oid in inserted_ids:
            score_lead_task.delay(str(oid), tenant_id)

        return len(inserted_ids)

    return _run(_inner())
