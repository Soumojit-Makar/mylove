"""Notification tasks — create inbox notifications and push to WebSocket."""
import asyncio
from app.core.celery_app import celery_app


def run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="app.tasks.notification_tasks.send_notification")
def send_notification(user_id: str, tenant_id: str, title: str, body: str,
                       notif_type: str = "info", link: str = None):
    async def _run():
        from app.core.database import connect_db, get_db
        from app.core.redis import publish_event
        from datetime import datetime, timezone
        await connect_db()
        db = get_db()
        now = datetime.now(timezone.utc)
        doc = {
            "user_id": user_id, "tenant_id": tenant_id,
            "title": title, "body": body,
            "type": notif_type, "link": link,
            "read": False, "created_at": now,
        }
        r = await db.notifications.insert_one(doc)
        doc["_id"] = str(r.inserted_id)
        # Push via WebSocket
        await publish_event(f"tenant:{tenant_id}:events", {
            "type": "notification",
            "notification": {**doc, "created_at": now.isoformat()},
        })
    run_async(_run())


@celery_app.task(name="app.tasks.notification_tasks.broadcast_to_tenant")
def broadcast_to_tenant(tenant_id: str, event: str, data: dict):
    async def _run():
        from app.core.database import connect_db, get_db
        from app.core.redis import publish_event
        await connect_db()
        await publish_event(f"tenant:{tenant_id}:events", {
            "type": "broadcast", "event": event, "data": data,
        })
    run_async(_run())
