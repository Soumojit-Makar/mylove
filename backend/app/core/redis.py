"""Redis client — caching, pub/sub, rate limiting, sessions (optimized)."""

import json
import hashlib
from typing import Any, Optional
import redis.asyncio as aioredis
from app.core.config import settings

_redis: aioredis.Redis | None = None


async def connect_redis():
    global _redis
    _redis = aioredis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
        max_connections=50,
        socket_timeout=5,
        socket_connect_timeout=5,
        retry_on_timeout=True,
        health_check_interval=30,
    )
    await _redis.ping()
    print("✅ Redis connected")


async def disconnect_redis():
    global _redis
    if _redis:
        await _redis.aclose()


def get_redis() -> aioredis.Redis:
    if _redis is None:
        raise RuntimeError("Redis not connected")
    return _redis


# ─── Cache helpers ────────────────────────────────────────────

async def cache_set(key: str, value: Any, ttl: int = 300) -> None:
    r = get_redis()
    await r.setex(key, ttl, json.dumps(value, default=str))


async def cache_get(key: str) -> Optional[Any]:
    r = get_redis()
    data = await r.get(key)
    return json.loads(data) if data else None


async def cache_delete(key: str) -> None:
    r = get_redis()
    await r.delete(key)


async def cache_delete_pattern(pattern: str) -> None:
    """Use SCAN instead of KEYS to avoid blocking Redis on large keyspaces."""
    r = get_redis()
    cursor = 0
    keys_to_delete: list[str] = []
    while True:
        cursor, keys = await r.scan(cursor=cursor, match=pattern, count=100)
        keys_to_delete.extend(keys)
        if cursor == 0:
            break
    if keys_to_delete:
        # Delete in batches of 500 to avoid huge DEL commands
        for i in range(0, len(keys_to_delete), 500):
            await r.delete(*keys_to_delete[i : i + 500])


async def cache_mget(keys: list[str]) -> list[Optional[Any]]:
    """Batch get multiple cache keys in one round-trip."""
    if not keys:
        return []
    r = get_redis()
    values = await r.mget(*keys)
    return [json.loads(v) if v else None for v in values]


async def cache_mset(mapping: dict[str, Any], ttl: int = 300) -> None:
    """Batch set multiple cache keys using a pipeline."""
    if not mapping:
        return
    r = get_redis()
    pipe = r.pipeline(transaction=False)
    for key, value in mapping.items():
        pipe.setex(key, ttl, json.dumps(value, default=str))
    await pipe.execute()


def make_cache_key(*parts: Any) -> str:
    """Build a deterministic cache key, hashing long/complex parts."""
    raw = ":".join(str(p) for p in parts)
    if len(raw) > 200:
        raw = hashlib.md5(raw.encode()).hexdigest()
    return raw


# ─── Pub/Sub ──────────────────────────────────────────────────

async def publish_event(channel: str, event: dict) -> None:
    r = get_redis()
    await r.publish(channel, json.dumps(event, default=str))


async def get_pubsub() -> aioredis.client.PubSub:
    r = get_redis()
    return r.pubsub()


# ─── Rate limiting ────────────────────────────────────────────

async def check_rate_limit(key: str, limit: int, window: int = 60) -> bool:
    """Atomic sliding-window rate limiter using a Lua script."""
    r = get_redis()
    lua_script = """
    local current = redis.call('INCR', KEYS[1])
    if current == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
    end
    return current
    """
    current = await r.eval(lua_script, 1, key, window)
    return int(current) <= limit
