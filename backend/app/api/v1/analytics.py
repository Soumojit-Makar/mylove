"""Analytics router — dashboards, funnels, cohorts, attribution (optimized)."""

import asyncio
from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.core.database import get_db
from app.core.security import require_permission
from app.core.redis import cache_set, cache_get, make_cache_key

router = APIRouter(prefix="/analytics")

_OVERVIEW_TTL = 300      # 5 min
_FUNNEL_TTL = 300
_REVENUE_TTL = 600       # 10 min
_STATIC_TTL = 3600       # 1 hr for slow-changing data


@router.get("/overview")
async def overview(user: dict = Depends(require_permission("analytics.read"))):
    tid = user["tenant_id"]
    cache_key = f"analytics:overview:{tid}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    db = get_db()

    # Run all 5 aggregations concurrently instead of sequentially
    results = await asyncio.gather(
        db.leads.count_documents({"tenant_id": tid}),
        db.deals.count_documents({"tenant_id": tid, "stage": "won"}),
        db.deals.count_documents({"tenant_id": tid, "stage": "lost"}),
        db.tickets.count_documents({"tenant_id": tid, "status": "open"}),
        db.deals.aggregate([
            {"$match": {"tenant_id": tid, "stage": "won"}},
            {"$group": {"_id": None, "total": {"$sum": "$value"}}},
        ]).to_list(1),
    )

    leads_total, deals_won, deals_lost, open_tickets, revenue_result = results
    total_revenue = revenue_result[0]["total"] if revenue_result else 0

    result = {
        "leads_total": leads_total,
        "deals_won": deals_won,
        "deals_lost": deals_lost,
        "win_rate": round(deals_won / (deals_won + deals_lost) * 100, 1) if (deals_won + deals_lost) else 0,
        "open_tickets": open_tickets,
        "total_revenue": total_revenue,
    }
    await cache_set(cache_key, result, ttl=_OVERVIEW_TTL)
    return result


@router.get("/funnel")
async def conversion_funnel(user: dict = Depends(require_permission("analytics.read"))):
    tid = user["tenant_id"]
    cache_key = f"analytics:funnel:{tid}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    db = get_db()

    # Single aggregation per collection instead of N sequential count_documents
    lead_pipeline = [
        {"$match": {"tenant_id": tid, "status": {"$in": ["new", "mql", "sql"]}}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    deal_pipeline = [
        {"$match": {"tenant_id": tid, "stage": {"$in": ["prospect", "qualify", "demo", "proposal", "negotiate", "won"]}}},
        {"$group": {"_id": "$stage", "count": {"$sum": 1}}},
    ]

    lead_data, deal_data = await asyncio.gather(
        db.leads.aggregate(lead_pipeline).to_list(None),
        db.deals.aggregate(deal_pipeline).to_list(None),
    )

    lead_map = {d["_id"]: d["count"] for d in lead_data}
    deal_map = {d["_id"]: d["count"] for d in deal_data}

    funnel = [
        {"stage": s, "count": lead_map.get(s, 0)} for s in ["new", "mql", "sql"]
    ] + [
        {"stage": s, "count": deal_map.get(s, 0)}
        for s in ["prospect", "qualify", "demo", "proposal", "negotiate", "won"]
    ]

    result = {"funnel": funnel}
    await cache_set(cache_key, result, ttl=_FUNNEL_TTL)
    return result


@router.get("/revenue")
async def revenue_trend(
    period: int = Query(30, description="Days"),
    user: dict = Depends(require_permission("analytics.read")),
):
    tid = user["tenant_id"]
    cache_key = make_cache_key("analytics:revenue", tid, period)
    cached = await cache_get(cache_key)
    if cached:
        return cached

    from datetime import datetime, timezone, timedelta
    db = get_db()
    since = datetime.now(timezone.utc) - timedelta(days=period)
    pipeline = [
        {"$match": {"tenant_id": tid, "stage": "won", "updated_at": {"$gte": since}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$updated_at"}},
            "revenue": {"$sum": "$value"}, "count": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]
    data = await db.deals.aggregate(pipeline).to_list(None)
    result = {"period_days": period, "data": data}
    await cache_set(cache_key, result, ttl=_REVENUE_TTL)
    return result


@router.get("/cohorts")
async def cohort_retention(user: dict = Depends(require_permission("analytics.read"))):
    # Stable mock data — cached for an hour
    cache_key = f"analytics:cohorts:{user['tenant_id']}"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    cohorts = [
        {"cohort": "Jan 2025", "months": [100, 82, 74, 68, 62, 58, 54]},
        {"cohort": "Feb 2025", "months": [100, 85, 76, 70, 65, 61]},
        {"cohort": "Mar 2025", "months": [100, 88, 79, 72, 66]},
        {"cohort": "Apr 2025", "months": [100, 84, 75, 69]},
        {"cohort": "May 2025", "months": [100, 86, 77]},
    ]
    result = {"cohorts": cohorts}
    await cache_set(cache_key, result, ttl=_STATIC_TTL)
    return result


@router.get("/attribution")
async def multi_touch_attribution(user: dict = Depends(require_permission("analytics.read"))):
    tid = user["tenant_id"]
    cache_key = f"analytics:attribution:{tid}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    db = get_db()
    pipeline = [
        {"$match": {"tenant_id": tid}},
        {"$group": {"_id": "$source", "leads": {"$sum": 1},
                    "total_value": {"$sum": {"$ifNull": ["$value", 0]}}}},
        {"$sort": {"leads": -1}},
    ]
    data = await db.leads.aggregate(pipeline).to_list(None)
    result = {"attribution": data}
    await cache_set(cache_key, result, ttl=_REVENUE_TTL)
    return result


@router.get("/lead-scores")
async def lead_score_distribution(user: dict = Depends(require_permission("analytics.read"))):
    tid = user["tenant_id"]
    cache_key = f"analytics:lead_scores:{tid}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    db = get_db()
    pipeline = [
        {"$match": {"tenant_id": tid}},
        {"$bucket": {
            "groupBy": "$score",
            "boundaries": [0, 20, 40, 60, 80, 101],
            "default": "unknown",
            "output": {"count": {"$sum": 1}},
        }},
    ]
    data = await db.leads.aggregate(pipeline).to_list(None)
    result = {"distribution": data}
    await cache_set(cache_key, result, ttl=_FUNNEL_TTL)
    return result


@router.get("/team-performance")
async def team_performance(user: dict = Depends(require_permission("analytics.read"))):
    tid = user["tenant_id"]
    cache_key = f"analytics:team_perf:{tid}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    db = get_db()
    pipeline = [
        {"$match": {"tenant_id": tid, "stage": "won"}},
        {"$group": {
            "_id": "$owner_id",
            "deals_won": {"$sum": 1},
            "total_value": {"$sum": "$value"},
            "avg_deal": {"$avg": "$value"},
        }},
        {"$sort": {"total_value": -1}},
        {"$limit": 10},
    ]
    data = await db.deals.aggregate(pipeline).to_list(None)
    result = {"team_performance": data}
    await cache_set(cache_key, result, ttl=_OVERVIEW_TTL)
    return result
