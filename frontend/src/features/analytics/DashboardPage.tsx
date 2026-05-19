import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { MetricCard, Card, AIInsightCard, SectionHeader, LoadingSpinner } from '../../components/ui'
import { formatCurrency } from '../../lib/utils'
import { useAnalyticsOverview, useRevenueTrend } from '../../hooks/useApi'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// Stable mock data — defined outside component so it's never recreated on render
const MOCK_REVENUE = MONTHS.map((month, i) => ({
  month,
  revenue: 280_000 + Math.floor(Math.sin(i * 0.5) * 80_000 + i * 55_000),
  leads: 45 + ((i * 7 + 3) % 80),
}))

const SOURCE_DATA = [
  { name: 'Inbound',  value: 42, color: 'var(--accent)' },
  { name: 'Outbound', value: 28, color: 'var(--green)' },
  { name: 'Partner',  value: 18, color: 'var(--amber)' },
  { name: 'Renewal',  value: 12, color: 'var(--purple)' },
]

const ACTIVITY = [
  { icon: '🟢', text: 'Acme Corp deal moved to Proposal stage',       time: '2m ago' },
  { icon: '🎯', text: 'Lead jordan.kim@techco.io scored 87/100',       time: '5m ago' },
  { icon: '🚨', text: 'SLA breach warning for ticket #TK-2841',        time: '12m ago' },
  { icon: '📣', text: 'Campaign "Q4 Enterprise Push" launched',        time: '18m ago' },
  { icon: '⚠️', text: 'Churn risk: Globex Industries (score 23)',      time: '34m ago' },
]

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--surface2)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  fontSize: 12,
}

export default function DashboardPage() {
  const { data: overview, isLoading } = useAnalyticsOverview()
  const { data: revenueData } = useRevenueTrend(30)

  // Memoize derived metrics so they only recompute when overview changes
  const metrics = useMemo(() => [
    { label: 'Total Revenue',  value: formatCurrency(overview?.total_revenue ?? 4_820_000),
      delta: { value: '18.4%', up: true },  sub: 'vs last quarter',
      accentColor: 'var(--accent)',  sparkData: [320,380,350,490,470,580,610,720,690,810,780,950] },
    { label: 'Active Leads',   value: (overview?.leads_total ?? 1284).toLocaleString(),
      delta: { value: '12.1%', up: true },  sub: 'this month',
      accentColor: 'var(--green)',   sparkData: [45,60,52,78,65,88,72,95,82,110,98,125] },
    { label: 'Win Rate',       value: `${overview?.win_rate ?? 34.7}%`,
      delta: { value: '2.3%', up: false }, sub: 'vs last month',
      accentColor: 'var(--amber)',   sparkData: [28,32,30,35,34,38,36,40,35,33,37,35] },
    { label: 'Avg Deal Value', value: '$18.4K',
      delta: { value: '5.7%', up: true },  sub: 'trend up',
      accentColor: 'var(--purple)',  sparkData: [12,14,13,15,16,17,16,18,17,19,18,18] },
  ], [overview])

  // Use live revenue data from API if available, otherwise fall back to mock
  const chartData = revenueData?.data?.length ? revenueData.data : MOCK_REVENUE

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="animate-fade-in">
      <SectionHeader title="Key Performance Indicators" />

      <div className="grid grid-cols-4 gap-3 mb-5">
        {metrics.map(m => <MetricCard key={m.label} {...m} />)}
      </div>

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* Revenue trend */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text3)' }}>
              Revenue & Leads Trend
            </span>
            <div className="flex gap-3 text-xs" style={{ color: 'var(--text3)' }}>
              {[['var(--accent)', 'Revenue'], ['var(--green)', 'Leads']].map(([c, l]) => (
                <span key={l} className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-0.5 rounded" style={{ background: c }} />{l}
                </span>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false}
                     tickFormatter={v => `$${Math.round(v / 1000)}k`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
              <Area type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2}
                    fill="url(#revGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Source donut */}
        <Card>
          <div className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: 'var(--text3)' }}>
            Revenue by Source
          </div>
          <div className="flex items-center gap-3">
            <ResponsiveContainer width={100} height={100}>
              <PieChart>
                <Pie data={SOURCE_DATA} cx="50%" cy="50%" innerRadius={28} outerRadius={44}
                     dataKey="value" stroke="none">
                  {SOURCE_DATA.map((s, i) => <Cell key={i} fill={s.color} opacity={0.85} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1">
              {SOURCE_DATA.map(s => (
                <div key={s.name} className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-xs flex-1" style={{ color: 'var(--text2)' }}>{s.name}</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Pipeline + Activity */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <div className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>
            Pipeline Overview
          </div>
          <div className="flex rounded-lg overflow-hidden mb-4">
            {[['MQL','342','rgba(79,110,247,0.7)'],['SQL','218','rgba(34,214,149,0.7)'],
              ['Demo','156','rgba(245,166,35,0.7)'],['Proposal','89','rgba(155,110,247,0.7)'],
              ['Won','47','rgba(34,214,149,0.9)']].map(([stage, count, color], i, arr) => (
              <div key={stage} className="flex-1 py-2.5 px-2 text-center relative hover:opacity-90 transition-opacity"
                   style={{ background: color }}>
                <div className="text-base font-bold text-white leading-none">{count}</div>
                <div className="text-xs text-white opacity-80 mt-1">{stage}</div>
                {i < arr.length - 1 && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 text-white opacity-30 text-xs z-10">›</div>
                )}
              </div>
            ))}
          </div>
          {[['New Business','$1.2M',72,'var(--accent)'],
            ['Expansion','$480K',45,'var(--green)'],
            ['Renewal','$890K',88,'var(--purple)']].map(([label, value, pct, color]) => (
            <div key={label} className="flex items-center gap-2 mb-2">
              <div className="text-xs w-24 flex-shrink-0" style={{ color: 'var(--text2)' }}>{label}</div>
              <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--bg4, #1e2535)' }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color as string }} />
              </div>
              <div className="text-xs font-medium w-12 text-right" style={{ color: 'var(--green)' }}>{value}</div>
            </div>
          ))}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text3)' }}>
              Live Activity
            </span>
            <button className="text-xs" style={{ color: 'var(--accent2)' }}>All events →</button>
          </div>
          {ACTIVITY.map((item, i) => (
            <div key={i} className="flex gap-2.5 py-2"
                 style={{ borderBottom: i < ACTIVITY.length - 1 ? '1px solid rgba(42,51,80,0.4)' : 'none' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5"
                   style={{ background: 'var(--bg3)' }}>{item.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs leading-snug" style={{ color: 'var(--text2)' }}>{item.text}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{item.time}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>

      <SectionHeader title="AI Insights" />
      <div className="grid grid-cols-3 gap-3">
        <AIInsightCard title="Lead Intelligence"
          text="3 leads show high conversion probability (>85 score). Priya Nair from MegaCorp has 94% chance to close — recommend immediate executive engagement."
          action="Run AI assignment sweep" />
        <AIInsightCard title="Churn Prediction"
          text="12 accounts flagged at high churn risk this week. Globex Industries shows 3× normal support volume and no product usage in 14 days."
          action="Review at-risk accounts" />
        <AIInsightCard title="Revenue Forecast"
          text="Q4 committed pipeline shows $2.1M with 94% confidence. 3 large deals in negotiation could add $820K if closed before quarter end."
          action="View full forecast" />
      </div>
    </div>
  )
}
