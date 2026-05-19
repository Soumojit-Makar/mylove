"""Authentication router — login, register, refresh, logout."""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Request

from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
    get_current_user,
)
from app.core.redis import cache_set, cache_get, cache_delete
from app.models.schemas import LoginRequest, UserCreate, TokenResponse, UserResponse
from app.services.audit import log_audit

router = APIRouter(prefix="/auth")

_REFRESH_TTL = 60 * 60 * 24 * 7  # 7 days


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(payload: UserCreate):
    db = get_db()
    if await db.users.find_one({"email": payload.email}, {"_id": 1}):
        raise HTTPException(400, "Email already registered")

    tenant_id = payload.tenant_id or str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    doc = {
        "name":          payload.name,
        "email":         payload.email,
        "password_hash": hash_password(payload.password),
        "role":          payload.role,
        "tenant_id":     tenant_id,
        "is_active":     True,
        "created_at":    now,
        "updated_at":    now,
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return UserResponse(**doc)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, request: Request):
    db = get_db()
    user = await db.users.find_one(
        {"email": payload.email, "is_active": True},
        # Include only fields needed here + exclude large/unused fields
        {"password_hash": 1, "role": 1, "tenant_id": 1, "email": 1},
    )
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")

    user_id = str(user["_id"])
    token_data = {
        "sub":       user_id,
        "tenant_id": user["tenant_id"],
        "role":      user["role"],
        "email":     user["email"],
    }
    access_token  = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    await cache_set(f"refresh:{user_id}", refresh_token, ttl=_REFRESH_TTL)

    # request.client is None on Vercel — guard against it
    ip = request.client.host if request.client else "serverless"
    await log_audit(
        tenant_id=user["tenant_id"], user_id=user_id,
        action="user.login", resource="auth", ip=ip,
    )

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(refresh_token: str):
    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(401, "Invalid refresh token")

    stored = await cache_get(f"refresh:{payload['sub']}")
    if stored != refresh_token:
        raise HTTPException(401, "Refresh token revoked or expired")

    token_data = {k: v for k, v in payload.items() if k not in ("exp", "type")}
    new_access  = create_access_token(token_data)
    new_refresh = create_refresh_token(token_data)

    # Rotate — old refresh token is no longer valid
    await cache_set(f"refresh:{payload['sub']}", new_refresh, ttl=_REFRESH_TTL)
    return TokenResponse(access_token=new_access, refresh_token=new_refresh)


@router.post("/logout")
async def logout(user: dict = Depends(get_current_user)):
    await cache_delete(f"refresh:{user['_id']}")
    # Evict user session cache so the next request hits the DB
    await cache_delete(f"user:session:{user['_id']}")
    return {"message": "Logged out"}


@router.get("/me", response_model=UserResponse)
async def me(user: dict = Depends(get_current_user)):
    return UserResponse(**{**user, "_id": str(user["_id"])})
