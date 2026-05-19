#!/usr/bin/env python3
"""
NexusCRM — Full dummy data seed script.

Creates a realistic dataset for one demo tenant covering every collection:
  users · accounts · contacts · leads · deals · tickets
  campaigns · workflows · notifications · staff · territories
  onboarding · audit_logs · scheduled_reports · workflow_runs

Usage:
    python scripts/seed.py                   # default tenant, 100x scale
    python scripts/seed.py --drop            # drop collections first (clean slate)
    python scripts/seed.py --count 500       # larger dataset (500x scale)
    python scripts/seed.py --tenant acme-01  # custom tenant id

Requires MONGO_URI to be set in .env or the environment.
"""

import asyncio
import argparse
import random
import sys
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Allow running from repo root or scripts/ directory
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from passlib.context import CryptContext
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/nexuscrm")
MONGO_DB  = os.getenv("MONGO_DB",  "nexuscrm")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ─── Helpers ──────────────────────────────────────────────────

def now() -> datetime:
    return datetime.now(timezone.utc)

def ago(**kw) -> datetime:
    return now() - timedelta(**kw)

def soon(**kw) -> datetime:
    return now() + timedelta(**kw)

def oid() -> ObjectId:
    return ObjectId()

def pick(lst):
    return random.choice(lst)

def picks(lst, k=None):
    k = k or random.randint(1, min(3, len(lst)))
    return random.sample(lst, min(k, len(lst)))

def frac(lo, hi, decimals=2):
    return round(random.uniform(lo, hi), decimals)

def chance(p: float) -> bool:
    return random.random() < p

def rand_phone() -> str:
    return f"+1{random.randint(200,999)}{random.randint(100,999)}{random.randint(1000,9999)}"

def rand_email(name: str, domain: str = "") -> str:
    domain = domain or pick([
        "gmail.com", "outlook.com", "yahoo.com",
        pick(COMPANIES).lower().replace(" ", "").replace(",", "") + ".io",
    ])
    slug = name.lower().replace(" ", ".")
    return f"{slug}+{random.randint(1, 999)}@{domain}"


# ─── Data banks ───────────────────────────────────────────────

FIRST_NAMES = [
    "James","Maria","Alex","Sarah","David","Priya","Jordan","Emma",
    "Michael","Ananya","Tom","Lisa","Marcus","Rachel","Kevin","Nina",
    "Daniel","Sofia","Ryan","Aisha","Ben","Claire","Ethan","Mei",
    "Omar","Isabella","Lucas","Yuki","Andre","Fatima","Chris","Amy",
    "Raj","Elena","Noah","Zara","Liam","Ingrid","Carlos","Diana",
]
LAST_NAMES = [
    "Chen","Patel","Williams","Johnson","Kim","Garcia","Brown","Singh",
    "Taylor","Nguyen","Martinez","Wilson","Anderson","Thomas","Harris",
    "Jackson","White","Lee","Thompson","Robinson","Clark","Lewis","Walker",
    "Hall","Young","Allen","King","Wright","Scott","Adams","Baker",
]
COMPANIES = [
    "TechCorp Inc","Globex Solutions","DataFlow AI","RetailTech Ltd",
    "MegaCorp Industries","StartupXYZ","Quantum Systems","NovaBuild",
    "Apex Analytics","CloudScale","PeakVentures","BrightPath Ltd",
    "CoreLogic","SkyBridge","FusionWorks","Meridian Tech","Pinnacle Co",
    "StellarOps","IronCore","BlueSky Ventures","Nimbus Corp","Synapse AI",
    "Helix Digital","ClearEdge","Vortex Solutions","Orbit Systems",
    "Cascade Labs","Prism Analytics","Atlas Software","Vertex Corp",
]
TITLES = [
    "CEO","CTO","CFO","COO","VP Sales","VP Engineering","VP Marketing",
    "Director of Operations","Head of Product","Engineering Manager",
    "Sales Manager","Marketing Director","Product Manager","CIO","CMO",
    "Business Development Manager","Account Executive","Sales Representative",
    "Customer Success Manager","Solutions Architect","DevOps Lead",
]
INDUSTRIES = [
    "SaaS","FinTech","HealthTech","EdTech","E-commerce","Cybersecurity",
    "AI/ML","Cloud Infrastructure","HR Tech","LegalTech","InsurTech","MarTech",
    "PropTech","AgriTech","CleanTech","BioTech","RetailTech","LogisticsTech",
]
LEAD_SOURCES = [
    "organic_search","linkedin_ad","referral","cold_email","webinar",
    "demo_request","trade_show","partner","direct","content_marketing",
    "google_ad","twitter_ad","podcast","product_hunt","g2_review",
]
TICKET_SUBJECTS = [
    "Cannot log in to dashboard","Billing discrepancy on invoice",
    "API rate limit exceeded","Data export not working","SSO setup assistance",
    "Performance degradation on reports","Email notifications not sending",
    "Webhook failing with 500 error","Integration with Salesforce broken",
    "Feature request: bulk export","User permissions not saving",
    "CSV import fails for large files","Dashboard charts not loading",
    "Password reset email not received","Custom domain setup help",
    "Audit log missing entries","Mobile app crashes on launch",
    "Two-factor authentication not working","Slow load times on analytics page",
    "PDF report generation hangs","Duplicate records appearing in CRM",
]
CAMPAIGN_NAMES = [
    "Q4 Enterprise Push","January Re-engagement","Product Launch v3.0",
    "Churned Customer Winback","Summer Upsell Drive","Onboarding Nurture Sequence",
    "AI Scoring Feature Announcement","Trial-to-Paid Conversion",
    "Year-End Review Invite","Enterprise Tier Upgrade Offer",
]
WORKFLOW_NAMES = [
    "High-Score Lead Assignment","SLA Breach Escalation",
    "New Lead Welcome Sequence","Churn Risk Alert","Deal Won Celebration",
    "Trial Expiry Reminder","Inbound Demo Request Router",
    "Monthly Report Delivery","Onboarding Day-3 Check-in",
    "Re-engagement After 30 Days",
]
TAGS_POOL = [
    "enterprise","smb","high-value","demo-ready","champion","decision-maker",
    "technical","budget-approved","multi-year","upsell-candidate","at-risk",
    "power-user","early-adopter","referral","event-lead","do-not-contact",
]
DEPARTMENTS = ["Sales","Marketing","Engineering","Support","Finance","HR","Product","Operations"]
LOST_REASONS = [
    "Price too high","Chose competitor","No budget","Project cancelled",
    "Timeline mismatch","Feature gap","No decision made","Ghost",
]
UTM_CAMPAIGNS  = ["brand-q4","retargeting-oct","webinar-nov","partner-h2","content-blog"]
UTM_MEDIUMS    = ["cpc","email","social","organic","referral","direct"]
LEAD_NOTES = [
    "Highly interested in enterprise plan — needs procurement approval",
    "Requested demo for next week, technical evaluation underway",
    "Price-sensitive — needs ROI case study and reference customers",
    "Technical buyer — wants API documentation and sandbox access",
    "Procurement and legal involved, expect 6-week sales cycle",
    "Champion confirmed at VP level, budget pre-approved for Q4",
    "Competitive deal — also evaluating HubSpot and Salesforce",
    "Warm referral from existing customer Globex Solutions",
    "Attended webinar, asked detailed questions about integrations",
    "",
]
DEAL_NOTES = [
    "Champion confirmed, steering committee review scheduled",
    "Procurement review ongoing, security questionnaire submitted",
    "POC completed successfully — 3/5 success criteria met",
    "Multi-year deal on table, legal reviewing MSA",
    "Decision expected by end of quarter",
    "Stalled — champion left company, new contact being identified",
    "",
]


# ─── Seeder class ─────────────────────────────────────────────

class Seeder:
    def __init__(self, db, tenant_id: str, count: int):
        self.db        = db
        self.tid       = tenant_id
        self.count     = count
        self.user_ids:     list[ObjectId] = []
        self.account_ids:  list[ObjectId] = []
        self.contact_ids:  list[ObjectId] = []
        self.lead_ids:     list[ObjectId] = []
        self.deal_ids:     list[ObjectId] = []
        self.ticket_ids:   list[ObjectId] = []
        self.campaign_ids: list[ObjectId] = []
        self.workflow_ids: list[ObjectId] = []
        self.staff_ids:    list[ObjectId] = []

    def _name(self) -> str:
        return f"{pick(FIRST_NAMES)} {pick(LAST_NAMES)}"

    # ── 1. Users ──────────────────────────────────────────────

    async def seed_users(self):
        role_definitions = [
            ("Sarah Adams",   "sarah@nexuscrm.io",   "super_admin"),
            ("Mike Reynolds", "mike@nexuscrm.io",    "admin"),
            ("Linda Chen",    "linda@nexuscrm.io",   "sales_manager"),
            ("Jake Torres",   "jake@nexuscrm.io",    "sales_rep"),
            ("Priya Kapoor",  "priya@nexuscrm.io",   "sales_rep"),
            ("Tom Williams",  "tom@nexuscrm.io",     "sales_rep"),
            ("Anna Müller",   "anna@nexuscrm.io",    "marketing"),
            ("Sam Okafor",    "sam@nexuscrm.io",     "support_agent"),
            ("Yuki Tanaka",   "yuki@nexuscrm.io",    "support_agent"),
            ("Carlos Ruiz",   "carlos@nexuscrm.io",  "hr_manager"),
            ("Diana Park",    "diana@nexuscrm.io",   "read_only"),
        ]
        docs = []
        for name, email, role in role_definitions:
            doc = {
                "_id":           oid(),
                "name":          name,
                "email":         email,
                "password_hash": pwd_context.hash("password123"),
                "role":          role,
                "tenant_id":     self.tid,
                "is_active":     True,
                "avatar_url":    None,
                "timezone":      pick(["UTC","America/New_York","Europe/London","Asia/Kolkata","Asia/Tokyo"]),
                "last_login_at": ago(days=random.randint(0, 14)),
                "created_at":    ago(days=random.randint(60, 400)),
                "updated_at":    ago(days=random.randint(0, 30)),
            }
            docs.append(doc)
            self.user_ids.append(doc["_id"])

        await self.db.users.insert_many(docs)
        print(f"  ✅  {len(docs):>4} users")

    # ── 2. Accounts ───────────────────────────────────────────

    async def seed_accounts(self):
        n = max(20, self.count // 5)
        plan_mrr = {
            "starter":    (49,   199),
            "pro":        (200,  999),
            "growth":     (1000, 4999),
            "enterprise": (5000, 50000),
        }
        docs = []
        for _ in range(n):
            company = pick(COMPANIES)
            plan    = pick(list(plan_mrr))
            lo, hi  = plan_mrr[plan]
            mrr     = round(random.uniform(lo, hi), 2)
            health  = random.randint(20, 98)
            created = ago(days=random.randint(30, 730))

            doc = {
                "_id":           oid(),
                "name":          company,
                "domain":        company.lower().replace(" ", "").replace(",", "") + ".io",
                "plan":          plan,
                "mrr":           mrr,
                "arr":           round(mrr * 12, 2),
                "health_score":  health,
                "churn_score":   random.randint(20, 90) if health < 50 else random.randint(0, 35),
                "churn_reason":  pick(["low_usage","support_issues","price_sensitivity",""]),
                "nps":           random.randint(1, 10),
                "industry":      pick(INDUSTRIES),
                "employees":     pick([10, 25, 50, 100, 250, 500, 1000, 5000, 10000]),
                "csm_id":        str(pick(self.user_ids)),
                "tenant_id":     self.tid,
                "tags":          picks(TAGS_POOL, k=random.randint(0, 3)),
                "last_activity_at": ago(days=random.randint(0, 60)),
                "open_p1_tickets":  random.randint(0, 3) if health < 40 else 0,
                "product_usage_score": random.randint(10, 100),
                "created_at":    created,
                "updated_at":    ago(days=random.randint(0, 30)),
            }
            docs.append(doc)
            self.account_ids.append(doc["_id"])

        await self.db.accounts.insert_many(docs)
        print(f"  ✅  {len(docs):>4} accounts")

    # ── 3. Contacts ───────────────────────────────────────────

    async def seed_contacts(self):
        n = max(40, self.count // 2)
        docs = []
        used: set[str] = set()

        for _ in range(n):
            name    = self._name()
            company = pick(COMPANIES)
            email   = rand_email(name, company.lower().replace(" ", "").replace(",", "") + ".com")
            while email in used:
                email = rand_email(name)
            used.add(email)

            account_id = pick(self.account_ids) if chance(0.75) else None
            doc = {
                "_id":         oid(),
                "name":        name,
                "email":       email,
                "phone":       rand_phone() if chance(0.65) else None,
                "company":     company,
                "title":       pick(TITLES),
                "account_id":  str(account_id) if account_id else None,
                "tags":        picks(TAGS_POOL, k=random.randint(0, 2)),
                "linkedin":    f"https://linkedin.com/in/{name.lower().replace(' ','-')}-{random.randint(100,999)}" if chance(0.45) else None,
                "last_contacted_at": ago(days=random.randint(0, 90)) if chance(0.55) else None,
                "opt_out_email": chance(0.05),
                "tenant_id":   self.tid,
                "created_at":  ago(days=random.randint(1, 365)),
                "updated_at":  ago(days=random.randint(0, 30)),
            }
            docs.append(doc)
            self.contact_ids.append(doc["_id"])

        await self.db.contacts.insert_many(docs)
        print(f"  ✅  {len(docs):>4} contacts")

    # ── 4. Leads ──────────────────────────────────────────────

    async def seed_leads(self):
        n = max(80, self.count)
        statuses = ["new","contacted","mql","sql","disqualified"]
        weights  = [0.25, 0.20, 0.25, 0.20, 0.10]
        docs = []
        used: set[str] = set()

        for _ in range(n):
            name   = self._name()
            company = pick(COMPANIES)
            email  = rand_email(name, company.lower().replace(" ", "").replace(",", "") + ".com")
            while email in used:
                email = rand_email(name)
            used.add(email)

            status = random.choices(statuses, weights=weights)[0]
            score  = (
                random.randint(75, 100) if status == "sql"
                else random.randint(40, 74) if status == "mql"
                else random.randint(0, 39)
            )
            source  = pick(LEAD_SOURCES)
            created = ago(days=random.randint(1, 365))

            doc = {
                "_id": oid(),
                "contact": {
                    "name":     name,
                    "email":    email,
                    "phone":    rand_phone() if chance(0.5) else None,
                    "company":  company,
                    "title":    pick(TITLES),
                    "linkedin": f"https://linkedin.com/in/{name.lower().replace(' ','-')}" if chance(0.4) else None,
                },
                "status":       status,
                "score":        score,
                "source":       source,
                "value":        round(random.uniform(1000, 250000), 2) if chance(0.7) else None,
                "assigned_to":  str(pick(self.user_ids[:6])) if chance(0.7) else None,
                "contact_id":   str(pick(self.contact_ids)) if chance(0.35) else None,
                "notes":        pick(LEAD_NOTES),
                "tags":         picks(TAGS_POOL, k=random.randint(0, 3)),
                "score_factors": {
                    "source_quality":  random.randint(10, 30),
                    "value_potential": random.randint(10, 30),
                    "title_seniority": random.randint(10, 25),
                    "engagement":      random.randint(0, 15),
                },
                "scored_at":    ago(days=random.randint(0, 7)) if score > 0 else None,
                "utm_campaign": pick(UTM_CAMPAIGNS) if chance(0.4) else None,
                "utm_medium":   pick(UTM_MEDIUMS)   if chance(0.4) else None,
                "utm_source":   pick(LEAD_SOURCES[:6]) if chance(0.35) else None,
                "tenant_id":    self.tid,
                "created_by":   str(pick(self.user_ids)),
                "created_at":   created,
                "updated_at":   ago(days=random.randint(0, 30)),
            }
            docs.append(doc)
            self.lead_ids.append(doc["_id"])

        await self.db.leads.insert_many(docs)
        print(f"  ✅  {len(docs):>4} leads")

    # ── 5. Deals ──────────────────────────────────────────────

    async def seed_deals(self):
        n = max(50, self.count // 2)
        stages = ["prospect","qualify","demo","proposal","negotiate","won","lost"]
        stage_w = [0.15, 0.20, 0.20, 0.15, 0.10, 0.13, 0.07]
        stage_prob = {
            "prospect":  (5,  15),  "qualify":  (15, 30),
            "demo":      (30, 50),  "proposal": (50, 70),
            "negotiate": (70, 90),  "won":      (100, 100),
            "lost":      (0,  0),
        }
        forecast_cats = {
            "won": "closed", "lost": "omitted",
            "negotiate": "commit", "proposal": "best_case",
            "demo": "pipeline", "qualify": "pipeline", "prospect": "pipeline",
        }
        docs = []
        for _ in range(n):
            stage   = random.choices(stages, weights=stage_w)[0]
            lo, hi  = stage_prob[stage]
            prob    = lo if lo == hi else random.randint(lo, hi)
            value   = round(random.uniform(5000, 500000), 2)
            created = ago(days=random.randint(1, 400))
            close_d = (
                ago(days=random.randint(1, 60))
                if stage in ("won", "lost")
                else soon(days=random.randint(7, 120))
            )

            doc = {
                "_id":      oid(),
                "name":     f"{pick(COMPANIES)} — {pick(['Enterprise','Pro','Growth','Starter','Platform'])} Plan",
                "value":    value,
                "stage":    stage,
                "contact_id": str(pick(self.contact_ids)),
                "account_id": str(pick(self.account_ids)) if chance(0.7) else None,
                "owner_id":   str(pick(self.user_ids[:6])),
                "probability": prob,
                "forecast_category": forecast_cats[stage],
                "expected_close": close_d,
                "ai_forecast": {
                    "probability":    min(100, prob + random.randint(-8, 8)),
                    "expected_value": round(value * prob / 100, 2),
                    "confidence":     pick(["high","medium","low"]),
                    "signals":        picks(["engaged","multi-contact","budget-confirmed","timeline-set","exec-sponsor"], k=2),
                },
                "lost_reason": pick(LOST_REASONS) if stage == "lost" else None,
                "line_items": [
                    {"name": "Platform License", "qty": random.randint(1, 100), "unit_price": round(random.uniform(100, 2000), 2)},
                    {"name": "Onboarding & Setup", "qty": 1,                   "unit_price": round(random.uniform(500,  5000), 2)},
                    {"name": "Support Package",    "qty": 1,                   "unit_price": round(random.uniform(200,  2000), 2)},
                ] if chance(0.6) else [],
                "notes":     pick(DEAL_NOTES),
                "tags":      picks(TAGS_POOL, k=random.randint(0, 2)),
                "tenant_id": self.tid,
                "created_at": created,
                "updated_at": ago(days=random.randint(0, 30)),
            }
            docs.append(doc)
            self.deal_ids.append(doc["_id"])

        await self.db.deals.insert_many(docs)
        print(f"  ✅  {len(docs):>4} deals")

    # ── 6. Tickets ────────────────────────────────────────────

    async def seed_tickets(self):
        n = max(40, self.count // 2)
        sla_hours = {"P1": 1, "P2": 4, "P3": 24, "P4": 72}
        docs = []
        for i in range(n):
            priority = random.choices(["P1","P2","P3","P4"], weights=[0.05,0.15,0.50,0.30])[0]
            status   = random.choices(
                ["open","in_progress","pending","resolved","closed"],
                weights=[0.25, 0.20, 0.10, 0.25, 0.20],
            )[0]
            created  = ago(days=random.randint(0, 180))
            breach   = created + timedelta(hours=sla_hours[priority])
            resolved = (
                created + timedelta(hours=random.uniform(0.5, sla_hours[priority] * 3))
                if status in ("resolved", "closed") else None
            )
            doc = {
                "_id":            oid(),
                "ticket_number":  f"TK-{i+1:04d}",
                "subject":        pick(TICKET_SUBJECTS),
                "description":    (
                    "Customer reported: " + pick(TICKET_SUBJECTS).lower()
                    + ". Steps to reproduce: navigate to the affected section and perform the action. "
                    + "Expected: it works. Actual: error occurs."
                ),
                "priority":       priority,
                "status":         status,
                "channel":        pick(["email","chat","phone","portal","twitter"]),
                "contact_id":     str(pick(self.contact_ids)) if chance(0.7) else None,
                "account_id":     str(pick(self.account_ids)) if chance(0.6) else None,
                "assigned_to":    str(pick(self.user_ids[7:9])) if chance(0.8) else None,  # support agents
                "sla_breach_at":  breach,
                "sla_breached_notified": breach < now() and status not in ("resolved","closed"),
                "csat_score":     random.randint(1, 5) if status in ("resolved","closed") and chance(0.5) else None,
                "tags":           picks(["billing","technical","onboarding","integration","bug","feature-request"], k=random.randint(0,2)),
                "resolved_at":    resolved,
                "first_response_at": created + timedelta(minutes=random.randint(5, 120)) if chance(0.8) else None,
                "created_by":     str(pick(self.user_ids)),
                "tenant_id":      self.tid,
                "created_at":     created,
                "updated_at":     ago(days=random.randint(0, 10)),
            }
            docs.append(doc)
            self.ticket_ids.append(doc["_id"])

        await self.db.tickets.insert_many(docs)
        print(f"  ✅  {len(docs):>4} tickets")

    # ── 7. Campaigns ──────────────────────────────────────────

    async def seed_campaigns(self):
        docs = []
        for name in CAMPAIGN_NAMES:
            status   = pick(["draft","scheduled","running","paused","ended"])
            launched = ago(days=random.randint(1, 90)) if status in ("running","ended") else None
            sent     = random.randint(200, 50000)      if status in ("running","ended") else 0
            open_r   = frac(0.15, 0.55) if sent else 0.0
            click_r  = frac(0.02, open_r * 0.6) if open_r else 0.0
            convs    = int(sent * click_r * frac(0.1, 0.35)) if sent else 0

            doc = {
                "_id":                oid(),
                "name":               name,
                "type":               pick(["email","sms","push","multi"]),
                "status":             status,
                "subject":            f"[NexusCRM] {name}",
                "body":               (
                    f"Hi {{{{name}}}},\n\n"
                    f"We're excited to share our latest update: {name}.\n\n"
                    f"Click below to learn more and take action today.\n\n"
                    f"Best,\nThe NexusCRM Team"
                ),
                "ab_test":            chance(0.3),
                "ab_variant_b":       {"subject": f"[Action Required] {name}"} if chance(0.3) else None,
                "segment_ids":        [],
                "sent_count":         sent,
                "open_rate":          open_r,
                "click_rate":         click_r,
                "unsubscribe_rate":   frac(0.001, 0.025) if sent else 0.0,
                "bounce_rate":        frac(0.005, 0.05)  if sent else 0.0,
                "conversions":        convs,
                "revenue_attributed": round(convs * random.uniform(50, 500), 2) if convs else 0.0,
                "launched_at":        launched,
                "scheduled_at":       soon(days=random.randint(1, 14)) if status == "scheduled" else None,
                "created_by":         str(pick(self.user_ids)),
                "tenant_id":          self.tid,
                "created_at":         ago(days=random.randint(5, 120)),
                "updated_at":         ago(days=random.randint(0, 5)),
            }
            docs.append(doc)
            self.campaign_ids.append(doc["_id"])

        await self.db.campaigns.insert_many(docs)
        print(f"  ✅  {len(docs):>4} campaigns")

    # ── 8. Workflows ──────────────────────────────────────────

    async def seed_workflows(self):
        templates = [
            {
                "name":    "High-Score Lead Assignment",
                "trigger": {
                    "type": "lead.score_changed",
                    "conditions": [{"field": "score", "operator": "gte", "value": 80}],
                },
                "nodes": [
                    {"id": "n1", "type": "assign_lead",        "assigned_to": str(pick(self.user_ids[:6]))},
                    {"id": "n2", "type": "send_notification",  "title": "Hot lead assigned to you",
                     "body": "A lead scored 80+ and has been routed to your queue."},
                    {"id": "n3", "type": "create_task",        "title": "Follow up within 2 hours",
                     "due_date": None},
                ],
                "edges": [{"from": "n1","to": "n2"},{"from": "n2","to": "n3"}],
            },
            {
                "name":    "SLA Breach Escalation",
                "trigger": {
                    "type": "ticket.sla_breached",
                    "conditions": [{"field": "priority", "operator": "in", "value": ["P1","P2"]}],
                },
                "nodes": [
                    {"id": "n1", "type": "send_email", "subject": "🚨 SLA Breach Alert",
                     "body": "Ticket {{ticket_id}} ({{priority}}) has breached its SLA. Immediate action required."},
                    {"id": "n2", "type": "send_notification", "title": "SLA Breach",
                     "body": "Critical ticket needs immediate attention."},
                ],
                "edges": [{"from": "n1","to": "n2"}],
            },
            {
                "name":    "New Lead Welcome Sequence",
                "trigger": {"type": "lead.created", "conditions": []},
                "nodes": [
                    {"id": "n1", "type": "send_email",
                     "subject": "Welcome — let us show you around",
                     "body": "Hi {{name}},\n\nThanks for your interest. We'd love to show you how NexusCRM can help."},
                ],
                "edges": [],
            },
            {
                "name":    "Churn Risk Alert",
                "trigger": {
                    "type": "account.churn_risk",
                    "conditions": [{"field": "churn_score", "operator": "gte", "value": 70}],
                },
                "nodes": [
                    {"id": "n1", "type": "send_notification", "title": "Churn Risk Detected",
                     "body": "Account {{account_id}} has churn score {{churn_score}}."},
                    {"id": "n2", "type": "create_task",
                     "title": "Schedule churn-prevention check-in call", "due_date": None},
                ],
                "edges": [{"from": "n1","to": "n2"}],
            },
            {
                "name":    "Deal Won Celebration",
                "trigger": {"type": "deal.won", "conditions": []},
                "nodes": [
                    {"id": "n1", "type": "send_notification",
                     "title": "🏆 Deal Closed!", "body": "{{owner_id}} just closed ${{value}}!"},
                    {"id": "n2", "type": "send_email",
                     "subject": "Congrats on the close!",
                     "body": "Fantastic work closing {{name}}. The team is proud of you."},
                ],
                "edges": [{"from": "n1","to": "n2"}],
            },
            {
                "name":    "Trial Expiry Reminder",
                "trigger": {"type": "account.trial_expiring", "conditions": []},
                "nodes": [
                    {"id": "n1", "type": "send_email",
                     "subject": "Your trial ends in 3 days",
                     "body": "Hi {{name}}, your NexusCRM trial expires soon. Upgrade now to keep your data."},
                ],
                "edges": [],
            },
            {
                "name":    "Inbound Demo Request Router",
                "trigger": {"type": "lead.created",
                            "conditions": [{"field": "source", "operator": "eq", "value": "demo_request"}]},
                "nodes": [
                    {"id": "n1", "type": "assign_lead", "assigned_to": str(pick(self.user_ids[:4]))},
                    {"id": "n2", "type": "create_task", "title": "Book demo within 24 hours", "due_date": None},
                    {"id": "n3", "type": "send_email",  "subject": "Demo request received",
                     "body": "Hi {{name}}, we've received your demo request and will be in touch within 24 hours."},
                ],
                "edges": [{"from": "n1","to": "n2"},{"from": "n2","to": "n3"}],
            },
        ]

        # Fill remaining names with generic workflows
        extra_names = WORKFLOW_NAMES[len(templates):]
        for xname in extra_names:
            templates.append({
                "name":    xname,
                "trigger": {"type": pick(["lead.created","deal.stage_changed","ticket.created","account.churn_risk"]),
                            "conditions": []},
                "nodes":   [{"id": "n1", "type": "send_notification",
                             "title": xname, "body": "Triggered automatically."}],
                "edges":   [],
            })

        docs = []
        for tpl in templates:
            runs = random.randint(0, 800)
            succ = int(runs * frac(0.88, 0.99))
            doc = {
                "_id":         oid(),
                "name":        tpl["name"],
                "description": f"Automates: {tpl['name']}",
                "status":      random.choices(["active","active","active","paused","draft"],
                                              weights=[0.5,0.2,0.1,0.1,0.1])[0],
                "trigger":     tpl["trigger"],
                "nodes":       tpl["nodes"],
                "edges":       tpl["edges"],
                "stats": {
                    "runs":     runs,
                    "success":  succ,
                    "failures": runs - succ,
                    "avg_ms":   random.randint(80, 2000),
                },
                "created_by": str(pick(self.user_ids)),
                "tenant_id":  self.tid,
                "created_at": ago(days=random.randint(20, 300)),
                "updated_at": ago(days=random.randint(0, 30)),
            }
            docs.append(doc)
            self.workflow_ids.append(doc["_id"])

        await self.db.workflows.insert_many(docs)
        print(f"  ✅  {len(docs):>4} workflows")

    # ── 9. Notifications ──────────────────────────────────────

    async def seed_notifications(self):
        messages = [
            ("Lead scored 90+",         "Jordan Kim from TechCorp scored 92/100 — follow up now.",          "success"),
            ("SLA breach detected",      "Ticket TK-0041 (P1) has breached its 1-hour SLA.",               "error"),
            ("Deal won 🏆",              "Priya Kapoor closed MegaCorp for $120,000!",                      "success"),
            ("Churn risk: Globex",       "Globex Industries has a churn score of 81.",                      "warning"),
            ("Campaign launched",        "Q4 Enterprise Push is now live — 12,400 recipients.",             "info"),
            ("3 new webinar leads",      "3 new leads captured from the October webinar.",                  "info"),
            ("Monthly report ready",     "Your monthly KPI report is ready to download.",                   "info"),
            ("Workflow triggered",       "High-Score Lead Assignment ran for 5 leads today.",               "info"),
            ("CSV import complete",      "Import: 47 leads added, 3 duplicates skipped.",                   "success"),
            ("Health score dropped",     "BrightPath Ltd health score dropped from 78 to 51.",              "warning"),
            ("New high-value lead",      "Priya Nair from MegaCorp Corp added — estimated value $120K.",    "info"),
            ("Deal stalled",             "CoreLogic — Enterprise Plan has had no activity in 14 days.",     "warning"),
            ("Support ticket spike",     "12 new tickets opened in the last hour — check the queue.",       "warning"),
            ("Trial expiring soon",      "5 accounts have trials expiring in the next 48 hours.",           "info"),
            ("Integration error",        "Salesforce sync failed at 03:00 UTC — check logs.",               "error"),
        ]
        docs = []
        for user_id in self.user_ids:
            for _ in range(random.randint(6, 18)):
                title, body, ntype = pick(messages)
                read    = chance(0.55)
                created = ago(days=random.randint(0, 30), hours=random.randint(0, 23))
                docs.append({
                    "_id":        oid(),
                    "user_id":    str(user_id),
                    "tenant_id":  self.tid,
                    "title":      title,
                    "message":    body,
                    "type":       ntype,
                    "read":       read,
                    "read_at":    ago(days=random.randint(0, 7)) if read else None,
                    "action_url": pick(["/leads","/deals","/tickets","/analytics","/campaigns", None]),
                    "created_at": created,
                })

        await self.db.notifications.insert_many(docs)
        print(f"  ✅  {len(docs):>4} notifications")

    # ── 10. Staff (HR) ────────────────────────────────────────

    async def seed_staff(self):
        docs = []
        for user_id in self.user_ids:
            quota    = round(random.uniform(200_000, 2_000_000), 2) if chance(0.65) else None
            attained = round(quota * frac(0.35, 1.35), 2) if quota else None
            doc = {
                "_id":               oid(),
                "user_id":           str(user_id),
                "department":        pick(DEPARTMENTS),
                "title":             pick(TITLES),
                "manager_id":        str(pick(self.user_ids)) if chance(0.8) else None,
                "salary":            round(random.uniform(55_000, 220_000), 2),
                "start_date":        ago(days=random.randint(30, 1200)).date().isoformat(),
                "quota":             quota,
                "quota_attained":    attained,
                "quota_attainment_pct": round(attained / quota * 100, 1) if (quota and attained) else None,
                "performance_rating": pick(["outstanding","exceeds","meets","below"]),
                "territory_ids":     [],
                "certifications":    picks(["Salesforce Admin","HubSpot Inbound","Google Analytics",
                                            "AWS Cloud Practitioner","CompTIA Security+"], k=random.randint(0, 3)),
                "skills":            picks(["negotiation","solution-selling","account-management",
                                            "prospecting","closing","upselling"], k=random.randint(1, 4)),
                "tenant_id":         self.tid,
                "created_at":        ago(days=random.randint(30, 500)),
                "updated_at":        ago(days=random.randint(0, 30)),
            }
            docs.append(doc)
            self.staff_ids.append(doc["_id"])

        await self.db.staff.insert_many(docs)
        print(f"  ✅  {len(docs):>4} staff records")

    # ── 11. Territories ───────────────────────────────────────

    async def seed_territories(self):
        territory_defs = [
            ("APAC",         ["India","Japan","Australia","Singapore","South Korea","New Zealand"]),
            ("EMEA",         ["UK","Germany","France","Netherlands","UAE","South Africa","Sweden"]),
            ("AMER-West",    ["California","Washington","Oregon","British Columbia","Nevada"]),
            ("AMER-East",    ["New York","Massachusetts","Virginia","Ontario","Florida"]),
            ("AMER-Central", ["Texas","Illinois","Ohio","Michigan","Colorado"]),
            ("LATAM",        ["Brazil","Mexico","Colombia","Argentina","Chile","Peru"]),
            ("SMB-Global",   []),
            ("Enterprise-Global", []),
        ]
        docs = []
        for name, regions in territory_defs:
            k = min(random.randint(1, 3), len(self.user_ids))
            doc = {
                "_id":        oid(),
                "name":       name,
                "regions":    regions,
                "rep_ids":    [str(uid) for uid in random.sample(self.user_ids, k=k)],
                "target_mrr": round(random.uniform(100_000, 2_000_000), 2),
                "actual_mrr": round(random.uniform(50_000,  1_800_000), 2),
                "deal_count": random.randint(5, 80),
                "tenant_id":  self.tid,
                "created_at": ago(days=random.randint(60, 400)),
                "updated_at": ago(days=random.randint(0, 30)),
            }
            docs.append(doc)

        await self.db.territories.insert_many(docs)
        print(f"  ✅  {len(docs):>4} territories")

    # ── 12. Onboarding ────────────────────────────────────────

    async def seed_onboarding(self):
        step_defs = {
            "verify_identity":   {"name": "Identity Verification",   "order": 1},
            "sign_contract":     {"name": "Sign Employment Contract", "order": 2},
            "setup_workstation": {"name": "Workstation Setup",        "order": 3},
            "it_access":         {"name": "IT Access & Accounts",     "order": 4},
            "crm_training":      {"name": "CRM Platform Training",    "order": 5},
            "meet_team":         {"name": "Team Introduction",        "order": 6},
            "shadow_call":       {"name": "Shadow a Sales Call",      "order": 7},
            "first_demo":        {"name": "Deliver First Demo",       "order": 8},
        }
        docs = []
        for staff_id in self.staff_ids:
            total     = len(step_defs)
            completed_count = random.randint(0, total)
            step_keys = list(step_defs.keys())
            steps = {}
            for i, key in enumerate(step_keys):
                done = i < completed_count
                steps[key] = {
                    **step_defs[key],
                    "completed":    done,
                    "completed_at": ago(days=random.randint(1, 60)).isoformat() if done else None,
                }
            progress = round(completed_count / total * 100)
            doc = {
                "_id":       oid(),
                "staff_id":  str(staff_id),
                "steps":     steps,
                "progress":  progress,
                "buddy_id":  str(pick(self.user_ids)) if chance(0.7) else None,
                "notes":     (
                    "On track — all key milestones hit." if progress >= 75
                    else "In progress — a few steps remaining." if progress >= 40
                    else "Just started onboarding."
                ),
                "tenant_id": self.tid,
                "created_at": ago(days=random.randint(5, 120)),
                "updated_at": ago(days=random.randint(0, 10)),
            }
            docs.append(doc)

        await self.db.onboarding.insert_many(docs)
        print(f"  ✅  {len(docs):>4} onboarding records")

    # ── 13. Audit Logs ────────────────────────────────────────

    async def seed_audit_logs(self):
        event_resource_pairs = [
            ("lead.created",      "leads"),
            ("lead.updated",      "leads"),
            ("lead.score_changed","leads"),
            ("deal.created",      "deals"),
            ("deal.stage_changed","deals"),
            ("deal.won",          "deals"),
            ("deal.lost",         "deals"),
            ("ticket.created",    "tickets"),
            ("ticket.resolved",   "tickets"),
            ("user.login",        "auth"),
            ("user.logout",       "auth"),
            ("campaign.launched", "campaigns"),
            ("workflow.triggered","workflows"),
            ("account.updated",   "accounts"),
            ("report.generated",  "reports"),
            ("file.uploaded",     "files"),
        ]
        resource_id_pools = {
            "leads":     self.lead_ids,
            "deals":     self.deal_ids,
            "tickets":   self.ticket_ids,
            "auth":      self.user_ids,
            "campaigns": self.campaign_ids,
            "workflows": self.workflow_ids,
            "accounts":  self.account_ids,
            "reports":   self.deal_ids,   # fallback
            "files":     self.lead_ids,   # fallback
        }
        n = max(200, self.count * 2)
        docs = []
        for _ in range(n):
            action, resource = pick(event_resource_pairs)
            pool = resource_id_pools.get(resource, self.lead_ids)
            docs.append({
                "_id":         oid(),
                "tenant_id":   self.tid,
                "user_id":     str(pick(self.user_ids)),
                "action":      action,
                "resource":    resource,
                "resource_id": str(pick(pool)) if pool else None,
                "changes":     {"field": "stage", "from": pick(["prospect","qualify"]), "to": pick(["demo","proposal"])}
                               if "stage_changed" in action else None,
                "ip":          f"203.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}",
                "user_agent":  "Mozilla/5.0 (compatible; NexusCRM-Client)",
                "created_at":  ago(
                    days=random.randint(0, 90),
                    hours=random.randint(0, 23),
                    minutes=random.randint(0, 59),
                ),
            })

        await self.db.audit_logs.insert_many(docs)
        print(f"  ✅  {len(docs):>4} audit log entries")

    # ── 14. Scheduled Reports ─────────────────────────────────

    async def seed_scheduled_reports(self):
        docs = [
            {
                "_id":        oid(),
                "name":       "Weekly Sales Summary",
                "type":       "deals",
                "schedule":   "0 9 * * 1",       # Monday 09:00 UTC
                "enabled":    True,
                "recipients": [str(uid) for uid in self.user_ids[:3]],
                "format":     "csv",
                "next_run":   soon(days=random.randint(0, 7)),
                "last_run":   ago(days=7),
                "tenant_id":  self.tid,
                "created_at": ago(days=90),
                "updated_at": ago(days=7),
            },
            {
                "_id":        oid(),
                "name":       "Monthly Lead Pipeline",
                "type":       "leads",
                "schedule":   "0 8 1 * *",       # 1st of month, 08:00 UTC
                "enabled":    True,
                "recipients": [str(uid) for uid in self.user_ids[:2]],
                "format":     "csv",
                "next_run":   soon(days=random.randint(0, 30)),
                "last_run":   ago(days=30),
                "tenant_id":  self.tid,
                "created_at": ago(days=120),
                "updated_at": ago(days=30),
            },
            {
                "_id":        oid(),
                "name":       "Daily Ticket SLA Report",
                "type":       "tickets",
                "schedule":   "0 7 * * *",       # daily 07:00 UTC
                "enabled":    True,
                "recipients": [str(uid) for uid in self.user_ids[7:9]],
                "format":     "csv",
                "next_run":   soon(hours=random.randint(1, 24)),
                "last_run":   ago(hours=random.randint(1, 24)),
                "tenant_id":  self.tid,
                "created_at": ago(days=60),
                "updated_at": ago(days=1),
            },
            {
                "_id":        oid(),
                "name":       "Quarterly Revenue Forecast",
                "type":       "deals",
                "schedule":   "0 6 1 */3 *",     # quarterly
                "enabled":    True,
                "recipients": [str(uid) for uid in self.user_ids[:4]],
                "format":     "csv",
                "next_run":   soon(days=random.randint(0, 90)),
                "last_run":   ago(days=90),
                "tenant_id":  self.tid,
                "created_at": ago(days=200),
                "updated_at": ago(days=90),
            },
        ]
        await self.db.scheduled_reports.insert_many(docs)
        print(f"  ✅  {len(docs):>4} scheduled reports")

    # ── 15. Workflow Runs ─────────────────────────────────────

    async def seed_workflow_runs(self):
        n = max(100, self.count)
        event_types = [
            "lead.score_changed","deal.won","deal.stage_changed",
            "ticket.sla_breached","account.churn_risk","lead.created",
        ]
        docs = []
        for _ in range(n):
            wf_id   = pick(self.workflow_ids)
            started = ago(days=random.randint(0, 60), hours=random.randint(0, 23))
            status  = random.choices(["completed","failed"], weights=[0.94, 0.06])[0]
            dur_ms  = random.randint(50, 3000)
            docs.append({
                "_id":          oid(),
                "workflow_id":  str(wf_id),
                "tenant_id":    self.tid,
                "event_type":   pick(event_types),
                "payload":      {"tenant_id": self.tid, "value": random.randint(1000, 100000)},
                "status":       status,
                "error":        pick(["Node n2 timeout","Webhook 500","Email SMTP error"])
                                if status == "failed" else None,
                "duration_ms":  dur_ms,
                "started_at":   started,
                "completed_at": started + timedelta(milliseconds=dur_ms),
            })

        await self.db.workflow_runs.insert_many(docs)
        print(f"  ✅  {len(docs):>4} workflow runs")

    # ── Run everything ────────────────────────────────────────

    async def run(self, drop: bool):
        collections = [
            "users","accounts","contacts","leads","deals","tickets",
            "campaigns","workflows","notifications","staff","territories",
            "onboarding","audit_logs","scheduled_reports","workflow_runs",
        ]

        if drop:
            print("\n  🗑️   Dropping existing collections…")
            for col in collections:
                await self.db[col].drop()
            print()

        print(f"  Tenant  : {self.tid}")
        print(f"  Scale   : {self.count}x")
        print(f"  Database: {self.db.name}\n")

        await self.seed_users()
        await self.seed_accounts()
        await self.seed_contacts()
        await self.seed_leads()
        await self.seed_deals()
        await self.seed_tickets()
        await self.seed_campaigns()
        await self.seed_workflows()
        await self.seed_notifications()
        await self.seed_staff()
        await self.seed_territories()
        await self.seed_onboarding()
        await self.seed_audit_logs()
        await self.seed_scheduled_reports()
        await self.seed_workflow_runs()

        print(f"\n  🎉  Seed complete!")
        print(f"\n  ┌─────────────────────────────────────────────────┐")
        print(f"  │  Login credentials                               │")
        print(f"  │                                                  │")
        print(f"  │  super_admin   sarah@nexuscrm.io / password123  │")
        print(f"  │  admin         mike@nexuscrm.io  / password123  │")
        print(f"  │  sales_manager linda@nexuscrm.io / password123  │")
        print(f"  │  sales_rep     jake@nexuscrm.io  / password123  │")
        print(f"  │  support_agent sam@nexuscrm.io   / password123  │")
        print(f"  │  marketing     anna@nexuscrm.io  / password123  │")
        print(f"  │  hr_manager    carlos@nexuscrm.io/ password123  │")
        print(f"  └─────────────────────────────────────────────────┘")
        print(f"\n  Tenant ID: {self.tid}")


# ─── Entry point ──────────────────────────────────────────────

async def main():
    parser = argparse.ArgumentParser(
        description="Seed NexusCRM with realistic dummy data",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
examples:
  python scripts/seed.py
  python scripts/seed.py --drop --count 500
  python scripts/seed.py --tenant my-company-01 --count 200
        """,
    )
    parser.add_argument("--tenant", default="tenant_demo_001",
                        help="Tenant ID to seed into (default: tenant_demo_001)")
    parser.add_argument("--drop",   action="store_true",
                        help="Drop collections before seeding (clean slate)")
    parser.add_argument("--count",  type=int, default=100,
                        help="Base record count multiplier (default: 100)")
    parser.add_argument("--db",     default=None,
                        help="Override MongoDB database name")
    args = parser.parse_args()

    db_name = args.db or MONGO_DB

    print(f"\n🌱  NexusCRM Seed Script")
    print(f"    MongoDB  : {MONGO_URI[:50]}{'…' if len(MONGO_URI) > 50 else ''}")
    print(f"    Database : {db_name}")

    client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=6000)
    try:
        await client.admin.command("ping")
        print("    Status   : ✅  Connected\n")
    except Exception as exc:
        print(f"    Status   : ❌  {exc}")
        print("\n    Make sure MONGO_URI is set correctly in your .env file.")
        sys.exit(1)

    db = client[db_name]
    seeder = Seeder(db, tenant_id=args.tenant, count=args.count)
    await seeder.run(drop=args.drop)
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
