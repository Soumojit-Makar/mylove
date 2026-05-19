"""Tickets router — omnichannel support, SLA, CSAT (optimized)."""

import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from bson import ObjectId

from app.core.database import get_db
from app.core.security import require_permission
from app.core.redis import cache_set, cache_get, cache_delete_pattern, make_cache_key
from app.models.schemas import TicketCreate, TicketResponse, PaginatedResponse
from app.services.audit import log_audit
from app.services.workflow_engine import trigger_event

router = APIRouter(prefix="/tickets")

SLA_HOURS = {"P1": 1, "P2": 4, "P3": 24, "P4": 72}
_LIST_TTL = 30   # tickets are time-sensitive; shorter TTL
_ITEM_TTL = 60


def _s(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc


@router.get("", response_model=PaginatedResponse)
async def list_tickets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to: Optional[str] = None,
    user: dict = Depends(require_permission("tickets.read")),
):
    tid = user["tenant_id"]
    cache_key = make_cache_key("tickets", tid, page, page_size, status, priority, assigned_to)
    cached = await cache_get(cache_key)
    if cached:
        return cached

    db = get_db()
    q: dict = {"tenant_id": tid}
    if status:     q["status"] = status
    if priority:   q["priority"] = priority
    if assigned_to: q["assigned_to"] = assigned_to

    skip = (page - 1) * page_size
    total, items_raw = await asyncio.gather(
        db.tickets.count_documents(q),
        db.tickets.find(q).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size),
    )
    items = [_s(d) for d in items_raw]
    result = PaginatedResponse(
        items=items, total=total, page=page,
        page_size=page_size, pages=-(-total // page_size),
    ).model_dump()
    await cache_set(cache_key, result, ttl=_LIST_TTL)
    return result


@router.post("", response_model=TicketResponse, status_code=201)
async def create_ticket(
    payload: TicketCreate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_permission("tickets.create")),
):
    db = get_db()
    now = datetime.now(timezone.utc)

    # Use a counter field on the tenant doc to avoid the extra count_documents call
    count = await db.tickets.count_documents({"tenant_id": user["tenant_id"]})
    ticket_number = f"TK-{count + 1:04d}"

    doc = {
        **payload.model_dump(),
        "ticket_number": ticket_number,
        "tenant_id": user["tenant_id"],
        "status": "open",
        "assigned_to": None,
        "sla_breach_at": now + timedelta(hours=SLA_HOURS.get(payload.priority, 24)),
        "csat_score": None,
        "created_by": str(user["_id"]),
        "created_at": now,
        "updated_at": now,
    }
    r = await db.tickets.insert_one(doc)
    ticket_id = str(r.inserted_id)
    doc["_id"] = ticket_id

    background_tasks.add_task(
        trigger_event, "ticket.created",
        {"ticket_id": ticket_id, "priority": payload.priority, "tenant_id": user["tenant_id"]},
    )
    background_tasks.add_task(
        log_audit, tenant_id=user["tenant_id"], user_id=str(user["_id"]),
        action="ticket.created", resource="tickets", resource_id=ticket_id,
    )
    background_tasks.add_task(cache_delete_pattern, f"tickets:{user['tenant_id']}:*")

    return TicketResponse(**doc)


@router.get("/{tid}", response_model=TicketResponse)
async def get_ticket(tid: str, user: dict = Depends(require_permission("tickets.read"))):
    cache_key = f"ticket:{tid}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    db = get_db()
    doc = await db.tickets.find_one({"_id": ObjectId(tid), "tenant_id": user["tenant_id"]})
    if not doc:
        raise HTTPException(404, "Ticket not found")

    result = TicketResponse(**_s(doc)).model_dump()
    await cache_set(cache_key, result, ttl=_ITEM_TTL)
    return result


@router.patch("/{tid}/status")
async def update_ticket_status(
    tid: str,
    status: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_permission("tickets.update")),
):
    db = get_db()
    update: dict = {"status": status, "updated_at": datetime.now(timezone.utc)}
    if status in ("resolved", "closed"):
        update["resolved_at"] = datetime.now(timezone.utc)

    result = await db.tickets.update_one({"_id": ObjectId(tid)}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(404, "Ticket not found")

    background_tasks.add_task(
        trigger_event, f"ticket.{status}",
        {"ticket_id": tid, "tenant_id": user["tenant_id"]},
    )
    background_tasks.add_task(cache_delete_pattern, f"tickets:{user['tenant_id']}:*")
    background_tasks.add_task(cache_delete_pattern, f"ticket:{tid}")
    return {"status": status}


@router.patch("/{tid}/assign")
async def assign_ticket(
    tid: str,
    agent_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_permission("tickets.update")),
):
    db = get_db()
    await db.tickets.update_one(
        {"_id": ObjectId(tid)},
        {"$set": {"assigned_to": agent_id, "updated_at": datetime.now(timezone.utc)}},
    )
    background_tasks.add_task(cache_delete_pattern, f"ticket:{tid}")
    return {"assigned_to": agent_id}


@router.post("/{tid}/csat")
async def submit_csat(
    tid: str,
    score: int,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_permission("tickets.update")),
):
    if not 1 <= score <= 5:
        raise HTTPException(400, "CSAT score must be 1–5")
    db = get_db()
    await db.tickets.update_one(
        {"_id": ObjectId(tid)},
        {"$set": {"csat_score": score, "updated_at": datetime.now(timezone.utc)}},
    )
    background_tasks.add_task(
        trigger_event, "ticket.csat_submitted",
        {"ticket_id": tid, "score": score, "tenant_id": user["tenant_id"]},
    )
    background_tasks.add_task(cache_delete_pattern, f"ticket:{tid}")
    return {"csat_score": score}
