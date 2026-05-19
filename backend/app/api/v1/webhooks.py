"""Webhooks router — inbound/outbound webhook management."""
import hmac, hashlib, json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from app.core.database import get_db
from app.core.security import require_permission
from app.core.config import settings

router = APIRouter(prefix="/webhooks")

def _s(doc):
    doc["_id"] = str(doc["_id"])
    return doc

@router.post("/inbound/{source}")
async def inbound_webhook(source: str, request: Request):
    """Receive webhooks from external systems (Stripe, Twilio, etc.)."""
    body = await request.body()
    payload = json.loads(body)
    db = get_db()
    await db.webhook_logs.insert_one({
        "source": source, "payload": payload,
        "headers": dict(request.headers),
        "received_at": datetime.now(timezone.utc),
    })
    # Route to appropriate handler
    if source == "stripe":
        from app.services.integrations import handle_stripe_event
        await handle_stripe_event(payload)
    elif source == "twilio":
        from app.services.integrations import handle_twilio_event
        await handle_twilio_event(payload)
    return {"received": True}

@router.get("/outbound")
async def list_webhooks(user: dict = Depends(require_permission("*"))):
    db = get_db()
    items = [_s(d) async for d in db.outbound_webhooks.find({"tenant_id": user["tenant_id"]})]
    return {"items": items}

@router.post("/outbound")
async def create_webhook(url: str, events: list, secret: str = "",
                         user: dict = Depends(require_permission("admin"))):
    db = get_db()
    doc = {"url": url, "events": events, "secret": secret,
           "tenant_id": user["tenant_id"], "is_active": True,
           "created_at": datetime.now(timezone.utc)}
    r = await db.outbound_webhooks.insert_one(doc)
    return {"id": str(r.inserted_id)}

@router.delete("/outbound/{wid}")
async def delete_webhook(wid: str, user: dict = Depends(require_permission("admin"))):
    from bson import ObjectId
    db = get_db()
    await db.outbound_webhooks.delete_one({"_id": ObjectId(wid), "tenant_id": user["tenant_id"]})
    return {"deleted": True}
