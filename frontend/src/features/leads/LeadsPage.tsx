import { useState, useCallback, useDeferredValue } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useLeads, useCreateLead, useDeleteLead, useUpdateLead } from '../../hooks/useApi'
import { Card, ScoreBar, AIInsightCard, LoadingSpinner, Pagination, Modal } from '../../components/ui'
import { statusBadgeClass, formatCurrency } from '../../lib/utils'
import { Search, Plus, Upload, RefreshCw, Trash2, Edit2, X } from 'lucide-react'
import toast from 'react-hot-toast'

const FILTERS = ['All Leads', 'Hot 🔥', 'Warm', 'Cold', 'Unassigned']
const SOURCES = ['Organic Search', 'LinkedIn Ad', 'Referral', 'Webinar', 'Demo Request', 'Cold Email', 'Partner', 'Ad Click', 'Manual']
const STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'mql', label: 'MQL' },
  { value: 'sql', label: 'SQL' },
  { value: 'disqualified', label: 'Disqualified' },
]

const DEFAULT_FORM = { name: '', email: '', company: '', title: '', source: 'Manual', status: 'new', value: '' }

export default function LeadsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('All Leads')
  const [showCreate, setShowCreate] = useState(false)
  const [editLead, setEditLead] = useState<any>(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const qc = useQueryClient()

  const deferredSearch = useDeferredValue(search)

  const statusFilter: Record<string, string | undefined> = {
    'Hot 🔥': 'sql', Warm: 'mql', Cold: 'new', Unassigned: undefined,
  }

  const params: Record<string, unknown> = {
    page,
    page_size: 20,
    ...(deferredSearch && { search: deferredSearch }),
    ...(activeFilter !== 'All Leads' && activeFilter !== 'Unassigned' && { status: statusFilter[activeFilter] }),
    ...(activeFilter === 'Unassigned' && { assigned_to: 'null' }),
  }

  const { data, isLoading } = useLeads(params)
  const createLead = useCreateLead()
  const deleteLead = useDeleteLead()
  const updateLead = useUpdateLead()

  const leads = data?.items ?? []

  const handleFilterChange = useCallback((f: string) => { setActiveFilter(f); setPage(1) }, [])
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1) }, [])

  const scoreColor = (s: number) => s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--amber)' : 'var(--red)'
  const statusLabel = (s: string) => ({ new: 'New', mql: 'MQL', sql: 'SQL', disqualified: 'DQ' }[s] || s)

  const openCreate = () => { setForm(DEFAULT_FORM); setEditLead(null); setShowCreate(true) }
  const openEdit = (lead: any) => {
    setForm({
      name: lead.contact.name,
      email: lead.contact.email,
      company: lead.contact.company,
      title: lead.contact.title || '',
      source: lead.source,
      status: lead.status,
      value: String(lead.value || ''),
    })
    setEditLead(lead)
    setShowCreate(true)
  }
  const closeModal = () => { setShowCreate(false); setEditLead(null); setForm(DEFAULT_FORM) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.company) { toast.error('Name, email, and company are required'); return }
    setSaving(true)
    try {
      if (editLead) {
        await updateLead.mutateAsync({ id: editLead._id, data: {
          contact: { name: form.name, email: form.email, company: form.company, title: form.title },
          status: form.status, source: form.source, value: Number(form.value) || 0,
        }})
        toast.success('Lead updated')
      } else {
        await createLead.mutateAsync(form)
      }
      closeModal()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (lead: any) => {
    if (!confirm(`Delete lead "${lead.contact.name}"?`)) return
    deleteLead.mutate(lead._id)
  }

  const handleRescore = (lead: any) => {
    api.post(`/leads/${lead._id}/score`).then(() => {
      toast.success('Re-scoring queued')
      qc.invalidateQueries({ queryKey: ['leads'] })
    })
  }

  const field = (label: string, key: keyof typeof form, type = 'text', required = false) => (
    <div>
      <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>
        {label}{required && <span style={{ color: 'var(--red)' }}> *</span>}
      </label>
      <input
        type={type} value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="input" placeholder={label}
        required={required}
      />
    </div>
  )

  return (
    <div className="animate-fade-in">
      <AIInsightCard
        title="AI Lead Intelligence"
        text="3 leads show high conversion probability (>85 score). Priya Nair from MegaCorp has a 94% chance to close — recommend immediate executive engagement."
        action="Run AI assignment sweep"
      />

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {FILTERS.map(f => (
          <button key={f} onClick={() => handleFilterChange(f)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: activeFilter === f ? 'var(--surface2)' : 'transparent',
              border: '1px solid var(--border)',
              color: activeFilter === f ? 'var(--text)' : 'var(--text3)',
            }}>
            {f}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
            <Search size={11} />
            <input value={search} onChange={handleSearchChange}
              placeholder="Search leads..." className="bg-transparent outline-none w-32"
              style={{ color: 'var(--text)' }} />
          </div>
          <button
            onClick={() => toast('CSV import coming soon', { icon: '📂' })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: 'rgba(79,110,247,0.1)', border: '1px solid rgba(79,110,247,0.3)', color: 'var(--accent2)' }}>
            <Upload size={11} /> Import CSV
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            <Plus size={11} /> New Lead
          </button>
        </div>
      </div>

      {/* Table */}
      <Card>
        {isLoading ? (
          <LoadingSpinner />
        ) : leads.length === 0 ? (
          <div className="py-12 text-center" style={{ color: 'var(--text3)' }}>
            <div className="text-2xl mb-2">🔍</div>
            <div className="text-sm">No leads found</div>
            <button onClick={openCreate} className="mt-3 text-xs font-medium" style={{ color: 'var(--accent)' }}>
              + Add your first lead
            </button>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text3)' }}>
                {['Contact', 'Company', 'Status', 'Score', 'Source', 'Value', 'Actions'].map(h => (
                  <th key={h} className="text-left py-2 px-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead: any) => (
                <tr key={lead._id} className="transition-colors"
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td className="py-2.5 px-3">
                    <div className="font-medium" style={{ color: 'var(--text)' }}>{lead.contact.name}</div>
                    <div style={{ color: 'var(--text3)' }}>{lead.contact.email}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div style={{ color: 'var(--text2)' }}>{lead.contact.company}</div>
                    <div style={{ color: 'var(--text3)' }}>{lead.contact.title}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`badge ${statusBadgeClass(lead.status)}`}>{statusLabel(lead.status)}</span>
                  </td>
                  <td className="py-2.5 px-3" style={{ minWidth: 80 }}>
                    <div className="flex items-center gap-2">
                      <ScoreBar score={lead.score} />
                      <span style={{ color: scoreColor(lead.score), fontWeight: 600 }}>{lead.score}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3" style={{ color: 'var(--text2)' }}>{lead.source}</td>
                  <td className="py-2.5 px-3 font-medium" style={{ color: 'var(--text)' }}>
                    {lead.value ? formatCurrency(lead.value) : '—'}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleRescore(lead)} title="Re-score AI"
                        className="p-1 rounded hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--accent2)' }}>
                        <RefreshCw size={11} />
                      </button>
                      <button onClick={() => openEdit(lead)} title="Edit"
                        className="p-1 rounded hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--text2)' }}>
                        <Edit2 size={11} />
                      </button>
                      <button onClick={() => handleDelete(lead)} title="Delete"
                        className="p-1 rounded hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--red)' }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && data.total > 0 && (
          <div className="pt-3">
            <Pagination
              page={data?.page ?? page}
              pages={data?.pages ?? 1}
              total={data?.total ?? 0}
              pageSize={20}
              onChange={setPage}
            />
          </div>
        )}
      </Card>

      {/* Create / Edit Modal */}
      <Modal open={showCreate} onClose={closeModal} title={editLead ? 'Edit Lead' : 'Add New Lead'} width={520}>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {field('Full Name', 'name', 'text', true)}
            {field('Email Address', 'email', 'email', true)}
            {field('Company', 'company', 'text', true)}
            {field('Job Title', 'title')}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>Source</label>
              <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                className="input" style={{ cursor: 'pointer' }}>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="input" style={{ cursor: 'pointer' }}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-5">
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>Estimated Value ($)</label>
            <input type="number" value={form.value} min={0}
              onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
              className="input" placeholder="0" />
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
              {saving ? 'Saving…' : editLead ? 'Save Changes' : 'Create Lead'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
