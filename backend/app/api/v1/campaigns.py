"""Campaigns router — email/SMS/push, A/B testing (optimized)."""

import asyncio
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from bson import ObjectId

from app.core.database import get_db
from app.core.security import require_permission
from app.core.redis import cache_set, cache_get, cache_delete_pattern, make_cache_key
from app.models.schemas import CampaignCreate, CampaignResponse, PaginatedResponse
from app.services.audit import log_audit

router = APIRouter(prefix="/campaigns")

_LIST_TTL = 60
_STATS_TTL = 120


def _s(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc


@router.get("", response_model=PaginatedResponse)
async def list_campaigns(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    type: Optional[str] = None,
    user: dict = Depends(require_permission("campaigns.read")),
):
    tid = user["tenant_id"]
    cache_key = make_cache_key("campaigns", tid, page, page_size, status, type)
    cached = await cache_get(cache_key)
    if cached:
        return cached

    db = get_db()
    q: dict = {"tenant_id": tid}
    if status: q["status"] = status
    if type:   q["type"] = type

    skip = (page - 1) * page_size
    total, items_raw = await asyncio.gather(
        db.campaigns.count_documents(q),
        db.campaigns.find(q).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size),
    )
    items = [_s(d) for d in items_raw]
    result = PaginatedResponse(
        items=items, total=total, page=page,
        page_size=page_size, pages=-(-total // page_size),
    ).model_dump()
    await cache_set(cache_key, result, ttl=_LIST_TTL)
    return result


@router.post("", response_model=CampaignResponse, status_code=201)
async def create_campaign(
    payload: CampaignCreate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_permission("campaigns.create")),
):
    db = get_db()
    now = datetime.now(timezone.utc)
    doc = {
        **payload.model_dump(),
        "tenant_id": user["tenant_id"],
        "status": "draft",
        "sent_count": 0,
        "open_rate": 0.0,
        "click_rate": 0.0,
        "created_by": str(user["_id"]),
        "created_at": now,
        "updated_at": now,
    }
    r = await db.campaigns.insert_one(doc)
    doc["_id"] = str(r.inserted_id)
    background_tasks.add_task(
        log_audit, tenant_id=user["tenant_id"], user_id=str(user["_id"]),
        action="campaign.created", resource="campaigns", resource_id=doc["_id"],
    )
    background_tasks.add_task(cache_delete_pattern, f"campaigns:{user['tenant_id']}:*")
    return CampaignResponse(**doc)


@router.post("/{cid}/launch")
async def launch_campaign(
    cid: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_permission("campaigns.update")),
):
    db = get_db()
    campaign = await db.campaigns.find_one(
        {"_id": ObjectId(cid), "tenant_id": user["tenant_id"]},
        {"status": 1},  # projection — only need status check
    )
    if not campaign:
        raise HTTPException(404, "Campaign not found")
    if campaign.get("status") not in ("draft", "scheduled"):
        raise HTTPException(400, f"Cannot launch a campaign in '{campaign['status']}' status")

    await db.campaigns.update_one(
        {"_id": ObjectId(cid)},
        {"$set": {"status": "running", "launched_at": datetime.now(timezone.utc)}},
    )
    from app.core.background import enqueue
    await enqueue("send_campaign", {"campaign_id": cid, "tenant_id": user["tenant_id"]})
    background_tasks.add_task(cache_delete_pattern, f"campaigns:{user['tenant_id']}:*")
    return {"message": "Campaign launched", "campaign_id": cid}


@router.get("/{cid}/stats")
async def campaign_stats(cid: str, user: dict = Depends(require_permission("campaigns.read"))):
    cache_key = f"campaign:stats:{cid}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    db = get_db()
    doc = await db.campaigns.find_one(
        {"_id": ObjectId(cid), "tenant_id": user["tenant_id"]},
        {"sent_count": 1, "open_rate": 1, "click_rate": 1,
         "unsubscribe_rate": 1, "conversions": 1, "revenue_attributed": 1},
    )
    if not doc:
        raise HTTPException(404, "Campaign not found")

    result = {
        "sent_count":         doc.get("sent_count", 0),
        "open_rate":          doc.get("open_rate", 0.0),
        "click_rate":         doc.get("click_rate", 0.0),
        "unsubscribe_rate":   doc.get("unsubscribe_rate", 0.0),
        "conversions":        doc.get("conversions", 0),
        "revenue_attributed": doc.get("revenue_attributed", 0.0),
    }
    await cache_set(cache_key, result, ttl=_STATS_TTL)
    return result
