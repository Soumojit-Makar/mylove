// ─── Mock data store — replaces backend when API is unavailable ───────────────
// All mutations update this in-memory store so the UI stays consistent.

export interface Lead {
  _id: string
  contact: { name: string; email: string; company: string; title: string }
  status: 'new' | 'mql' | 'sql' | 'disqualified'
  score: number
  source: string
  value: number
  assigned_to: string | null
  created_at: string
}

export interface Deal {
  _id: string
  name: string
  company: string
  stage: string
  value: number
  probability: number
  owner: string
  close_date: string
}

export interface Ticket {
  _id: string
  subject: string
  customer: string
  status: 'open' | 'pending' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  created_at: string
  sla_breached: boolean
}

const now = new Date().toISOString()

export const mockLeads: Lead[] = [
  { _id: '1', contact: { name: 'Jordan Kim', email: 'jordan@techco.io', company: 'TechCo Inc', title: 'CTO' }, status: 'sql', score: 87, source: 'Organic Search', value: 45000, assigned_to: 'SA', created_at: now },
  { _id: '2', contact: { name: 'Maria Santos', email: 'maria@globex.com', company: 'Globex Corp', title: 'VP Sales' }, status: 'mql', score: 72, source: 'LinkedIn Ad', value: 18000, assigned_to: 'MR', created_at: now },
  { _id: '3', contact: { name: 'Alex Chen', email: 'alex@startupxyz.io', company: 'StartupXYZ', title: 'Founder' }, status: 'mql', score: 55, source: 'Webinar', value: 8000, assigned_to: 'LC', created_at: now },
  { _id: '4', contact: { name: 'Priya Nair', email: 'priya@megacorp.com', company: 'MegaCorp Ltd', title: 'CIO' }, status: 'sql', score: 91, source: 'Referral', value: 120000, assigned_to: 'PK', created_at: now },
  { _id: '5', contact: { name: 'Tom Williams', email: 'tom@acme.solutions', company: 'Acme Solutions', title: 'Manager' }, status: 'new', score: 38, source: 'Cold Email', value: 22000, assigned_to: 'TW', created_at: now },
  { _id: '6', contact: { name: 'Lisa Park', email: 'lisa@dataflow.ai', company: 'DataFlow AI', title: 'CEO' }, status: 'mql', score: 68, source: 'Demo Request', value: 75000, assigned_to: 'SA', created_at: now },
  { _id: '7', contact: { name: 'Marcus Brown', email: 'marcus@retailtech.co', company: 'RetailTech', title: 'Director' }, status: 'new', score: 29, source: 'Ad Click', value: 5000, assigned_to: null, created_at: now },
  { _id: '8', contact: { name: 'Yuki Tanaka', email: 'yuki@enterprise.jp', company: 'Enterprise JP', title: 'SVP' }, status: 'sql', score: 82, source: 'Partner', value: 95000, assigned_to: 'MR', created_at: now },
]

export const mockDeals: Deal[] = [
  { _id: 'd1', name: 'Acme Corp Enterprise License', company: 'Acme Corp', stage: 'Proposal', value: 120000, probability: 75, owner: 'SA', close_date: '2025-03-31' },
  { _id: 'd2', name: 'TechCo Platform Deal', company: 'TechCo Inc', stage: 'Negotiation', value: 85000, probability: 60, owner: 'MR', close_date: '2025-04-15' },
  { _id: 'd3', name: 'Globex Data Suite', company: 'Globex Corp', stage: 'Demo', value: 45000, probability: 40, owner: 'LC', close_date: '2025-05-01' },
  { _id: 'd4', name: 'MegaCorp Full Stack', company: 'MegaCorp Ltd', stage: 'SQL', value: 250000, probability: 25, owner: 'PK', close_date: '2025-06-30' },
  { _id: 'd5', name: 'RetailTech Starter Pack', company: 'RetailTech', stage: 'MQL', value: 15000, probability: 15, owner: 'TW', close_date: '2025-07-15' },
]

export const mockTickets: Ticket[] = [
  { _id: 't1', subject: 'Cannot access reporting module', customer: 'Acme Corp', status: 'open', priority: 'high', created_at: now, sla_breached: false },
  { _id: 't2', subject: 'API rate limit exceeded', customer: 'TechCo Inc', status: 'pending', priority: 'critical', created_at: now, sla_breached: true },
  { _id: 't3', subject: 'CSV import fails silently', customer: 'Globex Corp', status: 'open', priority: 'medium', created_at: now, sla_breached: false },
  { _id: 't4', subject: 'Password reset email not arriving', customer: 'StartupXYZ', status: 'resolved', priority: 'low', created_at: now, sla_breached: false },
  { _id: 't5', subject: 'Dashboard charts not loading', customer: 'DataFlow AI', status: 'open', priority: 'high', created_at: now, sla_breached: true },
  { _id: 't6', subject: 'Need bulk delete for contacts', customer: 'RetailTech', status: 'open', priority: 'low', created_at: now, sla_breached: false },
  { _id: 't7', subject: 'Integration with Salesforce broken', customer: 'MegaCorp Ltd', status: 'pending', priority: 'critical', created_at: now, sla_breached: false },
]

// Mutable store — mutations update this directly
export const store = {
  leads: [...mockLeads],
  deals: [...mockDeals],
  tickets: [...mockTickets],
  nextId: 100,
}

function uid() { return String(++store.nextId) }

// ─── Mock API handlers ────────────────────────────────────────────────────────
type MockHandler = (url: string, method: string, data?: any) => any

export const mockApi: MockHandler = (url, method, data) => {
  // Auth
  if (url.includes('/auth/login') && method === 'POST') {
    return {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      token_type: 'bearer',
    }
  }
  if (url.includes('/auth/me')) {
    return { id: 'u1', name: 'Sarah Adams', email: 'sarah@nexuscrm.io', role: 'sales_manager', tenant_id: 'tenant1' }
  }
  if (url.includes('/auth/refresh')) {
    return { access_token: 'mock-access-token', refresh_token: 'mock-refresh-token' }
  }
  if (url.includes('/auth/logout')) return {}

  // Leads
  if (url.match(/\/leads$/) && method === 'GET') {
    return { items: store.leads, total: store.leads.length, page: 1, pages: 1 }
  }
  if (url.match(/\/leads$/) && method === 'POST') {
    const lead: Lead = {
      _id: uid(),
      contact: { name: data.name, email: data.email, company: data.company, title: data.title || '' },
      status: data.status || 'new',
      score: Math.floor(Math.random() * 40 + 30),
      source: data.source || 'Manual',
      value: Number(data.value) || 0,
      assigned_to: null,
      created_at: new Date().toISOString(),
    }
    store.leads.unshift(lead)
    return lead
  }
  if (url.match(/\/leads\/\w+\/score/) && method === 'POST') {
    return { status: 'queued' }
  }
  if (url.match(/\/leads\/(\w+)$/) && method === 'DELETE') {
    const id = url.split('/').pop()
    store.leads = store.leads.filter(l => l._id !== id)
    return {}
  }
  if (url.match(/\/leads\/(\w+)$/) && method === 'PATCH') {
    const id = url.split('/').pop()
    const idx = store.leads.findIndex(l => l._id === id)
    if (idx >= 0) store.leads[idx] = { ...store.leads[idx], ...data }
    return store.leads[idx] || {}
  }

  // Deals
  if (url.match(/\/deals$/) && method === 'GET') {
    return { items: store.deals, total: store.deals.length, page: 1, pages: 1 }
  }
  if (url.match(/\/deals$/) && method === 'POST') {
    const deal: Deal = { _id: uid(), ...data, probability: data.probability || 20 }
    store.deals.unshift(deal)
    return deal
  }
  if (url.includes('/deals/forecast')) {
    return { total: 2_840_000, weighted: 1_420_000, best_case: 3_100_000, commit: 1_200_000 }
  }
  if (url.match(/\/deals\/(\w+)$/) && method === 'PATCH') {
    const id = url.split('/').pop()
    const idx = store.deals.findIndex(d => d._id === id)
    if (idx >= 0) store.deals[idx] = { ...store.deals[idx], ...data }
    return store.deals[idx] || {}
  }
  if (url.match(/\/deals\/(\w+)$/) && method === 'DELETE') {
    const id = url.split('/').pop()
    store.deals = store.deals.filter(d => d._id !== id)
    return {}
  }

  // Tickets
  if (url.match(/\/tickets$/) && method === 'GET') {
    return { items: store.tickets, total: store.tickets.length, page: 1, pages: 1 }
  }
  if (url.match(/\/tickets$/) && method === 'POST') {
    const ticket: Ticket = {
      _id: uid(),
      subject: data.subject,
      customer: data.customer,
      status: 'open',
      priority: data.priority || 'medium',
      created_at: new Date().toISOString(),
      sla_breached: false,
    }
    store.tickets.unshift(ticket)
    return ticket
  }
  if (url.match(/\/tickets\/(\w+)$/) && method === 'PATCH') {
    const id = url.split('/').pop()
    const idx = store.tickets.findIndex(t => t._id === id)
    if (idx >= 0) store.tickets[idx] = { ...store.tickets[idx], ...data }
    return store.tickets[idx] || {}
  }

  // Analytics
  if (url.includes('/analytics/overview')) {
    return { total_revenue: 4_820_000, leads_total: 1284, win_rate: 34.7, avg_deal: 18400 }
  }
  if (url.includes('/analytics/revenue')) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return { data: months.map((month, i) => ({ month, revenue: 280000 + Math.sin(i * 0.5) * 80000 + i * 55000, leads: 45 + ((i * 7 + 3) % 80) })) }
  }
  if (url.includes('/analytics/cohorts')) return { data: [] }
  if (url.includes('/analytics/attribution')) return { data: [] }

  // Notifications
  if (url.includes('/notifications') && method === 'GET') {
    return { items: [], total: 0 }
  }
  if (url.includes('/notifications') && method === 'PATCH') return {}

  // Contacts
  if (url.includes('/contacts') && method === 'GET') {
    return { items: store.leads.map(l => ({ _id: l._id, ...l.contact, status: l.status })), total: store.leads.length, page: 1, pages: 1 }
  }

  // Accounts
  if (url.includes('/accounts') && method === 'GET') {
    return {
      items: [
        { _id: 'a1', name: 'Acme Corp', industry: 'Technology', employees: 1200, arr: 240000, health: 87, churn_risk: false },
        { _id: 'a2', name: 'Globex Corp', industry: 'Finance', employees: 3400, arr: 180000, health: 42, churn_risk: true },
        { _id: 'a3', name: 'MegaCorp Ltd', industry: 'Healthcare', employees: 8900, arr: 480000, health: 72, churn_risk: false },
      ],
      total: 3, page: 1, pages: 1,
    }
  }

  // Campaigns
  if (url.includes('/campaigns') && method === 'GET') {
    return {
      items: [
        { _id: 'c1', name: 'Q4 Enterprise Push', status: 'active', type: 'email', sent: 4200, opens: 1890, clicks: 342, leads: 28 },
        { _id: 'c2', name: 'Product Launch Webinar', status: 'draft', type: 'webinar', sent: 0, opens: 0, clicks: 0, leads: 0 },
        { _id: 'c3', name: 'Mid-Market Nurture', status: 'completed', type: 'email', sent: 8600, opens: 3100, clicks: 780, leads: 65 },
      ],
      total: 3, page: 1, pages: 1,
    }
  }

  // Workflows
  if (url.includes('/workflows') && method === 'GET') {
    return {
      items: [
        { _id: 'w1', name: 'New Lead Onboarding', status: 'active', trigger: 'lead.created', runs: 1842, last_run: '2m ago' },
        { _id: 'w2', name: 'Deal Stage Notifications', status: 'active', trigger: 'deal.stage_changed', runs: 423, last_run: '18m ago' },
        { _id: 'w3', name: 'Churn Risk Alert', status: 'inactive', trigger: 'account.churn_risk', runs: 87, last_run: '3d ago' },
      ],
      total: 3, page: 1, pages: 1,
    }
  }

  // Reports
  if (url.includes('/reports') && method === 'GET') {
    return { items: [], total: 0 }
  }
  if (url.includes('/reports/generate')) return { status: 'queued' }

  // HR
  if (url.includes('/hr/staff')) {
    return {
      items: [
        { _id: 'h1', name: 'Sarah Adams', role: 'Sales Manager', deals: 12, revenue: 480000, quota_pct: 112 },
        { _id: 'h2', name: 'Marcus Reid', role: 'AE', deals: 8, revenue: 310000, quota_pct: 88 },
        { _id: 'h3', name: 'Lena Chen', role: 'SDR', deals: 3, revenue: 95000, quota_pct: 95 },
      ]
    }
  }
  if (url.includes('/hr/kpis')) {
    return { team_quota_attainment: 94, avg_ramp: 68, attrition: 8 }
  }

  // Stream — never reaches here, handled separately
  if (url.includes('/stream')) return {}

  // Default
  return {}
}
