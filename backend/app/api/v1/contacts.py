"""Contacts router."""
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from app.core.database import get_db
from app.core.security import require_permission
from app.models.schemas import ContactCreate, ContactResponse, PaginatedResponse
from app.services.audit import log_audit

router = APIRouter(prefix="/contacts")

def _s(doc):
    doc["_id"] = str(doc["_id"])
    return doc

@router.get("", response_model=PaginatedResponse)
async def list_contacts(
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None, user: dict = Depends(require_permission("contacts.read")),
):
    db = get_db()
    q: dict = {"tenant_id": user["tenant_id"]}
    if search:
        q["$or"] = [{"name": {"$regex": search, "$options": "i"}},
                    {"email": {"$regex": search, "$options": "i"}}]
    total = await db.contacts.count_documents(q)
    skip = (page - 1) * page_size
    items = [_s(d) async for d in db.contacts.find(q).skip(skip).limit(page_size)]
    return PaginatedResponse(items=items, total=total, page=page,
                             page_size=page_size, pages=-(-total // page_size))

@router.post("", response_model=ContactResponse, status_code=201)
async def create_contact(payload: ContactCreate, user: dict = Depends(require_permission("contacts.create"))):
    db = get_db()
    existing = await db.contacts.find_one({"email": payload.email, "tenant_id": user["tenant_id"]})
    if existing:
        raise HTTPException(409, "Contact with this email already exists")
    now = datetime.now(timezone.utc)
    doc = {**payload.model_dump(), "tenant_id": user["tenant_id"], "created_at": now, "updated_at": now}
    r = await db.contacts.insert_one(doc)
    doc["_id"] = str(r.inserted_id)
    await log_audit(tenant_id=user["tenant_id"], user_id=str(user["_id"]),
                    action="contact.created", resource="contacts", resource_id=doc["_id"])
    return ContactResponse(**doc)

@router.get("/{cid}", response_model=ContactResponse)
async def get_contact(cid: str, user: dict = Depends(require_permission("contacts.read"))):
    db = get_db()
    doc = await db.contacts.find_one({"_id": ObjectId(cid), "tenant_id": user["tenant_id"]})
    if not doc:
        raise HTTPException(404, "Contact not found")
    return ContactResponse(**_s(doc))

@router.delete("/{cid}", status_code=204)
async def delete_contact(cid: str, user: dict = Depends(require_permission("contacts.delete"))):
    db = get_db()
    r = await db.contacts.delete_one({"_id": ObjectId(cid), "tenant_id": user["tenant_id"]})
    if r.deleted_count == 0:
        raise HTTPException(404, "Contact not found")
