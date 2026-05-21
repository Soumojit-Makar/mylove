import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useCreateDeal } from '../../hooks/useApi'
import { MetricCard, Card, AIInsightCard, SectionHeader, Modal } from '../../components/ui'
import { formatCurrency } from '../../lib/utils'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'

const STAGES = ['Prospecting', 'Qualification', 'Demo', 'Proposal', 'Negotiation']

type Deal = { id: string; name: string; value: number; company: string; segment: string; days: number; prob: number }

const INITIAL_DEALS: Record<string, Deal[]> = {
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
const DEFAULT_FORM = { name: '', company: '', segment: 'Mid', value: '', prob: '25', stage: 'Prospecting' }

export default function DealsPage() {
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [deals, setDeals] = useState<Record<string, Deal[]>>(INITIAL_DEALS)
  const [showCreate, setShowCreate] = useState(false)
  const [targetStage, setTargetStage] = useState('Prospecting')
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const createDeal = useCreateDeal()

  let nextId = 100

  const totalPipeline = Object.values(deals).flat().reduce((s, d) => s + d.value, 0)
  const dealsWon = 47

  const metrics = [
    { label: 'Pipeline Value', value: formatCurrency(totalPipeline), delta: { value: '22%', up: true }, sub: 'this quarter', accentColor: 'var(--accent)' },
    { label: 'Deals Won (MTD)', value: String(dealsWon), delta: { value: '8', up: true }, sub: 'vs last month', accentColor: 'var(--green)' },
    { label: 'Avg Close Days', value: '28.4', delta: { value: '2.1d', up: false }, sub: 'slower', accentColor: 'var(--amber)' },
    { label: 'Q4 Forecast', value: '$2.1M', delta: { value: '94%', up: true }, sub: 'confidence', accentColor: 'var(--purple)' },
  ]

  const openAddDeal = (stage: string) => {
    setTargetStage(stage)
    setForm({ ...DEFAULT_FORM, stage })
    setShowCreate(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.company) { toast.error('Name and company are required'); return }
    setSaving(true)
    try {
      const newDeal: Deal = {
        id: String(++nextId),
        name: form.name,
        company: form.company,
        segment: form.segment,
        value: Number(form.value) || 0,
        prob: Number(form.prob) || 25,
        days: 0,
      }
      setDeals(prev => ({
        ...prev,
        [targetStage]: [newDeal, ...(prev[targetStage] || [])],
      }))
      await createDeal.mutateAsync({ ...newDeal, stage: targetStage, close_date: '', owner: 'SA' })
      toast.success(`Deal added to ${targetStage}`)
      setShowCreate(false)
      setForm(DEFAULT_FORM)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-4 gap-3 mb-5">
        {metrics.map(m => <MetricCard key={m.label} {...m} />)}
      </div>

      <AIInsightCard
        title="AI Revenue Forecast"
        text="3 deals in Negotiation stage have 80%+ close probability. If all 3 close before quarter end, Q4 will exceed target by $340K. Globex Corp ($180K) has been stalled for 8 days — recommend executive outreach."
        action="View AI deal insights"
      />

      {/* View toggle */}
      <div className="flex items-center justify-between mb-3">
        <SectionHeader title={view === 'kanban' ? 'Kanban Pipeline View' : 'List Pipeline View'} />
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
      {view === 'kanban' && (
        <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {STAGES.map(stage => (
            <div key={stage} className="rounded-xl p-3" style={{ background: 'var(--bg3)' }}>
              <div className="flex items-center justify-between mb-3 pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-xs font-medium" style={{ color: 'var(--text2)' }}>{stage}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: 'var(--surface2)', color: 'var(--text3)' }}>
                  {deals[stage]?.length || 0}
                </span>
              </div>
              {(deals[stage] || []).map(deal => (
                <div key={deal.id} className="rounded-lg p-2.5 mb-2 cursor-pointer transition-all hover:-translate-y-px"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--text)' }}>{deal.name}</div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="badge badge-gray text-xs">{deal.segment}</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--green)' }}>{formatCurrency(deal.value)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: 'var(--text3)' }}>
                    <span>{deal.days > 0 ? `Day ${deal.days}` : 'New'}</span>
                    <span>{deal.prob}%</span>
                  </div>
                  <div className="h-1 rounded-full" style={{ background: 'var(--bg4, #1e2535)' }}>
                    <div className="h-full rounded-full" style={{ width: `${deal.prob}%`, background: 'var(--accent)' }} />
                  </div>
                </div>
              ))}
              <button onClick={() => openAddDeal(stage)}
                className="w-full text-center py-2 text-xs transition-colors rounded-lg"
                style={{ color: 'var(--text3)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}>
                + Add deal
              </button>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      {view === 'list' && (
        <div className="rounded-xl mb-5 overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
                {['Deal', 'Company', 'Stage', 'Segment', 'Value', 'Probability', 'Age', 'Action'].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 font-medium" style={{ color: 'var(--text3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STAGES.flatMap(stage =>
                (deals[stage] || []).map(deal => (
                  <tr key={deal.id} className="transition-colors"
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td className="py-2.5 px-3 font-medium" style={{ color: 'var(--text)' }}>{deal.name}</td>
                    <td className="py-2.5 px-3" style={{ color: 'var(--text2)' }}>{deal.company}</td>
                    <td className="py-2.5 px-3">
                      <span className="badge badge-gray">{stage}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="badge badge-gray">{deal.segment}</span>
                    </td>
                    <td className="py-2.5 px-3 font-medium" style={{ color: 'var(--green)' }}>{formatCurrency(deal.value)}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1 rounded-full" style={{ background: 'var(--bg4, #1e2535)' }}>
                          <div className="h-full rounded-full" style={{ width: `${deal.prob}%`, background: 'var(--accent)' }} />
                        </div>
                        <span style={{ color: 'var(--text2)' }}>{deal.prob}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3" style={{ color: 'var(--text3)' }}>
                      {deal.days > 0 ? `Day ${deal.days}` : 'New'}
                    </td>
                    <td className="py-2.5 px-3">
                      <button onClick={() => openAddDeal(stage)}
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{ background: 'rgba(79,110,247,0.1)', color: 'var(--accent2)', border: '1px solid rgba(79,110,247,0.2)' }}>
                        + Add
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {STAGES.flatMap(s => deals[s] || []).length === 0 && (
            <div className="py-12 text-center text-xs" style={{ color: 'var(--text3)' }}>No deals in pipeline</div>
          )}
        </div>
      )}

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

      {/* Add Deal Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm(DEFAULT_FORM) }}
        title={`Add Deal — ${targetStage}`} width={460}>
        <form onSubmit={handleSubmit}>
          <div className="space-y-3 mb-5">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>
                Deal Name <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="input" placeholder="e.g. Acme Enterprise License" required />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>
                Company <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                className="input" placeholder="Company name" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>Segment</label>
                <select value={form.segment} onChange={e => setForm(f => ({ ...f, segment: e.target.value }))}
                  className="input" style={{ cursor: 'pointer' }}>
                  {['SMB','Mid','Enterprise'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>Stage</label>
                <select value={targetStage} onChange={e => { setTargetStage(e.target.value); setForm(f => ({ ...f, stage: e.target.value })) }}
                  className="input" style={{ cursor: 'pointer' }}>
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>Deal Value ($)</label>
                <input type="number" value={form.value} min={0}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  className="input" placeholder="0" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>Probability (%)</label>
                <input type="number" value={form.prob} min={0} max={100}
                  onChange={e => setForm(f => ({ ...f, prob: e.target.value }))}
                  className="input" placeholder="25" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowCreate(false); setForm(DEFAULT_FORM) }}
              className="px-4 py-2 rounded-lg text-xs font-medium"
              style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-lg text-xs font-medium text-white"
              style={{ background: saving ? 'var(--surface2)' : 'var(--accent)' }}>
              {saving ? 'Adding…' : 'Add Deal'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
