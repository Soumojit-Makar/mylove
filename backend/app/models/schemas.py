"""Pydantic v2 models — request/response schemas for all entities."""

from __future__ import annotations
from datetime import datetime
from typing import Any, Dict, List, Optional
from enum import Enum
from pydantic import BaseModel, EmailStr, Field, field_validator
from bson import ObjectId


# ─── Shared ───────────────────────────────────────────────────

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return str(v)
        if ObjectId.is_valid(v):
            return str(v)
        raise ValueError("Invalid ObjectId")


class BaseResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}


# ─── User / Auth ──────────────────────────────────────────────

class UserRole(str, Enum):
    super_admin  = "super_admin"
    admin        = "admin"
    sales_manager = "sales_manager"
    sales_rep    = "sales_rep"
    marketing    = "marketing"
    support_agent = "support_agent"
    hr_manager   = "hr_manager"
    read_only    = "read_only"


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=8)
    role: UserRole = UserRole.sales_rep
    tenant_id: Optional[str] = None


class UserResponse(BaseResponse):
    name: str
    email: str
    role: UserRole
    tenant_id: str
    is_active: bool = True
    avatar_url: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ─── Lead ─────────────────────────────────────────────────────

class LeadStatus(str, Enum):
    new          = "new"
    contacted    = "contacted"
    mql          = "mql"
    sql          = "sql"
    disqualified = "disqualified"


class LeadContact(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    linkedin: Optional[str] = None


class LeadCreate(BaseModel):
    contact: LeadContact
    source: str = "manual"
    utm_campaign: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_source: Optional[str] = None
    value: Optional[float] = None
    notes: Optional[str] = None
    tags: List[str] = []


class LeadUpdate(BaseModel):
    status: Optional[LeadStatus] = None
    assigned_to: Optional[str] = None
    score: Optional[int] = Field(None, ge=0, le=100)
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class LeadResponse(BaseResponse):
    contact: LeadContact
    status: LeadStatus
    score: int = 0
    source: str
    assigned_to: Optional[str] = None
    value: Optional[float] = None
    tags: List[str] = []
    tenant_id: str


# ─── Deal ─────────────────────────────────────────────────────

class DealStage(str, Enum):
    prospect  = "prospect"
    qualify   = "qualify"
    demo      = "demo"
    proposal  = "proposal"
    negotiate = "negotiate"
    won       = "won"
    lost      = "lost"


class DealCreate(BaseModel):
    name: str
    value: float = Field(gt=0)
    stage: DealStage = DealStage.prospect
    contact_id: str
    account_id: Optional[str] = None
    expected_close: Optional[datetime] = None
    probability: int = Field(10, ge=0, le=100)
    forecast_category: str = "pipeline"
    notes: Optional[str] = None
    line_items: List[Dict[str, Any]] = []


class DealUpdate(BaseModel):
    stage: Optional[DealStage] = None
    value: Optional[float] = None
    probability: Optional[int] = None
    expected_close: Optional[datetime] = None
    notes: Optional[str] = None
    lost_reason: Optional[str] = None


class DealResponse(BaseResponse):
    name: str
    value: float
    stage: DealStage
    contact_id: str
    account_id: Optional[str] = None
    owner_id: str
    probability: int
    forecast_category: str
    ai_forecast: Optional[Dict[str, Any]] = None
    tenant_id: str


# ─── Contact ──────────────────────────────────────────────────

class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    account_id: Optional[str] = None
    tags: List[str] = []


class ContactResponse(BaseResponse):
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    account_id: Optional[str] = None
    tags: List[str] = []
    tenant_id: str


# ─── Account ──────────────────────────────────────────────────

class AccountPlan(str, Enum):
    starter    = "starter"
    pro        = "pro"
    growth     = "growth"
    enterprise = "enterprise"


class AccountCreate(BaseModel):
    name: str
    domain: Optional[str] = None
    plan: AccountPlan = AccountPlan.starter
    mrr: float = 0.0
    csm_id: Optional[str] = None
    industry: Optional[str] = None
    employees: Optional[int] = None


class AccountResponse(BaseResponse):
    name: str
    domain: Optional[str] = None
    plan: AccountPlan
    mrr: float
    health_score: int = 50
    nps: Optional[int] = None
    csm_id: Optional[str] = None
    tenant_id: str


# ─── Ticket ───────────────────────────────────────────────────

class TicketPriority(str, Enum):
    p1 = "P1"
    p2 = "P2"
    p3 = "P3"
    p4 = "P4"


class TicketStatus(str, Enum):
    open        = "open"
    in_progress = "in_progress"
    pending     = "pending"
    resolved    = "resolved"
    closed      = "closed"


class TicketCreate(BaseModel):
    subject: str
    description: str
    priority: TicketPriority = TicketPriority.p3
    contact_id: Optional[str] = None
    account_id: Optional[str] = None
    channel: str = "email"
    tags: List[str] = []


class TicketResponse(BaseResponse):
    subject: str
    description: str
    priority: TicketPriority
    status: TicketStatus
    contact_id: Optional[str] = None
    account_id: Optional[str] = None
    assigned_to: Optional[str] = None
    channel: str
    sla_breach_at: Optional[datetime] = None
    csat_score: Optional[int] = None
    tenant_id: str


# ─── Campaign ─────────────────────────────────────────────────

class CampaignType(str, Enum):
    email = "email"
    sms   = "sms"
    push  = "push"
    multi = "multi"


class CampaignStatus(str, Enum):
    draft     = "draft"
    scheduled = "scheduled"
    running   = "running"
    paused    = "paused"
    ended     = "ended"


class CampaignCreate(BaseModel):
    name: str
    type: CampaignType
    subject: Optional[str] = None
    body: str
    segment_ids: List[str] = []
    scheduled_at: Optional[datetime] = None
    ab_test: bool = False
    ab_variant_b: Optional[Dict[str, Any]] = None


class CampaignResponse(BaseResponse):
    name: str
    type: CampaignType
    status: CampaignStatus
    subject: Optional[str] = None
    sent_count: int = 0
    open_rate: float = 0.0
    click_rate: float = 0.0
    tenant_id: str


# ─── Workflow ─────────────────────────────────────────────────

class WorkflowStatus(str, Enum):
    active = "active"
    paused = "paused"
    draft  = "draft"


class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    trigger: Dict[str, Any]
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]] = []


class WorkflowResponse(BaseResponse):
    name: str
    status: WorkflowStatus
    trigger: Dict[str, Any]
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    stats: Dict[str, Any] = {}
    tenant_id: str


# ─── Pagination ───────────────────────────────────────────────

class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
    pages: int
