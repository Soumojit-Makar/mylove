import { useState } from 'react'
import { MetricCard, Card, AIInsightCard, Modal } from '../../components/ui'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'

const TT = { backgroundColor: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }

const INIT_CAMPAIGNS = [
  { id: 1, name: 'Q4 Enterprise Push',  type: 'Email',     sent: '12,480', open: '28.4%', status: 'Live',      badge: 'badge-green' },
  { id: 2, name: 'Re-engage Churned',   type: 'Multi',     sent: '4,220',  open: '18.1%', status: 'Running',   badge: 'badge-amber' },
  { id: 3, name: 'Product Launch v4',   type: 'Email+SMS', sent: '8,900',  open: '34.7%', status: 'Scheduled', badge: 'badge-blue' },
  { id: 4, name: 'Win-Back Series',     type: 'Email',     sent: '2,150',  open: '22.3%', status: 'Live',      badge: 'badge-green' },
  { id: 5, name: 'Webinar Invite Oct',  type: 'Email',     sent: '6,700',  open: '41.2%', status: 'Ended',     badge: 'badge-gray' },
]

const CH_DATA = [
  { channel: 'Email',   sent: 4200, converted: 2800 },
  { channel: 'SMS',     sent: 1800, converted: 900  },
  { channel: 'Push',    sent: 2400, converted: 1500 },
  { channel: 'Social',  sent: 3100, converted: 2200 },
  { channel: 'Webinar', sent: 1200, converted: 900  },
]

const TYPES = ['Email', 'SMS', 'Email+SMS', 'Multi', 'Push', 'Webinar']
const STATUSES = ['Draft', 'Scheduled', 'Live', 'Running', 'Ended']
const statusBadge: Record<string, string> = {
  Draft: 'badge-gray', Scheduled: 'badge-blue', Live: 'badge-green', Running: 'badge-amber', Ended: 'badge-gray'
}
const DEFAULT_FORM = { name: '', type: 'Email', status: 'Draft', audience: '', goal: '' }

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState(INIT_CAMPAIGNS)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) { toast.error('Campaign name is required'); return }
    setSaving(true)
    setTimeout(() => {
      const newC = {
        id: Date.now(),
        name: form.name,
        type: form.type,
        sent: '0',
        open: '—',
        status: form.status,
        badge: statusBadge[form.status] || 'badge-gray',
      }
      setCampaigns(c => [newC, ...c])
      setSaving(false)
      setShowCreate(false)
      setForm(DEFAULT_FORM)
      toast.success(`Campaign "${form.name}" created`)
    }, 600)
  }

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-4 gap-3 mb-4">
        <MetricCard label="Campaigns Active" value={String(campaigns.filter(c => c.status === 'Live' || c.status === 'Running').length)} sub="running now" accentColor="var(--accent)" />
        <MetricCard label="Email Open Rate" value="24.8%" delta={{ value: '3.2%', up: true }} accentColor="var(--green)" />
        <MetricCard label="MQL This Month" value="342" delta={{ value: '18%', up: true }} accentColor="var(--amber)" />
        <MetricCard label="Campaign ROI" value="4.2×" sub="avg all campaigns" accentColor="var(--purple)" />
      </div>

      <AIInsightCard title="AI Optimization"
        text="Subject line A is outperforming B by 34% open rate. Recommend pausing variant B. Segment 'Enterprise Trial' converts 3× higher on Tuesday 10–11am."
        action="Auto-optimize"
        onAction={() => toast.success('Optimization queued')} />

      <div className="grid gap-4" style={{ gridTemplateColumns: '3fr 2fr' }}>
        <Card padding={false}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text3)' }}>
              Campaigns ({campaigns.length})
            </span>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              + New Campaign
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Campaign', 'Type', 'Sent', 'Open %', 'Status'].map(h => (
                <th key={h} className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wider"
                    style={{ color: 'var(--text3)', borderBottom: '1px solid var(--border)' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(42,51,80,0.4)', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,37,53,0.5)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td className="px-3 py-2.5 text-xs font-medium" style={{ color: 'var(--text)' }}>{c.name}</td>
                  <td className="px-3 py-2.5"><span className="badge badge-gray">{c.type}</span></td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text2)' }}>{c.sent}</td>
                  <td className="px-3 py-2.5 text-xs font-medium" style={{ color: 'var(--green)' }}>{c.open}</td>
                  <td className="px-3 py-2.5"><span className={`badge ${c.badge}`}>{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <div className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: 'var(--text3)' }}>Channel Performance</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={CH_DATA} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
              <XAxis dataKey="channel" tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TT} />
              <Bar dataKey="sent" fill="var(--accent)" radius={[3, 3, 0, 0]} opacity={0.8} />
              <Bar dataKey="converted" fill="var(--green)" radius={[3, 3, 0, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 text-xs mt-2" style={{ color: 'var(--text3)' }}>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ background: 'var(--accent)' }} />Sent
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ background: 'var(--green)' }} />Converted
            </span>
          </div>
        </Card>
      </div>

      {/* New Campaign Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm(DEFAULT_FORM) }}
             title="Create New Campaign" width={480}>
        <form onSubmit={handleCreate}>
          <div className="space-y-3 mb-5">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>
                Campaign Name <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="input" placeholder="e.g. Q1 Outreach Series" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="input" style={{ cursor: 'pointer' }}>
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="input" style={{ cursor: 'pointer' }}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>Target Audience</label>
              <input value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}
                className="input" placeholder="e.g. Enterprise Trial, Churned > 90d" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>Goal / KPI</label>
              <input value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
                className="input" placeholder="e.g. 25% open rate, 50 SQLs" />
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
              {saving ? 'Creating…' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
