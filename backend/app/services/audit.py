"""Audit logging service."""
from datetime import datetime, timezone
from typing import Optional, Any
from app.core.database import get_db


async def log_audit(
    tenant_id: str,
    user_id: str,
    action: str,
    resource: str,
    resource_id: Optional[str] = None,
    changes: Optional[dict] = None,
    ip: Optional[str] = None,
    metadata: Optional[dict] = None,
):
    db = get_db()
    doc = {
        "tenant_id": tenant_id,
        "user_id": user_id,
        "action": action,
        "resource": resource,
        "resource_id": resource_id,
        "changes": changes,
        "ip": ip,
        "metadata": metadata or {},
        "created_at": datetime.now(timezone.utc),
    }
    await db.audit_logs.insert_one(doc)


async def get_audit_trail(
    tenant_id: str,
    resource: Optional[str] = None,
    resource_id: Optional[str] = None,
    limit: int = 50,
):
    db = get_db()
    q: dict = {"tenant_id": tenant_id}
    if resource:
        q["resource"] = resource
    if resource_id:
        q["resource_id"] = resource_id
    cursor = db.audit_logs.find(q).sort("created_at", -1).limit(limit)
    return [{**d, "_id": str(d["_id"])} async for d in cursor]
