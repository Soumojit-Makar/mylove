"""Workflow engine — event trigger dispatcher (Vercel-compatible, no Celery)."""

import logging
from app.core.redis import publish_event

logger = logging.getLogger("nexuscrm.workflow")


async def trigger_event(event_type: str, payload: dict):
    """Publish event to Redis SSE channel and enqueue for workflow processing."""
    from app.core.background import enqueue

    tenant_id = payload.get("tenant_id", "global")

    # Push to SSE stream for connected frontend clients
    await publish_event(f"events:{tenant_id}", {
        "event": event_type,
        "data":  payload,
    })

    # Enqueue workflow rule evaluation
    await enqueue("process_workflow_event", {
        "event_type": event_type,
        "event_data": payload,
    })


def _matches_condition(op: str, actual, value) -> bool:
    if actual is None:
        return False
    match op:
        case "eq":       return actual == value
        case "ne":       return actual != value
        case "gt":       return actual > value
        case "gte":      return actual >= value
        case "lt":       return actual < value
        case "lte":      return actual <= value
        case "contains": return value in str(actual)
        case "in":       return actual in (value if isinstance(value, list) else [value])
        case _:          return False


async def evaluate_workflow_trigger(workflow: dict, event_type: str, payload: dict) -> bool:
    trigger = workflow.get("trigger", {})
    if trigger.get("type") != event_type:
        return False
    return all(
        _matches_condition(c.get("operator", "eq"), payload.get(c["field"]), c.get("value"))
        for c in trigger.get("conditions", [])
    )


async def execute_workflow_node(node: dict, context: dict) -> dict:
    from app.core.background import enqueue

    match node.get("type"):
        case "send_email":
            await enqueue("send_email", {
                "to":        context.get("email"),
                "subject":   node.get("subject", ""),
                "body":      node.get("body", ""),
                "tenant_id": context.get("tenant_id"),
            })

        case "assign_lead":
            from bson import ObjectId
            from app.core.database import get_db
            if lead_id := context.get("lead_id"):
                db = get_db()
                await db.leads.update_one(
                    {"_id": ObjectId(lead_id)},
                    {"$set": {"assigned_to": node.get("assigned_to")}},
                )

        case "create_task":
            from datetime import datetime, timezone
            from app.core.database import get_db
            db = get_db()
            await db.tasks.insert_one({
                "title":       node.get("title", ""),
                "due_date":    node.get("due_date"),
                "assigned_to": node.get("assigned_to"),
                "tenant_id":   context.get("tenant_id"),
                "context":     context,
                "created_at":  datetime.now(timezone.utc),
            })

        case "webhook":
            import httpx
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(node.get("url", ""), json=context)

        case "send_notification":
            from datetime import datetime, timezone
            from app.core.database import get_db
            db = get_db()
            await db.notifications.insert_one({
                "title":      node.get("title", ""),
                "body":       node.get("body", ""),
                "user_id":    node.get("user_id") or context.get("assigned_to"),
                "tenant_id":  context.get("tenant_id"),
                "read":       False,
                "created_at": datetime.now(timezone.utc),
            })

    context[f"node_{node.get('id', 'done')}"] = "completed"
    return context
