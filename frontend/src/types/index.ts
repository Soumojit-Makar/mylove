// ─── Shared ───────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

// ─── Auth ─────────────────────────────────────────────────────
export type UserRole =
  | 'super_admin' | 'admin' | 'sales_manager' | 'sales_rep'
  | 'marketing' | 'support_agent' | 'hr_manager' | 'read_only'

export interface User {
  _id: string
  name: string
  email: string
  role: UserRole
  tenant_id: string
  is_active: boolean
  avatar_url?: string
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

// ─── Lead ─────────────────────────────────────────────────────
export type LeadStatus = 'new' | 'contacted' | 'mql' | 'sql' | 'disqualified'

export interface LeadContact {
  name: string
  email: string
  phone?: string
  company?: string
  title?: string
  linkedin?: string
}

export interface Lead {
  _id: string
  contact: LeadContact
  status: LeadStatus
  score: number
  score_factors?: Record<string, number>
  source: string
  utm_campaign?: string
  utm_medium?: string
  utm_source?: string
  value?: number
  notes?: string
  tags: string[]
  assigned_to?: string
  tenant_id: string
  created_at: string
  updated_at: string
}

// ─── Deal ─────────────────────────────────────────────────────
export type DealStage =
  | 'prospect' | 'qualify' | 'demo' | 'proposal' | 'negotiate' | 'won' | 'lost'

export interface Deal {
  _id: string
  name: string
  value: number
  stage: DealStage
  contact_id: string
  account_id?: string
  owner_id: string
  probability: number
  forecast_category: 'pipeline' | 'best_case' | 'committed'
  expected_close?: string
  notes?: string
  line_items: LineItem[]
  ai_forecast?: AIForecast
  lost_reason?: string
  tenant_id: string
  created_at: string
  updated_at: string
}

export interface LineItem {
  product: string
  qty: number
  unit_price: number
  total: number
}

export interface AIForecast {
  probability: number
  expected_value: number
  confidence: 'high' | 'medium' | 'low'
  model: string
}

// ─── Contact ──────────────────────────────────────────────────
export interface Contact {
  _id: string
  name: string
  email: string
  phone?: string
  company?: string
  title?: string
  account_id?: string
  tags: string[]
  tenant_id: string
  created_at: string
}

// ─── Account ──────────────────────────────────────────────────
export type AccountPlan = 'starter' | 'pro' | 'growth' | 'enterprise'

export interface Account {
  _id: string
  name: string
  domain?: string
  plan: AccountPlan
  mrr: number
  health_score: number
  churn_score?: number
  churn_reason?: string
  nps?: number
  csm_id?: string
  industry?: string
  employees?: number
  tenant_id: string
  created_at: string
}

// ─── Ticket ───────────────────────────────────────────────────
export type TicketPriority = 'P1' | 'P2' | 'P3' | 'P4'
export type TicketStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed'

export interface Ticket {
  _id: string
  ticket_number: string
  subject: string
  description: string
  priority: TicketPriority
  status: TicketStatus
  contact_id?: string
  account_id?: string
  assigned_to?: string
  channel: string
  tags: string[]
  sla_breach_at?: string
  sla_breached?: boolean
  csat_score?: number
  tenant_id: string
  created_at: string
  updated_at: string
}

// ─── Campaign ─────────────────────────────────────────────────
export type CampaignType = 'email' | 'sms' | 'push' | 'multi'
export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'ended'

export interface Campaign {
  _id: string
  name: string
  type: CampaignType
  status: CampaignStatus
  subject?: string
  body: string
  segment_ids: string[]
  scheduled_at?: string
  ab_test: boolean
  ab_variant_b?: Record<string, unknown>
  sent_count: number
  open_rate: number
  click_rate: number
  unsubscribe_rate?: number
  conversions?: number
  revenue_attributed?: number
  tenant_id: string
  created_at: string
}

// ─── Workflow ─────────────────────────────────────────────────
export type WorkflowStatus = 'active' | 'paused' | 'draft'

export interface WorkflowTrigger {
  type: string
  conditions: WorkflowCondition[]
}

export interface WorkflowCondition {
  field: string
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in'
  value: unknown
}

export interface WorkflowNode {
  id: string
  type: string
  label: string
  config: Record<string, unknown>
}

export interface WorkflowEdge {
  from: string
  to: string
  condition?: string
}

export interface Workflow {
  _id: string
  name: string
  description?: string
  status: WorkflowStatus
  trigger: WorkflowTrigger
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  stats: {
    runs: number
    success: number
    failures: number
    avg_ms: number
  }
  tenant_id: string
  created_at: string
}

// ─── Notification ─────────────────────────────────────────────
export interface Notification {
  _id: string
  title: string
  body: string
  type: 'info' | 'success' | 'warning' | 'error'
  user_id: string
  tenant_id: string
  read: boolean
  read_at?: string
  link?: string
  created_at: string
}

// ─── Analytics ────────────────────────────────────────────────
export interface OverviewMetrics {
  leads_total: number
  deals_won: number
  deals_lost: number
  win_rate: number
  open_tickets: number
  total_revenue: number
}

export interface FunnelStage {
  stage: string
  count: number
}

export interface CohortData {
  cohort: string
  months: (number | null)[]
}

export interface AttributionData {
  _id: string
  leads: number
  total_value: number
}

// ─── Report ───────────────────────────────────────────────────
export interface Report {
  _id: string
  type: string
  period: string
  data: Record<string, unknown>
  status: 'pending' | 'ready' | 'failed'
  pdf_url?: string
  csv_url?: string
  generated_by: string
  tenant_id: string
  created_at: string
}

// ─── Audit ────────────────────────────────────────────────────
export interface AuditLog {
  _id: string
  tenant_id: string
  user_id: string
  action: string
  resource: string
  resource_id?: string
  changes?: Record<string, unknown>
  ip?: string
  created_at: string
}
