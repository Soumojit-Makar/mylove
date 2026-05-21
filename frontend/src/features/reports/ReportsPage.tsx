import { useState } from 'react'
import { Card, AIInsightCard, Modal } from '../../components/ui'
import toast from 'react-hot-toast'

const KPIS = [
  { metric: 'MRR',                    actual: '$402K',  target: '$380K', delta: '+5.8%',  up: true },
  { metric: 'ARR',                    actual: '$4.82M', target: '$4.2M', delta: '+14.8%', up: true },
  { metric: 'Churn Rate',             actual: '2.4%',   target: '3.1%',  delta: '-0.7pp', up: true },
  { metric: 'Expansion MRR',          actual: '$48K',   target: '$39K',  delta: '+23%',   up: true },
  { metric: 'Net Revenue Retention',  actual: '118%',   target: '112%',  delta: '+6pp',   up: true },
]

const SLA = [
  { team: 'Enterprise Support', val: '98.2%', pct: 98 },
  { team: 'Mid-Market',         val: '94.1%', pct: 94 },
  { team: 'SMB Tier',           val: '88.4%', pct: 88 },
  { team: 'Technical Support',  val: '96.7%', pct: 97 },
  { team: 'Billing & Account',  val: '99.1%', pct: 99 },
]

const PERIODS = ['Last 7d', 'Last 30d', 'Q4 2025', 'Custom']

const SCHEDULE_FREQS = ['Daily', 'Weekly (Monday)', 'Bi-weekly', 'Monthly']
const SCHEDULE_FORMATS = ['PDF', 'CSV', 'Both']

export default function ReportsPage() {
  const [activePeriod, setActivePeriod] = useState('Last 30d')
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({
    recipients: '', frequency: 'Weekly (Monday)', format: 'PDF', note: ''
  })
  const [scheduling, setScheduling] = useState(false)

  // ── Export PDF ──────────────────────────────────────────────
  const exportPDF = () => {
    toast.loading('Generating PDF…', { id: 'pdf' })
    setTimeout(() => {
      // Build a minimal printable HTML and trigger browser print-to-PDF
      const rows = KPIS.map(k =>
        `<tr><td>${k.metric}</td><td>${k.actual}</td><td>${k.target}</td><td style="color:${k.up?'green':'red'}">${k.delta}</td></tr>`
      ).join('')
      const slaRows = SLA.map(s =>
        `<tr><td>${s.team}</td><td>${s.val}</td></tr>`
      ).join('')
      const html = `<!DOCTYPE html><html><head><title>NexusCRM Report — ${activePeriod}</title>
      <style>body{font-family:sans-serif;padding:32px;color:#111}h1{font-size:20px;margin-bottom:4px}
      .sub{color:#666;font-size:13px;margin-bottom:24px}h2{font-size:14px;margin:20px 0 8px;color:#333}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{text-align:left;padding:6px 10px;background:#f0f0f0;border-bottom:2px solid #ddd}
      td{padding:6px 10px;border-bottom:1px solid #eee}
      </style></head><body>
      <h1>NexusCRM Revenue Report</h1><div class="sub">Period: ${activePeriod} · Generated ${new Date().toLocaleDateString()}</div>
      <h2>Revenue KPI Scorecard</h2>
      <table><thead><tr><th>Metric</th><th>Actual</th><th>Target</th><th>Delta</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <h2>SLA Compliance</h2>
      <table><thead><tr><th>Team</th><th>Compliance</th></tr></thead>
      <tbody>${slaRows}</tbody></table>
      </body></html>`
      const w = window.open('', '_blank')
      if (w) { w.document.write(html); w.document.close(); w.print() }
      toast.success('PDF ready — use your browser\'s Save as PDF', { id: 'pdf' })
    }, 800)
  }

  // ── Export CSV ──────────────────────────────────────────────
  const exportCSV = () => {
    toast.loading('Building CSV…', { id: 'csv' })
    setTimeout(() => {
      const header = 'Metric,Actual,Target,Delta\n'
      const rows = KPIS.map(k => `"${k.metric}","${k.actual}","${k.target}","${k.delta}"`).join('\n')
      const slaHeader = '\n\nTeam,Compliance\n'
      const slaRows = SLA.map(s => `"${s.team}","${s.val}"`).join('\n')
      const content = header + rows + slaHeader + slaRows
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nexuscrm_report_${activePeriod.replace(/\s/g, '_').toLowerCase()}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV downloaded', { id: 'csv' })
    }, 400)
  }

  // ── Schedule ────────────────────────────────────────────────
  const handleSchedule = (e: React.FormEvent) => {
    e.preventDefault()
    if (!scheduleForm.recipients.trim()) { toast.error('Enter at least one recipient'); return }
    setScheduling(true)
    setTimeout(() => {
      setScheduling(false)
      setShowSchedule(false)
      toast.success(`Report scheduled — ${scheduleForm.frequency} to ${scheduleForm.recipients.split(',').length} recipient(s)`)
    }, 800)
  }

  return (
    <div className="animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs" style={{ color: 'var(--text2)' }}>Period:</span>
        {PERIODS.map(l => (
          <button key={l} onClick={() => setActivePeriod(l)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: activePeriod === l ? 'var(--surface2)' : 'transparent',
              border: '1px solid var(--border)',
              color: activePeriod === l ? 'var(--text)' : 'var(--text3)',
            }}>{l}</button>
        ))}
        <div className="ml-auto flex gap-2">
          <button onClick={exportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: 'rgba(79,110,247,0.1)', border: '1px solid rgba(79,110,247,0.3)', color: 'var(--accent2)' }}>
            📥 Export PDF
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
            📊 Export CSV
          </button>
          <button onClick={() => setShowSchedule(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: 'rgba(34,214,149,0.1)', border: '1px solid rgba(34,214,149,0.3)', color: 'var(--green)' }}>
            📅 Schedule
          </button>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Card>
          <div className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: 'var(--text3)' }}>Revenue KPI Scorecard</div>
          {KPIS.map(k => (
            <div key={k.metric} className="flex items-center py-2" style={{ borderBottom: '1px solid rgba(42,51,80,0.4)' }}>
              <div className="flex-1 text-xs" style={{ color: 'var(--text2)' }}>{k.metric}</div>
              <div className="text-sm font-semibold mr-3" style={{ color: 'var(--text)' }}>{k.actual}</div>
              <div className="text-xs mr-2" style={{ color: 'var(--text3)' }}>vs {k.target}</div>
              <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                    style={{ background: k.up ? 'rgba(34,214,149,0.1)' : 'rgba(245,80,90,0.1)', color: k.up ? 'var(--green)' : 'var(--red)' }}>
                {k.delta}
              </span>
            </div>
          ))}
        </Card>
        <Card>
          <div className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: 'var(--text3)' }}>SLA Compliance by Team</div>
          {SLA.map(s => (
            <div key={s.team} className="flex items-center gap-2 mb-3">
              <div className="text-xs w-36 flex-shrink-0" style={{ color: 'var(--text2)' }}>{s.team}</div>
              <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--bg4,#1e2535)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                     style={{ width: `${s.pct}%`, background: s.pct >= 95 ? 'var(--green)' : s.pct >= 88 ? 'var(--amber)' : 'var(--red)' }} />
              </div>
              <div className="text-xs w-10 text-right" style={{ color: 'var(--text2)' }}>{s.val}</div>
            </div>
          ))}
          <AIInsightCard title="Auto Delivery" text="Next scheduled delivery: Mon 9am → 8 recipients. Last sent: Oct 21 · 9:00am" />
        </Card>
      </div>

      {/* Schedule Modal */}
      <Modal open={showSchedule} onClose={() => setShowSchedule(false)} title="Schedule Report Delivery" width={460}>
        <form onSubmit={handleSchedule}>
          <div className="space-y-3 mb-5">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>
                Recipients <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <input
                value={scheduleForm.recipients}
                onChange={e => setScheduleForm(f => ({ ...f, recipients: e.target.value }))}
                className="input" placeholder="email1@co.com, email2@co.com"
                required />
              <div className="text-xs mt-1" style={{ color: 'var(--text3)' }}>Separate multiple emails with commas</div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>Frequency</label>
              <select value={scheduleForm.frequency}
                onChange={e => setScheduleForm(f => ({ ...f, frequency: e.target.value }))}
                className="input" style={{ cursor: 'pointer' }}>
                {SCHEDULE_FREQS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>Format</label>
              <div className="flex gap-2">
                {SCHEDULE_FORMATS.map(fmt => (
                  <button key={fmt} type="button"
                    onClick={() => setScheduleForm(f => ({ ...f, format: fmt }))}
                    className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: scheduleForm.format === fmt ? 'var(--accent)' : 'var(--surface2)',
                      color: scheduleForm.format === fmt ? '#fff' : 'var(--text2)',
                      border: `1px solid ${scheduleForm.format === fmt ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>Note (optional)</label>
              <textarea value={scheduleForm.note}
                onChange={e => setScheduleForm(f => ({ ...f, note: e.target.value }))}
                className="input" placeholder="Add a message to include with the report…"
                rows={2} style={{ resize: 'vertical' }} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowSchedule(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium"
              style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
              Cancel
            </button>
            <button type="submit" disabled={scheduling}
              className="px-4 py-2 rounded-lg text-xs font-medium text-white"
              style={{ background: scheduling ? 'var(--surface2)' : 'var(--accent)' }}>
              {scheduling ? 'Scheduling…' : 'Save Schedule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
