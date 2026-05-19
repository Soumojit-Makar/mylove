import { useState } from 'react'
import { useTickets, useCreateTicket } from '../../hooks/useApi'
import { MetricCard, Card, Modal, LoadingSpinner } from '../../components/ui'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'

const pb = (p: string) => p==='critical'?'badge-red':p==='high'?'badge-amber':p==='medium'?'badge-blue':'badge-gray'
const sb = (s: string) => s==='resolved'||s==='closed'?'badge-green':s==='pending'?'badge-amber':'badge-gray'
const sc = (breached: boolean) => breached ? 'var(--red)' : 'var(--green)'
const priorityLabel = (p: string) => ({ critical:'P1', high:'P2', medium:'P3', low:'P4' }[p] || p.toUpperCase())

const DEFAULT_FORM = { subject: '', customer: '', priority: 'medium', description: '' }

export default function TicketsPage() {
  const { data, isLoading } = useTickets({})
  const createTicket = useCreateTicket()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)

  const tickets = data?.items ?? []
  const open = tickets.filter((t: any) => t.status === 'open' || t.status === 'pending').length
  const breached = tickets.filter((t: any) => t.sla_breached).length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.subject || !form.customer) { toast.error('Subject and customer are required'); return }
    setSaving(true)
    try {
      await createTicket.mutateAsync(form)
      setShowCreate(false)
      setForm(DEFAULT_FORM)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-4 gap-3 mb-4">
        <MetricCard label="Open Tickets" value={String(open)} sub={`${breached} breaching SLA`} accentColor="var(--red)" />
        <MetricCard label="CSAT Score" value="87.4" delta={{ value: '2.1', up: true }} accentColor="var(--green)" />
        <MetricCard label="Avg Resolution" value="4.2h" sub="SLA target: 4h" accentColor="var(--amber)" />
        <MetricCard label="NPS Score" value="64" sub="Industry: 48" accentColor="var(--purple)" />
      </div>

      <Card padding={false}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text3)' }}>Live Ticket Queue</span>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            <Plus size={11} /> New Ticket
          </button>
        </div>

        {isLoading ? <LoadingSpinner /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['ID', 'Subject', 'Customer', 'Priority', 'Status', 'SLA'].map(h => (
                <th key={h} className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text3)', borderBottom: '1px solid var(--border)' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {tickets.map((t: any, i: number) => (
                <tr key={t._id} style={{ borderBottom: '1px solid rgba(42,51,80,0.4)', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,37,53,0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td className="px-3 py-2.5 text-xs font-medium"
                    style={{ color: 'var(--accent2)', fontFamily: 'var(--mono)' }}>
                    TK-{2837 + tickets.length - i}
                  </td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text)' }}>{t.subject}</td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text2)' }}>{t.customer}</td>
                  <td className="px-3 py-2.5"><span className={`badge ${pb(t.priority)}`}>{priorityLabel(t.priority)}</span></td>
                  <td className="px-3 py-2.5"><span className={`badge ${sb(t.status)}`}>{t.status}</span></td>
                  <td className="px-3 py-2.5">
                    {t.status === 'resolved' || t.status === 'closed'
                      ? <span className="badge badge-green">Met</span>
                      : <span className="text-xs font-medium" style={{ color: sc(t.sla_breached) }}>
                          {t.sla_breached ? '⚠ Breached' : '✓ On track'}
                        </span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm(DEFAULT_FORM) }}
        title="Create Support Ticket" width={480}>
        <form onSubmit={handleSubmit}>
          <div className="space-y-3 mb-5">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>
                Subject <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                className="input" placeholder="Describe the issue" required />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>
                Customer <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <input value={form.customer} onChange={e => setForm(f => ({ ...f, customer: e.target.value }))}
                className="input" placeholder="Company or contact name" required />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="input" style={{ cursor: 'pointer' }}>
                {[['critical','P1 - Critical'],['high','P2 - High'],['medium','P3 - Medium'],['low','P4 - Low']].map(([v,l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="input" placeholder="Additional details..." rows={3}
                style={{ resize: 'vertical' }} />
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
              {saving ? 'Creating…' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
