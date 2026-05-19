"""Security — JWT tokens, password hashing, RBAC (Vercel-compatible)."""

from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import settings
from app.core.redis import cache_get, cache_set

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer = HTTPBearer()

# ─── Password ─────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ─── JWT ──────────────────────────────────────────────────────

def create_access_token(data: dict) -> str:
    payload = {**data, "exp": datetime.now(timezone.utc) + timedelta(
        minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES), "type": "access"}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: dict) -> str:
    payload = {**data, "exp": datetime.now(timezone.utc) + timedelta(
        days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS), "type": "refresh"}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ─── Current user (with Redis session cache) ──────────────────

_USER_CACHE_TTL = 120  # seconds


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> dict:
    payload = decode_token(credentials.credentials)
    user_id = payload.get("sub")

    cache_key = f"user:session:{user_id}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    from app.core.database import get_db
    from bson import ObjectId
    db = get_db()
    user = await db.users.find_one(
        {"_id": ObjectId(user_id), "is_active": True},
        {"password_hash": 0},
    )
    if not user:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    user["_id"] = str(user["_id"])
    await cache_set(cache_key, user, ttl=_USER_CACHE_TTL)
    return user


# ─── RBAC ─────────────────────────────────────────────────────

ROLE_PERMISSIONS: dict[str, list[str]] = {
    "super_admin":   ["*"],
    "admin":         ["leads.*", "deals.*", "contacts.*", "accounts.*", "campaigns.*",
                      "tickets.*", "analytics.*", "reports.*", "users.*", "hr.*", "workflows.*"],
    "sales_manager": ["leads.*", "deals.*", "contacts.*", "accounts.*", "analytics.read",
                      "reports.read", "workflows.read"],
    "sales_rep":     ["leads.read", "leads.create", "leads.update",
                      "deals.read", "deals.create", "deals.update",
                      "contacts.read", "contacts.create", "contacts.update"],
    "marketing":     ["campaigns.*", "leads.read", "analytics.read", "reports.read"],
    "support_agent": ["tickets.*", "contacts.read", "accounts.read"],
    "hr_manager":    ["hr.*", "users.read", "reports.read"],
    "read_only":     ["leads.read", "deals.read", "contacts.read", "analytics.read"],
}

_PERMISSION_SETS: dict[str, set[str]] = {
    role: set(perms) for role, perms in ROLE_PERMISSIONS.items()
}


def has_permission(user: dict, permission: str) -> bool:
    role = user.get("role", "read_only")
    perms = _PERMISSION_SETS.get(role, set())
    if "*" in perms:
        return True
    module = permission.split(".", 1)[0]
    return permission in perms or f"{module}.*" in perms


def require_permission(permission: str):
    async def checker(user: dict = Depends(get_current_user)):
        if not has_permission(user, permission):
            raise HTTPException(status_code=403, detail=f"Permission denied: {permission}")
        return user
    return checker
