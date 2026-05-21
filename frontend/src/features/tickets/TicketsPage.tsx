import { useState } from 'react'
import { useTickets, useCreateTicket } from '../../hooks/useApi'
import { MetricCard, Card, Modal, LoadingSpinner, Pagination } from '../../components/ui'
import toast from 'react-hot-toast'
import { Plus, Search } from 'lucide-react'

const pb = (p: string) => p==='critical'?'badge-red':p==='high'?'badge-amber':p==='medium'?'badge-blue':'badge-gray'
const sb = (s: string) => s==='resolved'||s==='closed'?'badge-green':s==='pending'?'badge-amber':'badge-gray'
const priorityLabel = (p: string) => ({ critical:'P1', high:'P2', medium:'P3', low:'P4' }[p] || p.toUpperCase())

const DEFAULT_FORM = { subject: '', customer: '', priority: 'medium', description: '' }
const STATUS_FILTERS = ['All', 'open', 'pending', 'resolved', 'closed']
const PAGE_SIZE = 15

export default function TicketsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)

  const params: Record<string, unknown> = {
    page,
    page_size: PAGE_SIZE,
    ...(search && { search }),
    ...(statusFilter !== 'All' && { status: statusFilter }),
  }

  const { data, isLoading } = useTickets(params)
  const createTicket = useCreateTicket()

  const tickets = data?.items ?? []
  const allTickets = data?.items ?? []
  const open = allTickets.filter((t: any) => t.status === 'open' || t.status === 'pending').length
  const breached = allTickets.filter((t: any) => t.sla_breached).length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.subject || !form.customer) { toast.error('Subject and customer are required'); return }
    setSaving(true)
    try {
      await createTicket.mutateAsync(form)
      setShowCreate(false)
      setForm(DEFAULT_FORM)
      setPage(1)
    } finally { setSaving(false) }
  }

  const closeModal = () => { setShowCreate(false); setForm(DEFAULT_FORM) }

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-4 gap-3 mb-4">
        <MetricCard label="Open Tickets"    value={String(data?.total ?? 0)} sub={`${breached} breaching SLA`} accentColor="var(--red)" />
        <MetricCard label="CSAT Score"      value="87.4" delta={{ value: '2.1', up: true }}  accentColor="var(--green)" />
        <MetricCard label="Avg Resolution"  value="4.2h" sub="SLA target: 4h"               accentColor="var(--amber)" />
        <MetricCard label="NPS Score"       value="64"   sub="Industry avg: 48"              accentColor="var(--purple)" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <button key={f} onClick={() => { setStatusFilter(f); setPage(1) }}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize"
            style={{
              background: statusFilter === f ? 'var(--surface2)' : 'transparent',
              border: '1px solid var(--border)',
              color: statusFilter === f ? 'var(--text)' : 'var(--text3)',
            }}>
            {f}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
            <Search size={11} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search tickets..." className="bg-transparent outline-none w-28"
              style={{ color: 'var(--text)' }} />
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            <Plus size={11} /> New Ticket
          </button>
        </div>
      </div>

      <Card padding={false}>
        {isLoading ? <LoadingSpinner /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['ID', 'Subject', 'Customer', 'Priority', 'Status', 'SLA'].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text3)', borderBottom: '1px solid var(--border)' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-12 text-center text-xs" style={{ color: 'var(--text3)' }}>No tickets found</td></tr>
              ) : tickets.map((t: any, i: number) => (
                <tr key={t._id} style={{ borderBottom: '1px solid rgba(42,51,80,0.4)', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,37,53,0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td className="px-3 py-2.5 text-xs font-medium"
                    style={{ color: 'var(--accent2)', fontFamily: 'var(--mono)' }}>
                    TK-{String(2837 + ((page - 1) * PAGE_SIZE) + i + 1).padStart(4,'0')}
                  </td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text)' }}>{t.subject}</td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text2)' }}>{t.customer}</td>
                  <td className="px-3 py-2.5"><span className={`badge ${pb(t.priority)}`}>{priorityLabel(t.priority)}</span></td>
                  <td className="px-3 py-2.5"><span className={`badge ${sb(t.status)}`}>{t.status}</span></td>
                  <td className="px-3 py-2.5">
                    {t.status === 'resolved' || t.status === 'closed'
                      ? <span className="badge badge-green">Met</span>
                      : <span className="text-xs font-medium" style={{ color: t.sla_breached ? 'var(--red)' : 'var(--green)' }}>
                          {t.sla_breached ? '⚠ Breached' : '✓ On track'}
                        </span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && data.total > 0 && (
          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <Pagination
              page={data.page ?? page}
              pages={data.pages ?? 1}
              total={data.total ?? 0}
              pageSize={PAGE_SIZE}
              onChange={p => setPage(p)}
            />
          </div>
        )}
      </Card>

      <Modal open={showCreate} onClose={closeModal} title="Create Support Ticket" width={480}>
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
                {[['critical','P1 — Critical'],['high','P2 — High'],['medium','P3 — Medium'],['low','P4 — Low']].map(([v,l]) => (
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
            <button type="button" onClick={closeModal}
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
