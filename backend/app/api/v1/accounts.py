"""Accounts router — customer accounts, health scoring."""
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from app.core.database import get_db
from app.core.security import require_permission
from app.models.schemas import AccountCreate, AccountResponse, PaginatedResponse
from app.services.audit import log_audit

router = APIRouter(prefix="/accounts")

def _s(doc):
    doc["_id"] = str(doc["_id"])
    return doc

@router.get("", response_model=PaginatedResponse)
async def list_accounts(
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    plan: Optional[str] = None, search: Optional[str] = None,
    user: dict = Depends(require_permission("accounts.read")),
):
    db = get_db()
    q: dict = {"tenant_id": user["tenant_id"]}
    if plan:
        q["plan"] = plan
    if search:
        q["name"] = {"$regex": search, "$options": "i"}
    total = await db.accounts.count_documents(q)
    skip = (page - 1) * page_size
    items = [_s(d) async for d in db.accounts.find(q).sort("mrr", -1).skip(skip).limit(page_size)]
    return PaginatedResponse(items=items, total=total, page=page,
                             page_size=page_size, pages=-(-total // page_size))

@router.post("", response_model=AccountResponse, status_code=201)
async def create_account(payload: AccountCreate, user: dict = Depends(require_permission("accounts.create"))):
    db = get_db()
    now = datetime.now(timezone.utc)
    doc = {**payload.model_dump(), "tenant_id": user["tenant_id"],
           "health_score": 50, "nps": None, "created_at": now, "updated_at": now}
    r = await db.accounts.insert_one(doc)
    doc["_id"] = str(r.inserted_id)
    return AccountResponse(**doc)

@router.get("/{aid}", response_model=AccountResponse)
async def get_account(aid: str, user: dict = Depends(require_permission("accounts.read"))):
    db = get_db()
    doc = await db.accounts.find_one({"_id": ObjectId(aid), "tenant_id": user["tenant_id"]})
    if not doc:
        raise HTTPException(404, "Account not found")
    return AccountResponse(**_s(doc))

@router.patch("/{aid}/health-score")
async def update_health_score(aid: str, score: int, user: dict = Depends(require_permission("accounts.update"))):
    db = get_db()
    await db.accounts.update_one(
        {"_id": ObjectId(aid), "tenant_id": user["tenant_id"]},
        {"$set": {"health_score": score, "updated_at": datetime.now(timezone.utc)}}
    )
    from app.services.workflow_engine import trigger_event
    if score < 30:
        await trigger_event("account.churn_risk", {"account_id": aid, "score": score, "tenant_id": user["tenant_id"]})
    return {"health_score": score}
