"""Notification service — create and push notifications."""
from datetime import datetime, timezone
from typing import Optional
from app.core.database import get_db
from app.core.redis import publish_event


async def create_notification(
    tenant_id: str,
    user_id: str,
    title: str,
    message: str,
    type: str = "info",
    action_url: Optional[str] = None,
):
    db = get_db()
    now = datetime.now(timezone.utc)
    doc = {
        "tenant_id": tenant_id, "user_id": user_id,
        "title": title, "message": message,
        "type": type, "action_url": action_url,
        "read": False, "created_at": now,
    }
    result = await db.notifications.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    # Push via SSE (Server-Sent Events — Vercel-compatible)
    await publish_event(f"events:{tenant_id}", {
        "type": "notification.new",
        "data": doc,
        "fired_at": now.isoformat(),
    })
    return doc
