"""
Background task queue — Vercel-compatible replacement for Celery.

On Vercel, functions are ephemeral and there are no persistent worker
processes, so we cannot use Celery. Instead we use two mechanisms:

1. **Vercel Cron Jobs** (vercel.json `crons`) — for scheduled tasks
   (nightly rescore, hourly reports, SLA checks, churn updates).

2. **QStash** (Upstash) — for reliable async task dispatch.
   QStash is an HTTP-based message queue. We POST a JSON payload to a
   QStash endpoint; QStash delivers it to a Vercel API route, retrying
   on failure with exponential backoff. No broker process required.

   Free tier: 500 messages/day. Paid plans start at $1/month.
   Docs: https://upstash.com/docs/qstash/overall/getstarted

   Set QSTASH_TOKEN in Vercel env vars to enable.
   If QSTASH_TOKEN is unset, tasks run inline (synchronous fallback for
   local dev / testing).
"""

import json
import logging
from typing import Any
import httpx
from app.core.config import settings

logger = logging.getLogger("nexuscrm.background")

_QSTASH_BASE = "https://qstash.upstash.io/v2/publish"


async def enqueue(task_name: str, payload: dict[str, Any]) -> None:
    """
    Dispatch a background task via QStash.

    task_name maps to a POST handler at /api/v1/tasks/{task_name}.
    If QSTASH_TOKEN is not set, the task runs inline (dev fallback).
    """
    if not settings.QSTASH_TOKEN:
        # Dev fallback — run synchronously
        logger.info("QStash not configured — running task inline: %s", task_name)
        await _run_inline(task_name, payload)
        return

    target_url = f"{settings.APP_URL}/api/v1/tasks/{task_name}"
    headers = {
        "Authorization": f"Bearer {settings.QSTASH_TOKEN}",
        "Content-Type": "application/json",
        # Retry up to 3 times with exponential backoff
        "Upstash-Retries": "3",
        "Upstash-Retry-After": "60",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"{_QSTASH_BASE}/{target_url}",
            headers=headers,
            content=json.dumps(payload),
        )
        if resp.status_code not in (200, 201, 202):
            logger.error("QStash enqueue failed %d: %s", resp.status_code, resp.text)


async def _run_inline(task_name: str, payload: dict[str, Any]) -> None:
    """Inline fallback — runs the task handler function directly."""
    from app.api.v1 import tasks as task_handlers
    handler = getattr(task_handlers, task_name, None)
    if handler:
        await handler(payload)
    else:
        logger.warning("No inline handler found for task: %s", task_name)
