"""
Server-Sent Events (SSE) router — real-time push to the frontend.

Replaces WebSockets, which are not supported on Vercel serverless functions.

SSE is a unidirectional HTTP/1.1 streaming response — the server pushes
newline-delimited `data: <json>\n\n` frames to the browser. The browser
uses the native EventSource API (or our useEventSource hook) to receive them.

Vercel supports SSE through streaming responses with:
  - maxDuration set to 30 s (our function limit)
  - The client reconnects automatically via EventSource

Redis pub/sub drives delivery: workflow_engine.trigger_event publishes
to `events:{tenant_id}`; this endpoint subscribes and forwards each
message to the connected client.
"""

import asyncio
import json
import logging
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from app.core.security import get_current_user
from app.core.redis import get_pubsub

router = APIRouter(prefix="/stream")
logger = logging.getLogger("nexuscrm.sse")


@router.get("/{tenant_id}")
async def event_stream(
    tenant_id: str,
    request: Request,
    user: dict = Depends(get_current_user),
):
    if user["tenant_id"] != tenant_id:
        from fastapi import HTTPException
        raise HTTPException(403, "Forbidden")

    pubsub = await get_pubsub()
    channel = f"events:{tenant_id}"
    await pubsub.subscribe(channel)

    async def generator():
        # Initial heartbeat so the browser knows the connection is live
        yield "data: {\"event\":\"connected\"}\n\n"

        try:
            while True:
                if await request.is_disconnected():
                    break

                # Poll for new messages with a short timeout so we can check
                # for client disconnect without blocking indefinitely.
                message = await asyncio.wait_for(
                    pubsub.get_message(ignore_subscribe_messages=True),
                    timeout=15,
                )
                if message and message.get("type") == "message":
                    data = json.dumps(json.loads(message["data"]))
                    yield f"data: {data}\n\n"
                else:
                    # Heartbeat every ~15 s to keep the connection alive
                    # through proxies and CDN edge nodes.
                    yield ": heartbeat\n\n"

        except asyncio.TimeoutError:
            yield ": heartbeat\n\n"
        except Exception as exc:
            logger.error("SSE stream error: %s", exc)
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.aclose()

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":     "no-cache",
            "X-Accel-Buffering": "no",   # disable nginx buffering
            "Connection":        "keep-alive",
        },
    )
