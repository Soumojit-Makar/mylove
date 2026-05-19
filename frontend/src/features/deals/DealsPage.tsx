import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../../lib/api'
import { MetricCard, Card, AIInsightCard, SectionHeader } from '../../components/ui'
import { formatCurrency } from '../../lib/utils'

const STAGES = ['Prospecting', 'Qualification', 'Demo', 'Proposal', 'Negotiation']

const MOCK_DEALS: Record<string, Array<{ id: string; name: string; value: number; company: string; segment: string; days: number; prob: number }>> = {
  Prospecting:  [{ id:'1', name:'Zenith Global', value:45000, company:'Zenith', segment:'Enterprise', days:3, prob:10 }, { id:'2', name:'NovaTech Solutions', value:8000, company:'NovaTech', segment:'SMB', days:1, prob:10 }],
  Qualification:[{ id:'3', name:'Acme Corp', value:120000, company:'Acme', segment:'Enterprise', days:12, prob:25 }, { id:'4', name:'DataFlow AI', value:75000, company:'DataFlow', segment:'Mid', days:8, prob:30 }],
  Demo:         [{ id:'5', name:'MegaCorp Ltd', value:240000, company:'MegaCorp', segment:'Enterprise', days:21, prob:50 }],
  Proposal:     [{ id:'6', name:'TechCo Inc', value:45000, company:'TechCo', segment:'Mid', days:15, prob:65 }, { id:'7', name:'CloudScale', value:88000, company:'CloudScale', segment:'Enterprise', days:19, prob:60 }],
  Negotiation:  [{ id:'8', name:'Globex Corp', value:180000, company:'Globex', segment:'Enterprise', days:34, prob:80 }],
}

const FORECAST_DATA = [
  { month: 'Oct', committed: 580000, best_case: 720000 },
  { month: 'Nov', committed: 720000, best_case: 890000 },
  { month: 'Dec', committed: 950000, best_case: 1200000 },
]

const TOOLTIP_STYLE = { backgroundColor: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }

export default function DealsPage() {
  const [view, setView] = useState<'kanban' | 'list'>('kanban')

  const metrics = [
    { label: 'Pipeline Value', value: '$8.4M', delta: { value: '22%', up: true }, sub: 'this quarter', accentColor: 'var(--accent)' },
    { label: 'Deals Won (MTD)', value: '47', delta: { value: '8', up: true }, sub: 'vs last month', accentColor: 'var(--green)' },
    { label: 'Avg Close Days', value: '28.4', delta: { value: '2.1d', up: false }, sub: 'slower', accentColor: 'var(--amber)' },
    { label: 'Q4 Forecast', value: '$2.1M', delta: { value: '94%', up: true }, sub: 'confidence', accentColor: 'var(--purple)' },
  ]

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-4 gap-3 mb-5">
        {metrics.map(m => <MetricCard key={m.label} {...m} />)}
      </div>

      <AIInsightCard
        title="AI Revenue Forecast"
        text="3 deals in Negotiation stage have 80%+ close probability. If all 3 close before quarter end, Q4 will exceed target by $340K. Globex Corp (180K) has been stalled for 8 days — recommend executive outreach."
        action="View AI deal insights"
      />

      {/* View toggle */}
      <div className="flex items-center justify-between mb-3">
        <SectionHeader title="Kanban Pipeline View" />
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg3)' }}>
          {(['kanban', 'list'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
                    className="px-3 py-1 rounded text-xs font-medium transition-all capitalize"
                    style={{
                      background: view === v ? 'var(--surface2)' : 'transparent',
                      color: view === v ? 'var(--text)' : 'var(--text3)',
                    }}>{v}</button>
          ))}
        </div>
      </div>

      {/* Kanban */}
      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {STAGES.map(stage => (
          <div key={stage} className="rounded-xl p-3" style={{ background: 'var(--bg3)' }}>
            <div className="flex items-center justify-between mb-3 pb-2"
                 style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-xs font-medium" style={{ color: 'var(--text2)' }}>{stage}</span>
              <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: 'var(--surface2)', color: 'var(--text3)' }}>
                {MOCK_DEALS[stage]?.length || 0}
              </span>
            </div>
            {(MOCK_DEALS[stage] || []).map(deal => (
              <div key={deal.id} className="rounded-lg p-2.5 mb-2 cursor-pointer transition-all hover:-translate-y-px"
                   style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--text)' }}>{deal.name}</div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="badge badge-gray text-xs">{deal.segment}</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--green)' }}>{formatCurrency(deal.value)}</span>
                </div>
                <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: 'var(--text3)' }}>
                  <span>Day {deal.days}</span>
                  <span>{deal.prob}%</span>
                </div>
                <div className="h-1 rounded-full" style={{ background: 'var(--bg4, #1e2535)' }}>
                  <div className="h-full rounded-full" style={{ width: `${deal.prob}%`, background: 'var(--accent)' }} />
                </div>
              </div>
            ))}
            <button className="w-full text-center py-2 text-xs transition-colors rounded-lg"
                    style={{ color: 'var(--text3)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}>
              + Add deal
            </button>
          </div>
        ))}
      </div>

      {/* Forecast chart */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text3)' }}>Revenue Forecast — Q4 2025</span>
          <div className="flex gap-3 text-xs" style={{ color: 'var(--text3)' }}>
            {[['var(--accent)','Committed'],['rgba(79,110,247,0.4)','Best Case']].map(([c,l]) => (
              <span key={l} className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-1 rounded" style={{ background: c as string }} />{l}
              </span>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={FORECAST_DATA} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false}
                   tickFormatter={v => `$${Math.round(v/1000)}k`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
            <Bar dataKey="committed" fill="var(--accent)" radius={[3,3,0,0]} opacity={0.9} />
            <Bar dataKey="best_case" fill="rgba(79,110,247,0.35)" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
