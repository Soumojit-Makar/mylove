"""AI scoring service — lead scoring, churn prediction, forecasting."""
import json
from typing import Optional
from app.core.config import settings


async def score_lead(lead: dict) -> tuple[int, dict]:
    """
    Score a lead 0-100 using OpenAI.
    Returns (score, factors_dict).
    Falls back to rule-based if no API key.
    """
    if not settings.OPENAI_API_KEY:
        return _rule_based_score(lead)

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        prompt = f"""You are a CRM lead scoring AI. Score this lead from 0 to 100 based on conversion likelihood.

Lead data:
- Name: {lead.get('contact', {}).get('name')}
- Company: {lead.get('contact', {}).get('company')}
- Title: {lead.get('contact', {}).get('title')}
- Source: {lead.get('source')}
- Estimated value: {lead.get('value')}
- Tags: {lead.get('tags', [])}
- Notes: {lead.get('notes', '')}

Respond ONLY with valid JSON like:
{{"score": 75, "factors": {{"job_seniority": 20, "company_fit": 15, "source_quality": 15, "intent_signals": 15, "value_potential": 10}},"reasoning": "Brief reason"}}"""

        resp = await client.chat.completions.create(
            model=settings.AI_LEAD_SCORING_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=200,
        )
        data = json.loads(resp.choices[0].message.content)
        return int(data.get("score", 50)), data.get("factors", {})

    except Exception as e:
        print(f"AI scoring failed: {e}, falling back to rule-based")
        return _rule_based_score(lead)


def _rule_based_score(lead: dict) -> tuple[int, dict]:
    """Deterministic rule-based fallback scorer."""
    score = 0
    factors = {}

    # Source quality
    source_scores = {
        "referral": 25, "demo_request": 25, "webinar": 20,
        "organic_search": 15, "linkedin_ad": 12, "cold_email": 5,
        "ad_click": 5, "manual": 8,
    }
    source = (lead.get("source") or "manual").lower().replace(" ", "_")
    src_score = source_scores.get(source, 10)
    score += src_score
    factors["source_quality"] = src_score

    # Value potential
    value = lead.get("value") or 0
    if value > 100000: v_score = 25
    elif value > 50000: v_score = 20
    elif value > 20000: v_score = 15
    elif value > 5000: v_score = 10
    else: v_score = 5
    score += v_score
    factors["value_potential"] = v_score

    # Job title / seniority
    title = (lead.get("contact", {}).get("title") or "").lower()
    if any(t in title for t in ["ceo", "cto", "coo", "president", "founder"]): t_score = 25
    elif any(t in title for t in ["vp", "director", "head"]): t_score = 20
    elif any(t in title for t in ["manager", "lead", "principal"]): t_score = 15
    else: t_score = 5
    score += t_score
    factors["job_seniority"] = t_score

    # Company info
    company = lead.get("contact", {}).get("company") or ""
    c_score = 15 if company else 0
    score += c_score
    factors["company_fit"] = c_score

    # Tags / intent
    tags = lead.get("tags", [])
    intent_tags = {"pricing", "demo", "trial", "enterprise", "urgent"}
    i_score = min(10 * len(set(tags) & intent_tags), 10)
    score += i_score
    factors["intent_signals"] = i_score

    return min(score, 100), factors


async def predict_churn(account: dict) -> tuple[int, str]:
    """
    Predict churn probability for an account. Returns (score 0-100, reason).
    Higher score = higher churn risk.
    """
    score = 0
    reasons = []

    # Low MRR trend
    if account.get("mrr", 0) < 500:
        score += 20
        reasons.append("Low MRR")

    # No recent activity
    from datetime import datetime, timezone
    last_activity = account.get("last_activity_at")
    if last_activity:
        days_inactive = (datetime.now(timezone.utc) - last_activity).days
        if days_inactive > 60:
            score += 30
            reasons.append(f"No activity for {days_inactive} days")
        elif days_inactive > 30:
            score += 15

    # Support tickets
    open_p1 = account.get("open_p1_tickets", 0)
    if open_p1 > 0:
        score += 20 * open_p1
        reasons.append(f"{open_p1} unresolved P1 tickets")

    # Low NPS
    nps = account.get("nps")
    if nps is not None and nps < 6:
        score += 25
        reasons.append(f"Low NPS score ({nps})")

    return min(score, 100), "; ".join(reasons) or "No risk factors detected"


async def ai_forecast_deal(deal: dict) -> dict:
    """Forecast deal close probability and expected value."""
    stage_weights = {
        "prospect": 0.05, "qualify": 0.15, "demo": 0.30,
        "proposal": 0.50, "negotiate": 0.75, "won": 1.0, "lost": 0.0,
    }
    stage = deal.get("stage", "prospect")
    base_prob = stage_weights.get(stage, 0.1)
    stated_prob = deal.get("probability", 10) / 100
    blended = (base_prob + stated_prob) / 2
    expected_value = deal.get("value", 0) * blended

    return {
        "probability": round(blended * 100, 1),
        "expected_value": round(expected_value, 2),
        "confidence": "high" if blended > 0.6 else "medium" if blended > 0.3 else "low",
        "model": "rule_based_v1",
    }
