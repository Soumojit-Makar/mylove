"""Async MongoDB connection via Motor — optimized with connection pooling & typed helpers."""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING, TEXT
from app.core.config import settings

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_db():
    global _client, _db
    _client = AsyncIOMotorClient(
        settings.MONGO_URI,
        maxPoolSize=50,
        minPoolSize=5,
        maxIdleTimeMS=30_000,
        serverSelectionTimeoutMS=5_000,
        connectTimeoutMS=10_000,
        socketTimeoutMS=30_000,
        compressors=["zlib"],
    )
    _db = _client[settings.MONGO_DB]
    await _create_indexes()
    print(f"✅ MongoDB connected: {settings.MONGO_DB}")


async def disconnect_db():
    global _client
    if _client:
        _client.close()
        print("MongoDB disconnected")


def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("Database not connected")
    return _db


async def _create_indexes():
    db = get_db()

    # ── Leads ──────────────────────────────────────────────────
    await db.leads.create_index([("tenant_id", ASCENDING), ("status", ASCENDING), ("score", DESCENDING)])
    await db.leads.create_index([("tenant_id", ASCENDING), ("score", DESCENDING)])
    await db.leads.create_index([("tenant_id", ASCENDING), ("assigned_to", ASCENDING)])
    await db.leads.create_index([("tenant_id", ASCENDING), ("source", ASCENDING)])
    await db.leads.create_index([("tenant_id", ASCENDING), ("created_at", DESCENDING)])
    await db.leads.create_index([("contact.email", ASCENDING)])
    # Text search index for leads
    await db.leads.create_index(
        [("contact.name", TEXT), ("contact.email", TEXT), ("contact.company", TEXT)],
        name="leads_text_search",
    )

    # ── Deals ──────────────────────────────────────────────────
    await db.deals.create_index([("tenant_id", ASCENDING), ("stage", ASCENDING), ("value", DESCENDING)])
    await db.deals.create_index([("tenant_id", ASCENDING), ("owner_id", ASCENDING)])
    await db.deals.create_index([("tenant_id", ASCENDING), ("updated_at", DESCENDING)])
    await db.deals.create_index([("tenant_id", ASCENDING), ("forecast_category", ASCENDING)])

    # ── Contacts ───────────────────────────────────────────────
    await db.contacts.create_index([("tenant_id", ASCENDING), ("email", ASCENDING)], unique=True)
    await db.contacts.create_index([("tenant_id", ASCENDING), ("account_id", ASCENDING)])

    # ── Tickets ────────────────────────────────────────────────
    await db.tickets.create_index([("tenant_id", ASCENDING), ("status", ASCENDING), ("priority", ASCENDING)])
    await db.tickets.create_index([("sla_breach_at", ASCENDING), ("status", ASCENDING)])
    await db.tickets.create_index([("tenant_id", ASCENDING), ("assigned_to", ASCENDING)])

    # ── Campaigns ──────────────────────────────────────────────
    await db.campaigns.create_index([("tenant_id", ASCENDING), ("status", ASCENDING)])
    await db.campaigns.create_index([("tenant_id", ASCENDING), ("scheduled_at", ASCENDING)])

    # ── Workflows ──────────────────────────────────────────────
    await db.workflows.create_index([("tenant_id", ASCENDING), ("status", ASCENDING)])

    # ── Audit logs ─────────────────────────────────────────────
    await db.audit_logs.create_index([("tenant_id", ASCENDING), ("created_at", DESCENDING)])
    await db.audit_logs.create_index([("tenant_id", ASCENDING), ("resource", ASCENDING), ("created_at", DESCENDING)])

    # ── Users ──────────────────────────────────────────────────
    await db.users.create_index([("email", ASCENDING)], unique=True)
    await db.users.create_index([("tenant_id", ASCENDING), ("role", ASCENDING)])

    # ── Notifications ──────────────────────────────────────────
    await db.notifications.create_index([("user_id", ASCENDING), ("read", ASCENDING), ("created_at", DESCENDING)])

    # ── Accounts ───────────────────────────────────────────────
    await db.accounts.create_index([("tenant_id", ASCENDING), ("plan", ASCENDING)])
    await db.accounts.create_index([("tenant_id", ASCENDING), ("churn_score", DESCENDING)])

    print("✅ MongoDB indexes ensured")
