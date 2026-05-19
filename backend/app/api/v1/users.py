"""Users router — management, profile, RBAC."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from app.core.database import get_db
from app.core.security import require_permission, hash_password
from app.models.schemas import UserCreate, UserResponse, PaginatedResponse

router = APIRouter(prefix="/users")

def _s(doc):
    doc["_id"] = str(doc["_id"])
    doc.pop("password_hash", None)
    return doc

@router.get("", response_model=PaginatedResponse)
async def list_users(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
                     user: dict = Depends(require_permission("users.read"))):
    db = get_db()
    q = {"tenant_id": user["tenant_id"]}
    total = await db.users.count_documents(q)
    skip = (page - 1) * page_size
    items = [_s(d) async for d in db.users.find(q).skip(skip).limit(page_size)]
    return PaginatedResponse(items=items, total=total, page=page,
                             page_size=page_size, pages=-(-total // page_size))

@router.post("", response_model=UserResponse, status_code=201)
async def create_user(payload: UserCreate, user: dict = Depends(require_permission("users.create"))):
    db = get_db()
    if await db.users.find_one({"email": payload.email}):
        raise HTTPException(409, "Email already in use")
    now = datetime.now(timezone.utc)
    doc = {"name": payload.name, "email": payload.email,
           "password_hash": hash_password(payload.password),
           "role": payload.role, "tenant_id": user["tenant_id"],
           "is_active": True, "created_at": now, "updated_at": now}
    r = await db.users.insert_one(doc)
    doc["_id"] = str(r.inserted_id)
    doc.pop("password_hash")
    return UserResponse(**doc)

@router.get("/{uid}", response_model=UserResponse)
async def get_user(uid: str, user: dict = Depends(require_permission("users.read"))):
    db = get_db()
    doc = await db.users.find_one({"_id": ObjectId(uid), "tenant_id": user["tenant_id"]})
    if not doc:
        raise HTTPException(404, "User not found")
    return UserResponse(**_s(doc))

@router.patch("/{uid}/role")
async def update_role(uid: str, role: str, user: dict = Depends(require_permission("users.update"))):
    db = get_db()
    await db.users.update_one({"_id": ObjectId(uid), "tenant_id": user["tenant_id"]},
                              {"$set": {"role": role, "updated_at": datetime.now(timezone.utc)}})
    return {"role": role}

@router.patch("/{uid}/deactivate")
async def deactivate_user(uid: str, user: dict = Depends(require_permission("users.update"))):
    db = get_db()
    await db.users.update_one({"_id": ObjectId(uid), "tenant_id": user["tenant_id"]},
                              {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}})
    return {"message": "User deactivated"}
