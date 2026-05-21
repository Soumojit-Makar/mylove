import { useState } from 'react'
import { Card, AIInsightCard, Modal } from '../../components/ui'
import toast from 'react-hot-toast'
import { Plus, Play, Pause, Zap, GitBranch, Mail, Bell, Tag, UserCheck, BarChart2, Trash2 } from 'lucide-react'

// ── Static workflow list ────────────────────────────────────────────────────
const INIT_WORKFLOWS = [
  { id: 1, name: 'Lead Score Assign',   trigger: 'Score ≥ 80',   runs: 2840, success: 99,  status: 'Active' },
  { id: 2, name: 'SLA Breach Escalate', trigger: 'Time > 4h',    runs: 128,  success: 100, status: 'Active' },
  { id: 3, name: 'Won Deal Onboard',    trigger: 'Stage: Won',   runs: 47,   success: 100, status: 'Active' },
  { id: 4, name: 'Churn Risk Alert',    trigger: 'Health < 30',  runs: 12,   success: 92,  status: 'Active' },
  { id: 5, name: 'Q4 Win-Back',         trigger: 'Tag: Churned', runs: 890,  success: 88,  status: 'Paused' },
  { id: 6, name: 'NPS → CSAT Sync',    trigger: 'Survey done',  runs: 1204, success: 97,  status: 'Active' },
]

// ── Builder config ──────────────────────────────────────────────────────────
const TRIGGERS = [
  { value: 'lead.created',          label: 'New Lead Created',       icon: '⚡' },
  { value: 'lead.score_high',       label: 'Lead Score ≥ 80',        icon: '🎯' },
  { value: 'deal.stage_changed',    label: 'Deal Stage Changed',     icon: '📋' },
  { value: 'deal.won',              label: 'Deal Won',               icon: '🏆' },
  { value: 'deal.lost',             label: 'Deal Lost',              icon: '❌' },
  { value: 'account.churn_risk',    label: 'Churn Risk Detected',    icon: '⚠️' },
  { value: 'ticket.sla_breached',   label: 'SLA Breached',           icon: '🚨' },
  { value: 'tag.added',             label: 'Tag Added to Record',    icon: '🏷️' },
  { value: 'survey.completed',      label: 'Survey Completed',       icon: '📊' },
  { value: 'manual',                label: 'Manual Trigger',         icon: '▶️' },
]

type ActionType = 'notify_slack' | 'send_email' | 'assign_rep' | 'add_tag' | 'create_task' | 'log_analytics' | 'condition' | 'wait'

interface BuilderStep {
  id: string
  type: ActionType
  label: string
  config: string
}

const ACTION_PALETTE: { type: ActionType; icon: React.ReactNode; label: string; color: string; default: string }[] = [
  { type: 'condition',    icon: <GitBranch size={12}/>,  label: 'Condition',      color: 'var(--amber)',  default: 'If score > 75' },
  { type: 'notify_slack', icon: <Bell size={12}/>,       label: 'Notify Slack',   color: 'var(--accent)', default: '#sales-alerts' },
  { type: 'send_email',   icon: <Mail size={12}/>,       label: 'Send Email',     color: 'var(--purple)', default: 'Welcome template' },
  { type: 'assign_rep',   icon: <UserCheck size={12}/>,  label: 'Assign to Rep',  color: 'var(--green)',  default: 'Round-robin' },
  { type: 'add_tag',      icon: <Tag size={12}/>,        label: 'Add Tag',        color: 'var(--cyan, #22d4d4)', default: 'hot-lead' },
  { type: 'create_task',  icon: <Plus size={12}/>,       label: 'Create Task',    color: 'var(--accent2)', default: 'Follow up in 2d' },
  { type: 'log_analytics',icon: <BarChart2 size={12}/>,  label: 'Log Analytics',  color: 'var(--text3)',  default: 'conversion_event' },
  { type: 'wait',         icon: <Zap size={12}/>,        label: 'Wait / Delay',   color: 'var(--text2)',  default: '2 hours' },
]

const DEFAULT_FORM = { name: '', trigger: 'lead.created', description: '' }

let _stepId = 0
const newStep = (type: ActionType): BuilderStep => {
  const def = ACTION_PALETTE.find(a => a.type === type)!
  return { id: `s${++_stepId}`, type, label: def.label, config: def.default }
}

// ── Node component ──────────────────────────────────────────────────────────
function WFNode({ step, onRemove, onEdit }: {
  step: BuilderStep
  onRemove: () => void
  onEdit: (config: string) => void
}) {
  const def = ACTION_PALETTE.find(a => a.type === step.type)!
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(step.config)

  return (
    <div className="flex flex-col items-center">
      <div className="w-px h-4" style={{ background: 'var(--border)' }} />
      <div className="group relative rounded-xl px-4 py-2.5 flex items-center gap-2.5 w-64 transition-all"
           style={{ background: 'var(--surface)', border: `1px solid ${step.type === 'condition' ? 'var(--amber)' : 'var(--border)'}` }}>
        {/* type icon */}
        <div className="flex-shrink-0 rounded-lg flex items-center justify-center"
             style={{ width: 26, height: 26, background: `${def.color}18`, color: def.color }}>
          {def.icon}
        </div>
        {/* content */}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium leading-tight truncate" style={{ color: 'var(--text)' }}>{step.label}</div>
          {editing ? (
            <input autoFocus value={val}
              onChange={e => setVal(e.target.value)}
              onBlur={() => { onEdit(val); setEditing(false) }}
              onKeyDown={e => { if (e.key === 'Enter') { onEdit(val); setEditing(false) } }}
              className="mt-0.5 w-full text-xs bg-transparent outline-none border-b"
              style={{ color: 'var(--accent2)', borderColor: 'var(--accent)' }} />
          ) : (
            <div className="text-xs mt-0.5 truncate cursor-text" style={{ color: 'var(--text3)' }}
                 onClick={() => setEditing(true)}>
              {step.config}
            </div>
          )}
        </div>
        {/* delete */}
        <button onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
          style={{ color: 'var(--red)' }}>
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function WorkflowPage() {
  const [workflows, setWorkflows] = useState(INIT_WORKFLOWS)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [steps, setSteps] = useState<BuilderStep[]>([])
  const [saving, setSaving] = useState(false)

  // Selected workflow for preview
  const [selectedId, setSelectedId] = useState<number>(1)
  const selected = workflows.find(w => w.id === selectedId) || workflows[0]

  const addStep = (type: ActionType) => setSteps(s => [...s, newStep(type)])
  const removeStep = (id: string) => setSteps(s => s.filter(x => x.id !== id))
  const editStep = (id: string, config: string) => setSteps(s => s.map(x => x.id === id ? { ...x, config } : x))

  const toggleStatus = (id: number) => {
    const wf = workflows.find(w => w.id === id)
    if (!wf) return
    setWorkflows(ws => ws.map(w => w.id === id
      ? { ...w, status: w.status === 'Active' ? 'Paused' : 'Active' } : w
    ))
    toast.success(`"${wf.name}" ${wf.status === 'Active' ? 'paused' : 'activated'}`)
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) { toast.error('Workflow name is required'); return }
    setSaving(true)
    const trig = TRIGGERS.find(t => t.value === form.trigger)
    setTimeout(() => {
      setWorkflows(ws => [{
        id: Date.now(), name: form.name,
        trigger: trig?.label || form.trigger,
        runs: 0, success: 100, status: 'Active',
      }, ...ws])
      setSaving(false)
      setShowCreate(false)
      setForm(DEFAULT_FORM)
      setSteps([])
      toast.success(`"${form.name}" created and activated`)
    }, 600)
  }

  const openCreate = () => {
    setForm(DEFAULT_FORM)
    setSteps([newStep('notify_slack')])
    setShowCreate(true)
  }

  const trigDef = TRIGGERS.find(t => t.value === form.trigger) || TRIGGERS[0]

  return (
    <div className="animate-fade-in">
      <AIInsightCard title="Workflow Engine"
        text={`${workflows.filter(w => w.status === 'Active').length} active workflows. Today: 8,420 executions across all flows — 99.2% success rate, avg latency 94ms.`} />

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1.4fr' }}>

        {/* ── Left: workflow list ───────────────────────────────── */}
        <Card padding={false}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text3)' }}>
              Workflows ({workflows.length})
            </span>
            <button onClick={openCreate}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              <Plus size={11} /> New Workflow
            </button>
          </div>
          <div>
            {workflows.map(w => (
              <div key={w.id} onClick={() => setSelectedId(w.id)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
                style={{
                  borderBottom: '1px solid rgba(42,51,80,0.4)',
                  background: selectedId === w.id ? 'rgba(79,110,247,0.07)' : 'transparent',
                  borderLeft: selectedId === w.id ? '2px solid var(--accent)' : '2px solid transparent',
                }}>
                {/* status dot */}
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: w.status === 'Active' ? 'var(--green)' : 'var(--amber)' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{w.name}</div>
                  <div className="text-xs truncate" style={{ color: 'var(--text3)' }}>{w.trigger}</div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-xs font-medium" style={{ color: 'var(--text2)' }}>{w.runs.toLocaleString()}</div>
                  <div className="text-xs" style={{ color: w.success >= 95 ? 'var(--green)' : 'var(--amber)' }}>{w.success}%</div>
                </div>
                <button onClick={e => { e.stopPropagation(); toggleStatus(w.id) }}
                  className="p-1.5 rounded-lg hover:opacity-80 flex-shrink-0"
                  style={{ background: w.status === 'Active' ? 'rgba(245,80,90,0.1)' : 'rgba(34,214,149,0.1)',
                           color: w.status === 'Active' ? 'var(--red)' : 'var(--green)' }}>
                  {w.status === 'Active' ? <Pause size={11}/> : <Play size={11}/>}
                </button>
              </div>
            ))}
          </div>
          {/* footer stats */}
          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            {[
              { label: 'Success rate', val: '94%', pct: 94, color: 'var(--green)' },
              { label: 'Avg latency',  val: '94ms', pct: 30, color: 'var(--accent)' },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-2 mb-2">
                <div className="text-xs w-24" style={{ color: 'var(--text2)' }}>{r.label}</div>
                <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--bg4,#1e2535)' }}>
                  <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.color }} />
                </div>
                <div className="text-xs w-10 text-right" style={{ color: 'var(--text2)' }}>{r.val}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Right: flow preview for selected ─────────────────── */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{selected.name}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>Trigger: {selected.trigger}</div>
            </div>
            <span className={`badge ${selected.status === 'Active' ? 'badge-green' : 'badge-amber'}`}>{selected.status}</span>
          </div>

          {/* Visual flow */}
          <div className="flex flex-col items-center py-2">
            {/* Trigger node */}
            <div className="rounded-xl px-4 py-3 w-64 text-center"
                 style={{ background: 'rgba(34,214,149,0.06)', border: '1px solid var(--green)' }}>
              <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--green)' }}>⚡ Trigger</div>
              <div className="text-xs" style={{ color: 'var(--text2)' }}>{selected.trigger}</div>
            </div>

            {/* Connector */}
            <div className="flex flex-col items-center">
              <div className="w-px h-4" style={{ background: 'var(--border)' }} />
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--border)' }} />
            </div>

            {/* Condition branch */}
            <div className="grid gap-3 w-full" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {[
                { label: 'Check Territory', type: 'condition' as const },
                { label: 'Check Capacity',  type: 'condition' as const },
              ].map(n => (
                <div key={n.label} className="flex flex-col items-center gap-0">
                  <div className="w-px h-3" style={{ background: 'var(--border)' }} />
                  <div className="rounded-xl px-3 py-2 w-full text-center text-xs"
                       style={{ background: 'rgba(245,166,35,0.06)', border: '1px solid var(--amber)', color: 'var(--amber)' }}>
                    <GitBranch size={10} className="inline mr-1" />{n.label}
                  </div>
                  <div className="w-px h-3" style={{ background: 'var(--border)' }} />
                  <div className="rounded-xl px-3 py-2 w-full text-center text-xs"
                       style={{ background: 'rgba(79,110,247,0.08)', border: '1px solid var(--accent)', color: 'var(--accent2)' }}>
                    <UserCheck size={10} className="inline mr-1" />Assign to Rep
                  </div>
                </div>
              ))}
            </div>

            {/* Join line */}
            <div className="w-px h-4" style={{ background: 'var(--border)' }} />
            <div className="rounded-xl px-4 py-2.5 w-64 text-center text-xs"
                 style={{ background: 'rgba(79,110,247,0.08)', border: '1px solid var(--accent)', color: 'var(--accent2)' }}>
              <Bell size={10} className="inline mr-1.5" />Notify via Slack + Email
            </div>
            <div className="w-px h-4" style={{ background: 'var(--border)' }} />
            <div className="rounded-xl px-4 py-2.5 w-64 text-center text-xs"
                 style={{ background: 'rgba(34,214,149,0.06)', border: '1px solid var(--green)', color: 'var(--green)' }}>
              <BarChart2 size={10} className="inline mr-1.5" />Log to Analytics
            </div>
          </div>

          {/* Run stats */}
          <div className="mt-4 pt-4 grid grid-cols-3 gap-3" style={{ borderTop: '1px solid var(--border)' }}>
            {[
              { label: 'Total Runs',   value: selected.runs.toLocaleString() },
              { label: 'Success Rate', value: `${selected.success}%` },
              { label: 'Status',       value: selected.status },
            ].map(s => (
              <div key={s.label} className="text-center rounded-lg py-2"
                   style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                <div className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{s.value}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Create Workflow Modal with visual builder ──────────── */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setSteps([]) }}
             title="Build New Workflow" width={620}>
        <form onSubmit={handleCreate}>
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="col-span-2">
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>
                Workflow Name <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="input" placeholder="e.g. High-Score Lead Alert" required />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>Trigger Event</label>
              <select value={form.trigger} onChange={e => setForm(f => ({ ...f, trigger: e.target.value }))}
                className="input" style={{ cursor: 'pointer' }}>
                {TRIGGERS.map(t => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Visual builder area */}
          <div className="rounded-xl mb-4 p-4" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
            <div className="text-xs font-medium mb-3" style={{ color: 'var(--text3)' }}>
              WORKFLOW STEPS — click actions below to add
            </div>

            {/* Flow canvas */}
            <div className="flex flex-col items-center min-h-16">
              {/* Trigger pill */}
              <div className="rounded-xl px-4 py-2.5 w-64 text-center text-xs"
                   style={{ background: 'rgba(34,214,149,0.06)', border: '1px solid var(--green)' }}>
                <span style={{ color: 'var(--green)' }}>{trigDef.icon} {trigDef.label}</span>
              </div>

              {/* Steps */}
              {steps.map(step => (
                <WFNode key={step.id} step={step}
                  onRemove={() => removeStep(step.id)}
                  onEdit={config => editStep(step.id, config)} />
              ))}

              {/* Drop hint */}
              <div className="w-px h-4" style={{ background: 'var(--border)' }} />
              <div className="rounded-xl px-4 py-2 text-xs border-dashed border-2 w-64 text-center"
                   style={{ borderColor: 'var(--border)', color: 'var(--text3)' }}>
                {steps.length === 0 ? '+ Add your first action below' : '+ Add another action'}
              </div>
            </div>

            {/* Action palette */}
            <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="text-xs mb-2" style={{ color: 'var(--text3)' }}>Add step:</div>
              <div className="flex flex-wrap gap-2">
                {ACTION_PALETTE.map(a => (
                  <button key={a.type} type="button" onClick={() => addStep(a.type)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                    style={{ background: `${a.color}12`, color: a.color, border: `1px solid ${a.color}30` }}>
                    {a.icon} {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowCreate(false); setSteps([]) }}
              className="px-4 py-2 rounded-lg text-xs font-medium"
              style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-lg text-xs font-medium text-white"
              style={{ background: saving ? 'var(--surface2)' : 'var(--accent)' }}>
              {saving ? 'Activating…' : `Create & Activate${steps.length ? ` (${steps.length} step${steps.length > 1 ? 's' : ''})` : ''}`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
