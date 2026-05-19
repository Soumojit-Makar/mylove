"""
Notifications router — REST endpoints only.

Real-time delivery is handled by the SSE stream at /api/v1/stream/{tenant_id}.
The WebSocket server that was here has been removed — Vercel serverless
functions don't support persistent WebSocket connections.
"""

import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from bson import ObjectId

from app.core.database import get_db
from app.core.security import require_permission

router = APIRouter(prefix="/notifications")


@router.get("")
async def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    unread_only: bool = False,
    user: dict = Depends(require_permission("*")),
):
    db = get_db()
    q: dict = {"tenant_id": user["tenant_id"], "user_id": str(user["_id"])}
    if unread_only:
        q["read"] = False

    skip = (page - 1) * page_size
    unread_q = {**q, "read": False}

    total, unread, items_raw = await asyncio.gather(
        db.notifications.count_documents(q),
        db.notifications.count_documents(unread_q),
        db.notifications.find(q).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size),
    )
    items = [{**d, "_id": str(d["_id"])} for d in items_raw]
    return {"items": items, "total": total, "unread": unread,
            "page": page, "page_size": page_size}


@router.patch("/{nid}/read")
async def mark_read(nid: str, user: dict = Depends(require_permission("*"))):
    db = get_db()
    await db.notifications.update_one(
        {"_id": ObjectId(nid), "user_id": str(user["_id"])},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc)}},
    )
    return {"read": True}


@router.patch("/read-all")
async def mark_all_read(user: dict = Depends(require_permission("*"))):
    db = get_db()
    result = await db.notifications.update_many(
        {"tenant_id": user["tenant_id"], "user_id": str(user["_id"]), "read": False},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc)}},
    )
    return {"updated": result.modified_count}
