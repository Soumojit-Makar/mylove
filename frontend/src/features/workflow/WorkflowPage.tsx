import { useState } from 'react'
import { Card, AIInsightCard, Modal } from '../../components/ui'
import toast from 'react-hot-toast'

const INIT_WORKFLOWS = [
  { id: 1, name: 'Lead Score Assign',   trigger: 'Score ≥80',     runs: 2840, success: 99,  status: 'Active' },
  { id: 2, name: 'SLA Breach Escalate', trigger: 'Time >4h',      runs: 128,  success: 100, status: 'Active' },
  { id: 3, name: 'Won Deal Onboard',    trigger: 'Stage: Won',     runs: 47,   success: 100, status: 'Active' },
  { id: 4, name: 'Churn Risk Alert',    trigger: 'Health <30',     runs: 12,   success: 92,  status: 'Active' },
  { id: 5, name: 'Q4 Win-Back',         trigger: 'Tag: Churned',   runs: 890,  success: 88,  status: 'Paused' },
  { id: 6, name: 'NPS → CSAT Sync',     trigger: 'Survey done',    runs: 1204, success: 97,  status: 'Active' },
]

const TRIGGERS = [
  'Score ≥ 80', 'Score < 40', 'Stage: Won', 'Stage: Lost', 'Tag: Churned',
  'Health < 30', 'SLA Breached', 'Survey done', 'New Lead', 'Deal Created',
]
const ACTIONS = [
  'Notify via Slack', 'Send Email', 'Assign to Rep', 'Create Task',
  'Update CRM Field', 'Add Tag', 'Escalate to Manager', 'Log to Analytics',
]
const DEFAULT_FORM = { name: '', trigger: 'Score ≥ 80', action: 'Notify via Slack', description: '' }

const nodeStyle = (type: 'trigger' | 'action' | 'condition') => ({
  padding: '8px 14px', borderRadius: 8, fontSize: 11, textAlign: 'center' as const,
  cursor: 'pointer', transition: 'all 0.15s',
  background: type === 'trigger' ? 'rgba(34,214,149,0.06)' : type === 'condition' ? 'rgba(245,166,35,0.06)' : 'rgba(79,110,247,0.08)',
  border: `1px solid ${type === 'trigger' ? 'var(--green)' : type === 'condition' ? 'var(--amber)' : 'var(--accent)'}`,
  color: type === 'trigger' ? 'var(--green)' : type === 'condition' ? 'var(--amber)' : 'var(--accent2)',
})

export default function WorkflowPage() {
  const [workflows, setWorkflows] = useState(INIT_WORKFLOWS)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) { toast.error('Workflow name is required'); return }
    setSaving(true)
    setTimeout(() => {
      setWorkflows(wf => [{
        id: Date.now(), name: form.name, trigger: form.trigger,
        runs: 0, success: 100, status: 'Active',
      }, ...wf])
      setSaving(false)
      setShowCreate(false)
      setForm(DEFAULT_FORM)
      toast.success(`Workflow "${form.name}" created and activated`)
    }, 600)
  }

  const toggleStatus = (id: number) => {
    setWorkflows(wf => wf.map(w =>
      w.id === id ? { ...w, status: w.status === 'Active' ? 'Paused' : 'Active' } : w
    ))
    const wf = workflows.find(w => w.id === id)
    if (wf) toast.success(`"${wf.name}" ${wf.status === 'Active' ? 'paused' : 'activated'}`)
  }

  return (
    <div className="animate-fade-in">
      <AIInsightCard title="Workflow Engine"
        text={`${workflows.filter(w => w.status === 'Active').length} active workflows running. 3 pending approval. Today: 8,420 executions, 99.2% success rate, avg latency 94ms.`} />

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1.2fr' }}>
        <div>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text3)' }}>Lead Scoring → Auto-Assign</span>
              <span className="badge badge-green">Active</span>
            </div>
            <div className="flex flex-col items-center gap-0">
              <div style={nodeStyle('trigger')}>⚡ Trigger: Score ≥ 80</div>
              <div className="w-px h-4" style={{ background: 'var(--border2)' }} />
              <div className="grid gap-2 w-full" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="flex flex-col items-center gap-0">
                  <div style={{ ...nodeStyle('condition'), width: '100%' }}>Check Territory</div>
                  <div className="w-px h-3" style={{ background: 'var(--border2)' }} />
                  <div style={{ ...nodeStyle('action'), width: '100%' }}>Assign to Rep</div>
                </div>
                <div className="flex flex-col items-center gap-0">
                  <div style={{ ...nodeStyle('condition'), width: '100%' }}>Check Capacity</div>
                  <div className="w-px h-3" style={{ background: 'var(--border2)' }} />
                  <div style={{ ...nodeStyle('condition'), width: '100%' }}>Round-Robin</div>
                </div>
              </div>
              <div className="w-px h-4" style={{ background: 'var(--border2)' }} />
              <div style={nodeStyle('action')}>✉ Notify via Slack + Email</div>
              <div className="w-px h-4" style={{ background: 'var(--border2)' }} />
              <div style={nodeStyle('trigger')}>📊 Log to Analytics</div>
            </div>
          </Card>
        </div>

        <Card padding={false}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text3)' }}>
              All Workflows ({workflows.length})
            </span>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              + New Workflow
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Workflow', 'Trigger', 'Runs', 'Success', 'Status', ''].map(h => (
                <th key={h} className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wider"
                    style={{ color: 'var(--text3)', borderBottom: '1px solid var(--border)' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {workflows.map(w => (
                <tr key={w.id} style={{ borderBottom: '1px solid rgba(42,51,80,0.4)', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,37,53,0.5)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td className="px-3 py-2.5 text-xs font-medium" style={{ color: 'var(--text)' }}>{w.name}</td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text3)' }}>{w.trigger}</td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text2)' }}>{w.runs.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-xs font-medium" style={{ color: 'var(--green)' }}>{w.success}%</td>
                  <td className="px-3 py-2.5">
                    <span className={`badge ${w.status === 'Active' ? 'badge-green' : 'badge-amber'}`}>{w.status}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => toggleStatus(w.id)}
                      className="text-xs px-2 py-0.5 rounded hover:opacity-80 transition-opacity"
                      style={{
                        background: w.status === 'Active' ? 'rgba(245,80,90,0.1)' : 'rgba(34,214,149,0.1)',
                        color: w.status === 'Active' ? 'var(--red)' : 'var(--green)',
                        border: `1px solid ${w.status === 'Active' ? 'rgba(245,80,90,0.3)' : 'rgba(34,214,149,0.3)'}`,
                      }}>
                      {w.status === 'Active' ? 'Pause' : 'Resume'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            {[['Success rate', '94%', 94, 'var(--green)'], ['Avg latency', '94ms', 30, 'var(--accent)']].map(([l, v, p, c]) => (
              <div key={String(l)} className="flex items-center gap-2 mb-2">
                <div className="text-xs w-24" style={{ color: 'var(--text2)' }}>{l}</div>
                <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--bg4,#1e2535)' }}>
                  <div className="h-full rounded-full" style={{ width: `${p}%`, background: String(c) }} />
                </div>
                <div className="text-xs w-10 text-right" style={{ color: 'var(--text2)' }}>{v}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* New Workflow Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm(DEFAULT_FORM) }}
             title="Create New Workflow" width={460}>
        <form onSubmit={handleCreate}>
          <div className="space-y-3 mb-5">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>
                Workflow Name <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="input" placeholder="e.g. High-Score Lead Alert" required />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>Trigger Event</label>
              <select value={form.trigger} onChange={e => setForm(f => ({ ...f, trigger: e.target.value }))}
                className="input" style={{ cursor: 'pointer' }}>
                {TRIGGERS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>Action to Take</label>
              <select value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value }))}
                className="input" style={{ cursor: 'pointer' }}>
                {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>Description (optional)</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="input" placeholder="What does this workflow do?" rows={2}
                style={{ resize: 'vertical' }} />
            </div>
          </div>

          {/* Preview */}
          {form.name && (
            <div className="rounded-lg p-3 mb-4" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
              <div className="text-xs font-medium mb-2" style={{ color: 'var(--text3)' }}>Preview</div>
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span className="px-2 py-1 rounded" style={{ background: 'rgba(34,214,149,0.08)', border: '1px solid var(--green)', color: 'var(--green)' }}>
                  ⚡ {form.trigger}
                </span>
                <span style={{ color: 'var(--text3)' }}>→</span>
                <span className="px-2 py-1 rounded" style={{ background: 'rgba(79,110,247,0.08)', border: '1px solid var(--accent)', color: 'var(--accent2)' }}>
                  {form.action}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowCreate(false); setForm(DEFAULT_FORM) }}
              className="px-4 py-2 rounded-lg text-xs font-medium"
              style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-lg text-xs font-medium text-white"
              style={{ background: saving ? 'var(--surface2)' : 'var(--accent)' }}>
              {saving ? 'Creating…' : 'Create & Activate'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
