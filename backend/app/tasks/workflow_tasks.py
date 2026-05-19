"""Workflow Celery tasks."""
import asyncio
from app.core.celery_app import celery_app


def run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="app.tasks.workflow_tasks.process_event", queue="workflows")
def process_event(event_type: str, payload: dict):
    async def _run():
        from app.core.database import connect_db, get_db
        from app.services.workflow_engine import evaluate_workflow_trigger, execute_workflow_node
        from datetime import datetime, timezone
        await connect_db()
        db = get_db()
        tenant_id = payload.get("tenant_id")
        if not tenant_id:
            return
        async for workflow in db.workflows.find({"tenant_id": tenant_id, "status": "active"}):
            if not await evaluate_workflow_trigger(workflow, event_type, payload):
                continue
            run_doc = {
                "workflow_id": str(workflow["_id"]),
                "tenant_id": tenant_id,
                "event_type": event_type,
                "payload": payload,
                "status": "running",
                "started_at": datetime.now(timezone.utc),
            }
            r = await db.workflow_runs.insert_one(run_doc)
            run_id = r.inserted_id
            context = {**payload}
            try:
                for node in workflow.get("nodes", []):
                    context = await execute_workflow_node(node, context)
                await db.workflow_runs.update_one(
                    {"_id": run_id},
                    {"$set": {"status": "success", "completed_at": datetime.now(timezone.utc),
                              "context": context}}
                )
                await db.workflows.update_one(
                    {"_id": workflow["_id"]},
                    {"$inc": {"stats.runs": 1, "stats.success": 1}}
                )
            except Exception as e:
                await db.workflow_runs.update_one(
                    {"_id": run_id},
                    {"$set": {"status": "failed", "error": str(e),
                              "completed_at": datetime.now(timezone.utc)}}
                )
                await db.workflows.update_one(
                    {"_id": workflow["_id"]},
                    {"$inc": {"stats.runs": 1, "stats.failures": 1}}
                )
    run_async(_run())


@celery_app.task(name="app.tasks.workflow_tasks.execute_workflow", queue="workflows")
def execute_workflow(workflow_id: str, tenant_id: str, payload: dict):
    process_event.delay("manual_trigger", {**payload, "tenant_id": tenant_id,
                                            "workflow_id": workflow_id})


@celery_app.task(name="app.tasks.workflow_tasks.check_sla_breaches", queue="workflows")
def check_sla_breaches():
    async def _run():
        from app.core.database import connect_db, get_db
        from app.services.workflow_engine import trigger_event
        from datetime import datetime, timezone
        await connect_db()
        db = get_db()
        now = datetime.now(timezone.utc)
        async for ticket in db.tickets.find({
            "status": {"$in": ["open", "in_progress"]},
            "sla_breach_at": {"$lte": now},
            "sla_breached": {"$ne": True},
        }):
            await db.tickets.update_one(
                {"_id": ticket["_id"]}, {"$set": {"sla_breached": True}}
            )
            await trigger_event("ticket.sla_breached", {
                "ticket_id": str(ticket["_id"]),
                "tenant_id": ticket["tenant_id"],
                "priority": ticket.get("priority"),
            })
    run_async(_run())
