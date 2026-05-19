"""Workflow Engine router — DAG-based automation (Vercel-compatible)."""

import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId

from app.core.database import get_db
from app.core.security import require_permission
from app.core.background import enqueue
from app.models.schemas import WorkflowCreate, WorkflowResponse, PaginatedResponse

router = APIRouter(prefix="/workflows")


def _s(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc


@router.get("", response_model=PaginatedResponse)
async def list_workflows(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str = None,
    user: dict = Depends(require_permission("workflows.read")),
):
    db = get_db()
    q: dict = {"tenant_id": user["tenant_id"]}
    if status:
        q["status"] = status
    skip = (page - 1) * page_size
    total, items_raw = await asyncio.gather(
        db.workflows.count_documents(q),
        db.workflows.find(q).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size),
    )
    items = [_s(d) for d in items_raw]
    return PaginatedResponse(items=items, total=total, page=page,
                             page_size=page_size, pages=-(-total // page_size))


@router.post("", response_model=WorkflowResponse, status_code=201)
async def create_workflow(
    payload: WorkflowCreate,
    user: dict = Depends(require_permission("workflows.create")),
):
    db = get_db()
    now = datetime.now(timezone.utc)
    doc = {
        **payload.model_dump(),
        "tenant_id":  user["tenant_id"],
        "status":     "draft",
        "stats":      {"runs": 0, "success": 0, "failures": 0, "avg_ms": 0},
        "created_by": str(user["_id"]),
        "created_at": now,
        "updated_at": now,
    }
    r = await db.workflows.insert_one(doc)
    doc["_id"] = str(r.inserted_id)
    return WorkflowResponse(**doc)


@router.patch("/{wid}/status")
async def set_workflow_status(
    wid: str,
    status: str,
    user: dict = Depends(require_permission("workflows.update")),
):
    if status not in ("active", "paused", "draft"):
        raise HTTPException(400, "Invalid status — must be active, paused, or draft")
    db = get_db()
    result = await db.workflows.update_one(
        {"_id": ObjectId(wid), "tenant_id": user["tenant_id"]},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Workflow not found")
    return {"status": status}


@router.post("/{wid}/run")
async def manual_trigger(
    wid: str,
    payload: dict = {},
    user: dict = Depends(require_permission("workflows.update")),
):
    """Manually trigger a workflow — dispatched via QStash instead of Celery."""
    await enqueue("process_workflow_event", {
        "event_type": "manual_trigger",
        "event_data": {
            "workflow_id": wid,
            "tenant_id":   user["tenant_id"],
            "triggered_by": str(user["_id"]),
            **payload,
        },
    })
    return {"message": "Workflow triggered", "workflow_id": wid}


@router.get("/{wid}/runs")
async def workflow_runs(
    wid: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: dict = Depends(require_permission("workflows.read")),
):
    db = get_db()
    q = {"workflow_id": wid, "tenant_id": user["tenant_id"]}
    skip = (page - 1) * page_size
    total, items_raw = await asyncio.gather(
        db.workflow_runs.count_documents(q),
        db.workflow_runs.find(q).sort("started_at", -1).skip(skip).limit(page_size).to_list(page_size),
    )
    items = [_s(d) for d in items_raw]
    return PaginatedResponse(items=items, total=total, page=page,
                             page_size=page_size, pages=-(-total // page_size))
