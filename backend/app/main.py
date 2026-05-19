"""NexusCRM — FastAPI application, fully Vercel serverless compatible."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.core.config import settings
from app.core.database import connect_db, disconnect_db
from app.core.redis import connect_redis, disconnect_redis
from app.middleware.timing import TimingMiddleware
from app.api.v1 import (
    auth, leads, deals, contacts, accounts,
    campaigns, tickets, workflows, analytics,
    reports, users, notifications, webhooks,
    hr, files, tasks, cron, stream,
)

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)

# ─── Lifespan ─────────────────────────────────────────────────
# On Vercel, each function invocation may be a cold start.
# Motor and redis.asyncio handle reconnection gracefully, so this is safe.
@asynccontextmanager
async def lifespan(_app: FastAPI):
    await connect_db()
    await connect_redis()
    yield
    await disconnect_db()
    await disconnect_redis()


app = FastAPI(
    title="NexusCRM API",
    description="Enterprise CRM SaaS — REST + SSE",
    version=settings.APP_VERSION,
    docs_url="/api/docs"         if settings.DEBUG else None,
    redoc_url="/api/redoc"       if settings.DEBUG else None,
    openapi_url="/api/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan,
)

# ─── Middleware ────────────────────────────────────────────────
app.add_middleware(TimingMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=512)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)

# ─── Routers ──────────────────────────────────────────────────
PREFIX = "/api/v1"

app.include_router(auth.router,          prefix=PREFIX, tags=["Auth"])
app.include_router(leads.router,         prefix=PREFIX, tags=["Leads"])
app.include_router(deals.router,         prefix=PREFIX, tags=["Deals"])
app.include_router(contacts.router,      prefix=PREFIX, tags=["Contacts"])
app.include_router(accounts.router,      prefix=PREFIX, tags=["Accounts"])
app.include_router(campaigns.router,     prefix=PREFIX, tags=["Campaigns"])
app.include_router(tickets.router,       prefix=PREFIX, tags=["Tickets"])
app.include_router(workflows.router,     prefix=PREFIX, tags=["Workflows"])
app.include_router(analytics.router,     prefix=PREFIX, tags=["Analytics"])
app.include_router(reports.router,       prefix=PREFIX, tags=["Reports"])
app.include_router(users.router,         prefix=PREFIX, tags=["Users"])
app.include_router(notifications.router, prefix=PREFIX, tags=["Notifications"])
app.include_router(webhooks.router,      prefix=PREFIX, tags=["Webhooks"])
app.include_router(hr.router,            prefix=PREFIX, tags=["HR"])
app.include_router(files.router,         prefix=PREFIX, tags=["Files"])
app.include_router(tasks.router,         prefix=PREFIX, tags=["Tasks"])    # QStash webhooks
app.include_router(cron.router,          prefix=PREFIX, tags=["Cron"])     # Vercel Cron
app.include_router(stream.router,        prefix=PREFIX, tags=["Stream"])   # SSE

# Static media only with local storage (not S3)
if settings.STORAGE_BACKEND == "local":
    import os
    from fastapi.staticfiles import StaticFiles
    os.makedirs(settings.MEDIA_ROOT, exist_ok=True)
    app.mount("/media", StaticFiles(directory=settings.MEDIA_ROOT), name="media")


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}
