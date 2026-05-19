"""HR router — staff directory, KPIs, onboarding, territories."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from app.core.database import get_db
from app.core.security import require_permission

router = APIRouter(prefix="/hr")

def _s(doc):
    doc["_id"] = str(doc["_id"])
    return doc

@router.get("/staff")
async def list_staff(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
                     department: str = None, user: dict = Depends(require_permission("hr.read"))):
    db = get_db()
    q: dict = {"tenant_id": user["tenant_id"]}
    if department:
        q["department"] = department
    total = await db.staff.count_documents(q)
    skip = (page - 1) * page_size
    items = [_s(d) async for d in db.staff.find(q).skip(skip).limit(page_size)]
    return {"items": items, "total": total}

@router.post("/staff")
async def create_staff(payload: dict, user: dict = Depends(require_permission("hr.create"))):
    db = get_db()
    now = datetime.now(timezone.utc)
    doc = {**payload, "tenant_id": user["tenant_id"], "created_at": now, "updated_at": now}
    r = await db.staff.insert_one(doc)
    from app.services.workflow_engine import trigger_event
    await trigger_event("hr.new_hire", {"staff_id": str(r.inserted_id), "tenant_id": user["tenant_id"]})
    return {"id": str(r.inserted_id)}

@router.get("/kpis")
async def team_kpis(user: dict = Depends(require_permission("hr.read"))):
    db = get_db()
    pipeline = [
        {"$match": {"tenant_id": user["tenant_id"], "stage": "won"}},
        {"$group": {"_id": "$owner_id", "deals": {"$sum": 1}, "revenue": {"$sum": "$value"}}},
        {"$sort": {"revenue": -1}}, {"$limit": 20},
    ]
    data = await db.deals.aggregate(pipeline).to_list(None)
    return {"kpis": data}

@router.get("/onboarding")
async def onboarding_list(user: dict = Depends(require_permission("hr.read"))):
    db = get_db()
    items = [_s(d) async for d in db.onboarding.find({"tenant_id": user["tenant_id"]})]
    return {"items": items}

@router.post("/onboarding/{staff_id}/complete-step")
async def complete_onboarding_step(staff_id: str, step_id: str,
                                   user: dict = Depends(require_permission("hr.update"))):
    db = get_db()
    await db.onboarding.update_one(
        {"staff_id": staff_id, "tenant_id": user["tenant_id"]},
        {"$set": {f"steps.{step_id}.completed": True,
                  f"steps.{step_id}.completed_at": datetime.now(timezone.utc)}}
    )
    return {"step_id": step_id, "completed": True}

@router.get("/territories")
async def list_territories(user: dict = Depends(require_permission("hr.read"))):
    db = get_db()
    items = [_s(d) async for d in db.territories.find({"tenant_id": user["tenant_id"]})]
    return {"items": items}

@router.post("/territories")
async def create_territory(payload: dict, user: dict = Depends(require_permission("hr.create"))):
    db = get_db()
    doc = {**payload, "tenant_id": user["tenant_id"], "created_at": datetime.now(timezone.utc)}
    r = await db.territories.insert_one(doc)
    return {"id": str(r.inserted_id)}
