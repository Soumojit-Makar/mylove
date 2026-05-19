"""Deals / Opportunities router — pipeline, stage transitions, forecasting (optimized)."""

import asyncio
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from bson import ObjectId

from app.core.database import get_db
from app.core.security import require_permission
from app.core.redis import cache_set, cache_get, cache_delete_pattern, make_cache_key
from app.models.schemas import DealCreate, DealUpdate, DealResponse, PaginatedResponse
from app.services.audit import log_audit
from app.services.workflow_engine import trigger_event

router = APIRouter(prefix="/deals")

_LIST_TTL = 60
_ITEM_TTL = 120
_FORECAST_TTL = 300


def _s(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    for f in ("contact_id", "account_id", "owner_id"):
        if doc.get(f):
            doc[f] = str(doc[f])
    return doc


@router.get("", response_model=PaginatedResponse)
async def list_deals(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    stage: Optional[str] = None,
    owner_id: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(require_permission("deals.read")),
):
    tid = user["tenant_id"]

    if not search:
        cache_key = make_cache_key("deals", tid, page, page_size, stage, owner_id)
        cached = await cache_get(cache_key)
        if cached:
            return cached

    db = get_db()
    query: dict = {"tenant_id": tid}
    if stage:
        query["stage"] = stage
    if owner_id:
        query["owner_id"] = owner_id
    if search:
        query["$text"] = {"$search": search}

    skip = (page - 1) * page_size
    total, items_raw = await asyncio.gather(
        db.deals.count_documents(query),
        db.deals.find(query).sort("value", -1).skip(skip).limit(page_size).to_list(page_size),
    )
    items = [_s(doc) for doc in items_raw]
    result = PaginatedResponse(
        items=items, total=total, page=page,
        page_size=page_size, pages=-(-total // page_size),
    ).model_dump()

    if not search:
        await cache_set(cache_key, result, ttl=_LIST_TTL)
    return result


@router.post("", response_model=DealResponse, status_code=201)
async def create_deal(
    payload: DealCreate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_permission("deals.create")),
):
    db = get_db()
    now = datetime.now(timezone.utc)
    doc = {
        **payload.model_dump(),
        "tenant_id": user["tenant_id"],
        "owner_id": str(user["_id"]),
        "ai_forecast": None,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.deals.insert_one(doc)
    deal_id = str(result.inserted_id)
    doc["_id"] = deal_id

    background_tasks.add_task(
        log_audit, tenant_id=user["tenant_id"], user_id=str(user["_id"]),
        action="deal.created", resource="deals", resource_id=deal_id,
    )
    background_tasks.add_task(
        trigger_event, "deal.created",
        {"deal_id": deal_id, "tenant_id": user["tenant_id"],
         "stage": payload.stage, "value": payload.value},
    )
    background_tasks.add_task(cache_delete_pattern, f"deals:{user['tenant_id']}:*")

    return DealResponse(**_s(doc))


@router.get("/forecast")
async def get_forecast(
    period: int = Query(90, description="Days ahead"),
    user: dict = Depends(require_permission("deals.read")),
):
    cache_key = make_cache_key("deals:forecast", user["tenant_id"], period)
    cached = await cache_get(cache_key)
    if cached:
        return cached

    db = get_db()
    pipeline = [
        {"$match": {"tenant_id": user["tenant_id"], "stage": {"$nin": ["won", "lost"]}}},
        {"$group": {
            "_id": "$forecast_category",
            "total": {"$sum": "$value"},
            "weighted": {"$sum": {"$multiply": ["$value", {"$divide": ["$probability", 100]}]}},
            "count": {"$sum": 1},
        }},
    ]
    result_data = await db.deals.aggregate(pipeline).to_list(None)
    result = {"period_days": period, "categories": result_data}
    await cache_set(cache_key, result, ttl=_FORECAST_TTL)
    return result


@router.get("/pipeline-summary")
async def pipeline_summary(user: dict = Depends(require_permission("deals.read"))):
    cache_key = f"deals:pipeline:{user['tenant_id']}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    db = get_db()
    pipeline = [
        {"$match": {"tenant_id": user["tenant_id"]}},
        {"$group": {"_id": "$stage", "count": {"$sum": 1}, "value": {"$sum": "$value"}}},
    ]
    stages = await db.deals.aggregate(pipeline).to_list(None)
    result = {"stages": stages}
    await cache_set(cache_key, result, ttl=_LIST_TTL)
    return result


@router.get("/{deal_id}", response_model=DealResponse)
async def get_deal(deal_id: str, user: dict = Depends(require_permission("deals.read"))):
    cache_key = f"deal:{deal_id}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    db = get_db()
    doc = await db.deals.find_one({"_id": ObjectId(deal_id), "tenant_id": user["tenant_id"]})
    if not doc:
        raise HTTPException(404, "Deal not found")

    result = DealResponse(**_s(doc)).model_dump()
    await cache_set(cache_key, result, ttl=_ITEM_TTL)
    return result


@router.patch("/{deal_id}", response_model=DealResponse)
async def update_deal(
    deal_id: str,
    payload: DealUpdate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_permission("deals.update")),
):
    db = get_db()
    # Fetch old doc for stage-change comparison; use projection to avoid fetching all fields
    old = await db.deals.find_one(
        {"_id": ObjectId(deal_id), "tenant_id": user["tenant_id"]},
        {"stage": 1, "value": 1},
    )
    if not old:
        raise HTTPException(404, "Deal not found")

    update_data = payload.model_dump(exclude_none=True)
    update_data["updated_at"] = datetime.now(timezone.utc)

    doc = await db.deals.find_one_and_update(
        {"_id": ObjectId(deal_id)},
        {"$set": update_data},
        return_document=True,
    )

    old_stage = old.get("stage")
    new_stage = payload.stage
    if new_stage and new_stage != old_stage:
        background_tasks.add_task(
            trigger_event, "deal.stage_changed",
            {"deal_id": deal_id, "tenant_id": user["tenant_id"],
             "from_stage": old_stage, "to_stage": new_stage, "value": doc.get("value")},
        )
        if new_stage == "won":
            background_tasks.add_task(
                trigger_event, "deal.won",
                {"deal_id": deal_id, "tenant_id": user["tenant_id"], "value": doc.get("value")},
            )
        elif new_stage == "lost":
            background_tasks.add_task(
                trigger_event, "deal.lost",
                {"deal_id": deal_id, "tenant_id": user["tenant_id"],
                 "lost_reason": payload.lost_reason},
            )

    background_tasks.add_task(
        log_audit, tenant_id=user["tenant_id"], user_id=str(user["_id"]),
        action="deal.updated", resource="deals", resource_id=deal_id, changes=update_data,
    )
    background_tasks.add_task(cache_delete_pattern, f"deals:{user['tenant_id']}:*")
    background_tasks.add_task(cache_delete_pattern, f"deal:{deal_id}")

    return DealResponse(**_s(doc))


@router.delete("/{deal_id}", status_code=204)
async def delete_deal(
    deal_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_permission("deals.delete")),
):
    db = get_db()
    r = await db.deals.delete_one({"_id": ObjectId(deal_id), "tenant_id": user["tenant_id"]})
    if r.deleted_count == 0:
        raise HTTPException(404, "Deal not found")
    background_tasks.add_task(cache_delete_pattern, f"deals:{user['tenant_id']}:*")
    background_tasks.add_task(cache_delete_pattern, f"deal:{deal_id}")
