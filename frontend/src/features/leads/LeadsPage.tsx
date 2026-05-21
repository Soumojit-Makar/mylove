import { useState, useCallback, useDeferredValue, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useLeads, useCreateLead, useDeleteLead, useUpdateLead } from '../../hooks/useApi'
import { Card, ScoreBar, AIInsightCard, LoadingSpinner, Pagination, Modal } from '../../components/ui'
import { statusBadgeClass, formatCurrency } from '../../lib/utils'
import { Search, Plus, Upload, RefreshCw, Trash2, Edit2 } from 'lucide-react'
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

const CSV_PREVIEW_COLS = ['name','email','company','title','source','status','value']

export default function LeadsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('All Leads')
  const [showCreate, setShowCreate] = useState(false)
  const [editLead, setEditLead] = useState<any>(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  // CSV import state
  const [showImport, setShowImport] = useState(false)
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [csvError, setCsvError] = useState('')
  const [importing, setImporting] = useState(false)
  const [importDone, setImportDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
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
      name: lead.contact.name, email: lead.contact.email, company: lead.contact.company,
      title: lead.contact.title || '', source: lead.source, status: lead.status,
      value: String(lead.value || ''),
    })
    setEditLead(lead); setShowCreate(true)
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
    } finally { setSaving(false) }
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

  // ── CSV Import ──────────────────────────────────────────────
  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.trim().split(/\r?\n/).filter(Boolean)
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z]/g, ''))
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = vals[i] || '' })
      return row
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.csv')) { setCsvError('Please upload a .csv file'); return }
    setCsvError(''); setCsvRows([]); setImportDone(false)
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const rows = parseCSV(text)
      if (rows.length === 0) { setCsvError('No valid rows found. Ensure CSV has a header row.'); return }
      if (!rows[0].name && !rows[0].email) {
        setCsvError('CSV must have "name" and "email" columns.')
        return
      }
      setCsvRows(rows)
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (csvRows.length === 0) return
    setImporting(true)
    let success = 0, failed = 0
    for (const row of csvRows) {
      try {
        await createLead.mutateAsync({
          name: row.name || '', email: row.email || '',
          company: row.company || '', title: row.title || '',
          source: row.source || 'Manual', status: row.status || 'new',
          value: row.value || '',
        })
        success++
      } catch { failed++ }
    }
    setImporting(false); setImportDone(true)
    qc.invalidateQueries({ queryKey: ['leads'] })
    toast.success(`Imported ${success} lead${success !== 1 ? 's' : ''}${failed ? `, ${failed} failed` : ''}`)
  }

  const closeImport = () => {
    setShowImport(false); setCsvRows([]); setCsvError(''); setImportDone(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const field = (label: string, key: keyof typeof form, type = 'text', required = false) => (
    <div>
      <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>
        {label}{required && <span style={{ color: 'var(--red)' }}> *</span>}
      </label>
      <input type={type} value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="input" placeholder={label} required={required} />
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
            onClick={() => setShowImport(true)}
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
                        style={{ color: 'var(--accent2)' }}><RefreshCw size={11} /></button>
                      <button onClick={() => openEdit(lead)} title="Edit"
                        className="p-1 rounded hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--text2)' }}><Edit2 size={11} /></button>
                      <button onClick={() => handleDelete(lead)} title="Delete"
                        className="p-1 rounded hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--red)' }}><Trash2 size={11} /></button>
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
              onChange={p => setPage(p)}
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

      {/* Import CSV Modal */}
      <Modal open={showImport} onClose={closeImport} title="Import Leads from CSV" width={600}>
        <div>
          {/* Template hint */}
          <div className="rounded-lg p-3 mb-4 text-xs" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
            <div className="font-medium mb-1" style={{ color: 'var(--text2)' }}>Expected columns (header row required):</div>
            <div className="font-mono" style={{ color: 'var(--accent2)' }}>
              name, email, company, title, source, status, value
            </div>
            <button
              className="mt-2 text-xs font-medium"
              style={{ color: 'var(--accent)' }}
              onClick={() => {
                const content = 'name,email,company,title,source,status,value\nJane Doe,jane@example.com,Acme Corp,VP Sales,Referral,mql,50000'
                const a = document.createElement('a')
                a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(content)
                a.download = 'leads_template.csv'
                a.click()
              }}>
              ↓ Download template CSV
            </button>
          </div>

          {/* File picker */}
          <div
            className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-8 mb-4 cursor-pointer transition-colors"
            style={{ borderColor: csvRows.length > 0 ? 'var(--green)' : 'var(--border)', color: 'var(--text3)' }}
            onClick={() => fileRef.current?.click()}>
            <Upload size={24} className="mb-2 opacity-50" />
            <div className="text-xs font-medium">
              {csvRows.length > 0
                ? <span style={{ color: 'var(--green)' }}>✓ {csvRows.length} rows ready to import</span>
                : 'Click to select a CSV file'}
            </div>
            {!csvRows.length && <div className="text-xs mt-1 opacity-60">or drag and drop</div>}
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          </div>

          {csvError && (
            <div className="rounded-lg p-3 mb-4 text-xs" style={{ background: 'rgba(245,80,90,0.1)', color: 'var(--red)', border: '1px solid rgba(245,80,90,0.3)' }}>
              ⚠ {csvError}
            </div>
          )}

          {/* Preview table */}
          {csvRows.length > 0 && !importDone && (
            <div className="mb-4 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <div className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--text3)', background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
                Preview — first {Math.min(csvRows.length, 3)} of {csvRows.length} rows
              </div>
              <div className="overflow-x-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{CSV_PREVIEW_COLS.map(c => (
                      <th key={c} className="text-left px-3 py-2 text-xs font-medium capitalize"
                        style={{ color: 'var(--text3)', borderBottom: '1px solid var(--border)' }}>{c}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0, 3).map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(42,51,80,0.4)' }}>
                        {CSV_PREVIEW_COLS.map(c => (
                          <td key={c} className="px-3 py-2 text-xs" style={{ color: 'var(--text2)' }}>
                            {row[c] || <span style={{ color: 'var(--text3)' }}>—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {importDone && (
            <div className="rounded-lg p-4 mb-4 text-center text-sm" style={{ background: 'rgba(34,214,149,0.08)', border: '1px solid rgba(34,214,149,0.2)', color: 'var(--green)' }}>
              ✓ Import complete!
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button onClick={closeImport}
              className="px-4 py-2 rounded-lg text-xs font-medium"
              style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
              {importDone ? 'Close' : 'Cancel'}
            </button>
            {!importDone && (
              <button onClick={handleImport} disabled={csvRows.length === 0 || importing}
                className="px-4 py-2 rounded-lg text-xs font-medium text-white"
                style={{ background: (csvRows.length === 0 || importing) ? 'var(--surface2)' : 'var(--accent)' }}>
                {importing ? `Importing… (${csvRows.length} rows)` : `Import ${csvRows.length} Lead${csvRows.length !== 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
