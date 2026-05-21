// ─── Mock data store — replaces backend when API is unavailable ───────────────
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

const SOURCES = ['Organic Search', 'LinkedIn Ad', 'Referral', 'Webinar', 'Demo Request', 'Cold Email', 'Partner', 'Ad Click', 'Manual']
const STATUSES: Lead['status'][] = ['new', 'mql', 'sql', 'disqualified']
const COMPANIES = ['TechCo Inc', 'Globex Corp', 'MegaCorp Ltd', 'Acme Solutions', 'DataFlow AI', 'RetailTech', 'Enterprise JP', 'StartupXYZ', 'FinServ Co', 'CloudOps']
const NAMES = ['Jordan Kim','Maria Santos','Alex Chen','Priya Nair','Tom Williams','Lisa Park','Marcus Brown','Yuki Tanaka','Sara Patel','David Lee','Emma Wilson','Noah Garcia','Olivia Martinez','Liam Johnson','Ava Robinson']

// Generate 60 leads for proper pagination demo
function genLeads(): Lead[] {
  const leads: Lead[] = []
  NAMES.concat(NAMES.concat(NAMES.concat(NAMES))).slice(0, 60).forEach((name, i) => {
    leads.push({
      _id: String(i + 1),
      contact: {
        name: `${name} ${i > 14 ? i : ''}`.trim(),
        email: `${name.toLowerCase().replace(/\s/g,'.')}${i > 14 ? i : ''}@${COMPANIES[i % COMPANIES.length].toLowerCase().replace(/\s/g,'')}.io`,
        company: COMPANIES[i % COMPANIES.length],
        title: ['CTO','VP Sales','Founder','CIO','Manager','Director','CEO','SVP'][i % 8],
      },
      status: STATUSES[i % 4],
      score: 20 + ((i * 17 + 31) % 75),
      source: SOURCES[i % SOURCES.length],
      value: (5 + ((i * 13 + 7) % 100)) * 1000,
      assigned_to: ['SA','MR','LC','PK','TW'][i % 5],
      created_at: now,
    })
  })
  return leads
}

// Generate 50 tickets
function genTickets(): Ticket[] {
  const subjects = [
    'Cannot access reporting module', 'API rate limit exceeded', 'CSV import fails silently',
    'Password reset email not arriving', 'Dashboard charts not loading', 'Need bulk delete for contacts',
    'Integration with Salesforce broken', 'Slow query on deals list', 'Export PDF hangs',
    'Mobile app crashes on login', 'Webhook not firing on deal close', 'Email template not saving',
    '2FA setup failing for SSO users', 'Audit log missing entries', 'Pagination broken on tickets',
  ]
  const customers = COMPANIES
  const statuses: Ticket['status'][] = ['open', 'pending', 'resolved', 'closed']
  const priorities: Ticket['priority'][] = ['low', 'medium', 'high', 'critical']
  return Array.from({ length: 50 }, (_, i) => ({
    _id: `t${i + 1}`,
    subject: subjects[i % subjects.length] + (i >= subjects.length ? ` #${i + 1}` : ''),
    customer: customers[i % customers.length],
    status: statuses[i % 4],
    priority: priorities[i % 4],
    created_at: now,
    sla_breached: i % 7 === 2,
  }))
}

export const mockLeads: Lead[] = genLeads()
export const mockTickets: Ticket[] = genTickets()

export const mockDeals: Deal[] = [
  { _id: 'd1', name: 'Acme Corp Enterprise License', company: 'Acme Corp', stage: 'Proposal', value: 120000, probability: 75, owner: 'SA', close_date: '2025-03-31' },
  { _id: 'd2', name: 'TechCo Platform Deal', company: 'TechCo Inc', stage: 'Negotiation', value: 85000, probability: 60, owner: 'MR', close_date: '2025-04-15' },
  { _id: 'd3', name: 'Globex Data Suite', company: 'Globex Corp', stage: 'Demo', value: 45000, probability: 40, owner: 'LC', close_date: '2025-05-01' },
  { _id: 'd4', name: 'MegaCorp Full Stack', company: 'MegaCorp Ltd', stage: 'SQL', value: 250000, probability: 25, owner: 'PK', close_date: '2025-06-30' },
  { _id: 'd5', name: 'RetailTech Starter Pack', company: 'RetailTech', stage: 'MQL', value: 15000, probability: 15, owner: 'TW', close_date: '2025-07-15' },
]

// Mutable store
export const store = {
  leads: [...mockLeads],
  tickets: [...mockTickets],
  deals: [...mockDeals],
  nextId: 200,
}

function uid() { return String(++store.nextId) }

// ─── Pagination helper ────────────────────────────────────────
function paginate<T>(items: T[], params: Record<string, string>, pageSize = 20) {
  const page = Math.max(1, parseInt(params.page || '1', 10))
  const search = (params.search || '').toLowerCase()
  const status = params.status

  let filtered = items
  if (search) {
    filtered = filtered.filter(item => JSON.stringify(item).toLowerCase().includes(search))
  }
  if (status) {
    filtered = filtered.filter((item: any) =>
      item.status === status || item.contact?.status === status
    )
  }

  const total = filtered.length
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, pages)
  const start = (safePage - 1) * pageSize
  return {
    items: filtered.slice(start, start + pageSize),
    total,
    page: safePage,
    pages,
  }
}

// ─── Mock API handlers ────────────────────────────────────────
type MockHandler = (url: string, method: string, data?: any, params?: Record<string, string>) => any

export const mockApi: MockHandler = (url, method, data, params = {}) => {
  // Auth
  if (url.includes('/auth/login') && method === 'POST') {
    return { access_token: 'mock-access-token', refresh_token: 'mock-refresh-token', token_type: 'bearer' }
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
    return paginate(store.leads, params, 20)
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
  if (url.match(/\/leads\/\w+\/score/) && method === 'POST') return { status: 'queued' }
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
    return paginate(store.deals, params, 20)
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
    return paginate(store.tickets, params, 15)
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

  // Contacts (derived from leads)
  if (url.includes('/contacts') && method === 'GET') {
    const contacts = store.leads.map(l => ({
      _id: l._id, ...l.contact, tags: [], status: l.status,
    }))
    return paginate(contacts, params, 20)
  }
  if (url.includes('/contacts') && method === 'POST') {
    const lead: Lead = {
      _id: uid(),
      contact: { name: data.name, email: data.email, company: data.company, title: data.title || '' },
      status: 'new', score: 50, source: 'Manual', value: 0, assigned_to: null,
      created_at: new Date().toISOString(),
    }
    store.leads.unshift(lead)
    return { _id: lead._id, ...lead.contact, tags: [] }
  }

  // Accounts
  if (url.includes('/accounts') && method === 'GET') {
    const accounts = [
      { _id: 'a1', name: 'Acme Corp',         plan: 'Enterprise', mrr: 12400, health: 88, nps: 'Promoter',  renewal: 'Dec 2025', csm: 'Sarah L.',  seats: 240 },
      { _id: 'a2', name: 'MegaCorp Ltd',       plan: 'Enterprise', mrr: 24800, health: 92, nps: 'Promoter',  renewal: 'Jan 2026', csm: 'James K.',  seats: 580 },
      { _id: 'a3', name: 'Globex Industries',  plan: 'Growth',     mrr: 4200,  health: 28, nps: 'Detractor', renewal: 'Mar 2026', csm: 'Priya N.',  seats: 45  },
      { _id: 'a4', name: 'TechCo Inc',         plan: 'Pro',        mrr: 2800,  health: 71, nps: 'Passive',   renewal: 'Feb 2026', csm: 'David M.',  seats: 30  },
      { _id: 'a5', name: 'DataFlow AI',        plan: 'Enterprise', mrr: 8400,  health: 84, nps: 'Promoter',  renewal: 'Nov 2025', csm: 'Yuki T.',   seats: 120 },
      { _id: 'a6', name: 'RetailTech',         plan: 'Starter',    mrr: 990,   health: 55, nps: 'Passive',   renewal: 'Apr 2026', csm: 'Marcus B.', seats: 12  },
      { _id: 'a7', name: 'CloudOps',           plan: 'Pro',        mrr: 3200,  health: 78, nps: 'Promoter',  renewal: 'May 2026', csm: 'Emma W.',   seats: 50  },
      { _id: 'a8', name: 'FinServ Co',         plan: 'Enterprise', mrr: 18600, health: 91, nps: 'Promoter',  renewal: 'Jun 2026', csm: 'Noah G.',   seats: 310 },
      { _id: 'a9', name: 'StartupXYZ',         plan: 'Starter',    mrr: 490,   health: 40, nps: 'Detractor', renewal: 'Jul 2026', csm: 'Olivia M.', seats: 8   },
      { _id:'a10', name: 'Enterprise JP',      plan: 'Enterprise', mrr: 21000, health: 95, nps: 'Promoter',  renewal: 'Aug 2026', csm: 'Liam J.',   seats: 420 },
    ]
    return paginate(accounts, params, 8)
  }

  // Campaigns
  if (url.includes('/campaigns') && method === 'GET') {
    return { items: [
      { _id: 'c1', name: 'Q4 Enterprise Push', status: 'active', type: 'email', sent: 4200, opens: 1890, clicks: 342, leads: 28 },
      { _id: 'c2', name: 'Product Launch Webinar', status: 'draft', type: 'webinar', sent: 0, opens: 0, clicks: 0, leads: 0 },
      { _id: 'c3', name: 'Mid-Market Nurture', status: 'completed', type: 'email', sent: 8600, opens: 3100, clicks: 780, leads: 65 },
    ], total: 3, page: 1, pages: 1 }
  }

  // Workflows
  if (url.includes('/workflows') && method === 'GET') {
    return { items: [
      { _id: 'w1', name: 'New Lead Onboarding', status: 'active', trigger: 'lead.created', runs: 1842, last_run: '2m ago' },
      { _id: 'w2', name: 'Deal Stage Notifications', status: 'active', trigger: 'deal.stage_changed', runs: 423, last_run: '18m ago' },
      { _id: 'w3', name: 'Churn Risk Alert', status: 'inactive', trigger: 'account.churn_risk', runs: 87, last_run: '3d ago' },
    ], total: 3, page: 1, pages: 1 }
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
  if (url.includes('/notifications') && method === 'GET') return { items: [], total: 0 }
  if (url.includes('/notifications') && method === 'PATCH') return {}

  // Reports
  if (url.includes('/reports') && method === 'GET') return { items: [], total: 0 }
  if (url.includes('/reports/generate')) return { status: 'queued' }

  // HR
  if (url.includes('/hr/staff')) {
    return { items: [
      { _id: 'h1', name: 'Sarah Adams', role: 'Sales Manager', deals: 12, revenue: 480000, quota_pct: 112 },
      { _id: 'h2', name: 'Marcus Reid', role: 'AE', deals: 8, revenue: 310000, quota_pct: 88 },
      { _id: 'h3', name: 'Lena Chen', role: 'SDR', deals: 3, revenue: 95000, quota_pct: 95 },
    ]}
  }
  if (url.includes('/hr/kpis')) {
    return { team_quota_attainment: 94, avg_ramp: 68, attrition: 8 }
  }

  return {}
}
