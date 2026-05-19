import { useState, useCallback, useDeferredValue } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useLeads, useCreateLead, useDeleteLead } from '../../hooks/useApi'
import { Card, ScoreBar, AIInsightCard, LoadingSpinner, Pagination, Modal } from '../../components/ui'
import { statusBadgeClass, formatCurrency } from '../../lib/utils'
import { Search, Plus, Upload, GitMerge, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const FILTERS = ['All Leads', 'Hot 🔥', 'Warm', 'Cold', 'Unassigned']

const MOCK_LEADS = [
  { _id: '1', contact: { name: 'Jordan Kim', email: 'jordan@techco.io', company: 'TechCo Inc', title: 'CTO' }, status: 'sql', score: 87, source: 'Organic Search', value: 45000, assigned_to: 'SA' },
  { _id: '2', contact: { name: 'Maria Santos', email: 'maria@globex.com', company: 'Globex Corp', title: 'VP Sales' }, status: 'mql', score: 72, source: 'LinkedIn Ad', value: 18000, assigned_to: 'MR' },
  { _id: '3', contact: { name: 'Alex Chen', email: 'alex@startupxyz.io', company: 'StartupXYZ', title: 'Founder' }, status: 'mql', score: 55, source: 'Webinar', value: 8000, assigned_to: 'LC' },
  { _id: '4', contact: { name: 'Priya Nair', email: 'priya@megacorp.com', company: 'MegaCorp Ltd', title: 'CIO' }, status: 'sql', score: 91, source: 'Referral', value: 120000, assigned_to: 'PK' },
  { _id: '5', contact: { name: 'Tom Williams', email: 'tom@acme.solutions', company: 'Acme Solutions', title: 'Manager' }, status: 'new', score: 38, source: 'Cold Email', value: 22000, assigned_to: 'TW' },
  { _id: '6', contact: { name: 'Lisa Park', email: 'lisa@dataflow.ai', company: 'DataFlow AI', title: 'CEO' }, status: 'mql', score: 68, source: 'Demo Request', value: 75000, assigned_to: 'SA' },
  { _id: '7', contact: { name: 'Marcus Brown', email: 'marcus@retailtech.co', company: 'RetailTech', title: 'Director' }, status: 'new', score: 29, source: 'Ad Click', value: 5000, assigned_to: null },
]

export default function LeadsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('All Leads')
  const [showCreate, setShowCreate] = useState(false)
  const qc = useQueryClient()

  // Defer search input so filtering doesn't block typing
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

  const leads = data?.items ?? MOCK_LEADS

  const handleFilterChange = useCallback((f: string) => {
    setActiveFilter(f)
    setPage(1)
  }, [])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPage(1)
  }, [])

  const scoreColor = (s: number) => s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--amber)' : 'var(--red)'
  const statusLabel = (s: string) => ({ new: 'New', mql: 'MQL', sql: 'SQL', disqualified: 'DQ' }[s] || s)

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
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: 'rgba(79,110,247,0.1)', border: '1px solid rgba(79,110,247,0.3)', color: 'var(--accent2)' }}>
            <Upload size={11} /> Import CSV
          </button>
          <button onClick={() => setShowCreate(true)}
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
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text3)' }}>
                {['Contact', 'Company', 'Status', 'Score', 'Source', 'Value', ''].map(h => (
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
                    <span className={`badge ${statusBadgeClass(lead.status)}`}>
                      {statusLabel(lead.status)}
                    </span>
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
                    <button
                      onClick={() => {
                        api.post(`/leads/${lead._id}/score`).then(() => {
                          toast.success('Re-scoring queued')
                          qc.invalidateQueries({ queryKey: ['leads'] })
                        })
                      }}
                      title="Re-score"
                      style={{ color: 'var(--text3)' }}
                      className="hover:opacity-70 transition-opacity p-1"
                    >
                      <RefreshCw size={11} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && (
          <div className="pt-3">
            <Pagination page={data.page} pages={data.pages} onPage={setPage} />
          </div>
        )}
      </Card>
    </div>
  )
}
