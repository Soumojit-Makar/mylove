"""Leads router — CRUD, AI scoring, assignment, import, dedup (Vercel-compatible)."""

from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, BackgroundTasks
from bson import ObjectId

from app.core.database import get_db
from app.core.security import require_permission
from app.core.redis import cache_set, cache_get, cache_delete_pattern, make_cache_key
from app.core.background import enqueue
from app.models.schemas import LeadCreate, LeadUpdate, LeadResponse, PaginatedResponse
from app.services.audit import log_audit
from app.services.workflow_engine import trigger_event

router = APIRouter(prefix="/leads")

_LEAD_LIST_TTL = 60
_LEAD_ITEM_TTL = 120


def _serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    if doc.get("assigned_to"):
        doc["assigned_to"] = str(doc["assigned_to"])
    return doc


@router.get("", response_model=PaginatedResponse)
async def list_leads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    score_min: Optional[int] = None,
    score_max: Optional[int] = None,
    source: Optional[str] = None,
    assigned_to: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(require_permission("leads.read")),
):
    tid = user["tenant_id"]
    if not search:
        cache_key = make_cache_key("leads", tid, page, page_size, status, score_min, score_max, source, assigned_to)
        cached = await cache_get(cache_key)
        if cached:
            return cached

    db = get_db()
    query: dict = {"tenant_id": tid}
    if status:
        query["status"] = status
    if score_min is not None or score_max is not None:
        query["score"] = {}
        if score_min is not None: query["score"]["$gte"] = score_min
        if score_max is not None: query["score"]["$lte"] = score_max
    if source:
        query["source"] = source
    if assigned_to:
        query["assigned_to"] = assigned_to
    if search:
        query["$text"] = {"$search": search}

    import asyncio
    skip = (page - 1) * page_size
    total, items_raw = await asyncio.gather(
        db.leads.count_documents(query),
        db.leads.find(query).sort("score", -1).skip(skip).limit(page_size).to_list(page_size),
    )
    items = [_serialize(doc) for doc in items_raw]
    result = PaginatedResponse(
        items=items, total=total, page=page,
        page_size=page_size, pages=-(-total // page_size),
    ).model_dump()

    if not search:
        await cache_set(cache_key, result, ttl=_LEAD_LIST_TTL)
    return result


@router.post("", response_model=LeadResponse, status_code=201)
async def create_lead(
    payload: LeadCreate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_permission("leads.create")),
):
    db = get_db()
    existing = await db.leads.find_one(
        {"tenant_id": user["tenant_id"], "contact.email": payload.contact.email},
        {"_id": 1},
    )
    if existing:
        raise HTTPException(409, "Lead with this email already exists")

    now = datetime.now(timezone.utc)
    doc = {
        **payload.model_dump(),
        "tenant_id":  user["tenant_id"],
        "status":     "new",
        "score":      0,
        "assigned_to": None,
        "created_by": user["_id"],
        "created_at": now,
        "updated_at": now,
    }
    result = await db.leads.insert_one(doc)
    lead_id = str(result.inserted_id)

    background_tasks.add_task(enqueue, "score_lead", {"lead_id": lead_id, "tenant_id": user["tenant_id"]})
    background_tasks.add_task(
        log_audit, tenant_id=user["tenant_id"], user_id=user["_id"],
        action="lead.created", resource="leads", resource_id=lead_id,
    )
    background_tasks.add_task(
        trigger_event, "lead.created",
        {"lead_id": lead_id, "tenant_id": user["tenant_id"]},
    )
    background_tasks.add_task(cache_delete_pattern, f"leads:{user['tenant_id']}:*")

    doc["_id"] = lead_id
    return LeadResponse(**doc)


@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: str, user: dict = Depends(require_permission("leads.read"))):
    cache_key = f"lead:{lead_id}"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    db = get_db()
    doc = await db.leads.find_one({"_id": ObjectId(lead_id), "tenant_id": user["tenant_id"]})
    if not doc:
        raise HTTPException(404, "Lead not found")
    result = LeadResponse(**_serialize(doc)).model_dump()
    await cache_set(cache_key, result, ttl=_LEAD_ITEM_TTL)
    return result


@router.patch("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: str,
    payload: LeadUpdate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_permission("leads.update")),
):
    db = get_db()
    update_data = payload.model_dump(exclude_none=True)
    update_data["updated_at"] = datetime.now(timezone.utc)
    result = await db.leads.find_one_and_update(
        {"_id": ObjectId(lead_id), "tenant_id": user["tenant_id"]},
        {"$set": update_data},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Lead not found")
    background_tasks.add_task(
        log_audit, tenant_id=user["tenant_id"], user_id=user["_id"],
        action="lead.updated", resource="leads", resource_id=lead_id, changes=update_data,
    )
    background_tasks.add_task(cache_delete_pattern, f"leads:{user['tenant_id']}:*")
    background_tasks.add_task(cache_delete_pattern, f"lead:{lead_id}")
    return LeadResponse(**_serialize(result))


@router.delete("/{lead_id}", status_code=204)
async def delete_lead(
    lead_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_permission("leads.delete")),
):
    db = get_db()
    r = await db.leads.delete_one({"_id": ObjectId(lead_id), "tenant_id": user["tenant_id"]})
    if r.deleted_count == 0:
        raise HTTPException(404, "Lead not found")
    background_tasks.add_task(
        log_audit, tenant_id=user["tenant_id"], user_id=user["_id"],
        action="lead.deleted", resource="leads", resource_id=lead_id,
    )
    background_tasks.add_task(cache_delete_pattern, f"leads:{user['tenant_id']}:*")
    background_tasks.add_task(cache_delete_pattern, f"lead:{lead_id}")


@router.post("/{lead_id}/score")
async def rescore_lead(
    lead_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_permission("leads.update")),
):
    background_tasks.add_task(enqueue, "score_lead", {"lead_id": lead_id, "tenant_id": user["tenant_id"]})
    return {"message": "Scoring queued", "lead_id": lead_id}


@router.post("/import", status_code=202)
async def import_leads_csv(
    file: UploadFile = File(...),
    user: dict = Depends(require_permission("leads.create")),
):
    content = await file.read()
    await enqueue("import_leads_csv", {
        "csv_content": content.decode(),
        "tenant_id":   user["tenant_id"],
        "user_id":     user["_id"],
    })
    return {"message": "Import queued", "filename": file.filename}


@router.post("/merge")
async def merge_leads(
    primary_id: str,
    duplicate_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_permission("leads.update")),
):
    import asyncio
    db = get_db()
    primary, duplicate = await asyncio.gather(
        db.leads.find_one({"_id": ObjectId(primary_id), "tenant_id": user["tenant_id"]}),
        db.leads.find_one({"_id": ObjectId(duplicate_id), "tenant_id": user["tenant_id"]}),
    )
    if not primary or not duplicate:
        raise HTTPException(404, "Lead(s) not found")
    merged_tags = list(set(primary.get("tags", []) + duplicate.get("tags", [])))
    await db.leads.update_one(
        {"_id": ObjectId(primary_id)},
        {"$set": {"tags": merged_tags, "updated_at": datetime.now(timezone.utc)}},
    )
    await db.leads.delete_one({"_id": ObjectId(duplicate_id)})
    background_tasks.add_task(cache_delete_pattern, f"leads:{user['tenant_id']}:*")
    return {"message": "Leads merged", "primary_id": primary_id}
