import { Card, AIInsightCard } from '../../components/ui'

const WORKFLOWS = [
  { name:'Lead Score Assign', trigger:'Score ≥80', runs:2840, success:99, status:'Active' },
  { name:'SLA Breach Escalate', trigger:'Time >4h', runs:128, success:100, status:'Active' },
  { name:'Won Deal Onboard', trigger:'Stage: Won', runs:47, success:100, status:'Active' },
  { name:'Churn Risk Alert', trigger:'Health <30', runs:12, success:92, status:'Active' },
  { name:'Q4 Win-Back', trigger:'Tag: Churned', runs:890, success:88, status:'Paused' },
  { name:'NPS → CSAT Sync', trigger:'Survey done', runs:1204, success:97, status:'Active' },
]

const nodeStyle = (type: 'trigger'|'action'|'condition') => ({
  padding:'8px 14px', borderRadius:8, fontSize:11, textAlign:'center' as const,
  cursor:'pointer', transition:'all 0.15s',
  background: type==='trigger' ? 'rgba(34,214,149,0.06)' : type==='condition' ? 'rgba(245,166,35,0.06)' : 'rgba(79,110,247,0.08)',
  border: `1px solid ${type==='trigger'?'var(--green)':type==='condition'?'var(--amber)':'var(--accent)'}`,
  color: type==='trigger'?'var(--green)':type==='condition'?'var(--amber)':'var(--accent2)',
})

export default function WorkflowPage() {
  return (
    <div className="animate-fade-in">
      <AIInsightCard title="Workflow Engine" text="24 active workflows running. 3 pending approval. Today: 8,420 executions, 99.2% success rate, avg latency 94ms." />
      <div className="grid gap-4" style={{ gridTemplateColumns:'1fr 1.2fr' }}>
        <div>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color:'var(--text3)' }}>Lead Scoring → Auto-Assign</span>
              <span className="badge badge-green">Active</span>
            </div>
            <div className="flex flex-col items-center gap-0">
              <div style={nodeStyle('trigger')}>⚡ Trigger: Score ≥ 80</div>
              <div className="w-px h-4" style={{ background:'var(--border2)' }} />
              <div className="grid gap-2 w-full" style={{ gridTemplateColumns:'1fr 1fr' }}>
                <div className="flex flex-col items-center gap-0">
                  <div style={{ ...nodeStyle('condition'), width:'100%' }}>Check Territory</div>
                  <div className="w-px h-3" style={{ background:'var(--border2)' }} />
                  <div style={{ ...nodeStyle('action'), width:'100%' }}>Assign to Rep</div>
                </div>
                <div className="flex flex-col items-center gap-0">
                  <div style={{ ...nodeStyle('condition'), width:'100%' }}>Check Capacity</div>
                  <div className="w-px h-3" style={{ background:'var(--border2)' }} />
                  <div style={{ ...nodeStyle('condition'), width:'100%' }}>Round-Robin</div>
                </div>
              </div>
              <div className="w-px h-4" style={{ background:'var(--border2)' }} />
              <div style={nodeStyle('action')}>✉ Notify via Slack + Email</div>
              <div className="w-px h-4" style={{ background:'var(--border2)' }} />
              <div style={nodeStyle('trigger')}>📊 Log to Analytics</div>
            </div>
          </Card>
        </div>
        <Card padding={false}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom:'1px solid var(--border)' }}>
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color:'var(--text3)' }}>All Workflows</span>
            <button className="text-xs font-medium" style={{ color:'var(--accent2)' }}>+ New Workflow</button>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>{['Workflow','Trigger','Runs','Success','Status'].map(h=><th key={h} className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wider" style={{ color:'var(--text3)', borderBottom:'1px solid var(--border)' }}>{h}</th>)}</tr></thead>
            <tbody>{WORKFLOWS.map(w=>(
              <tr key={w.name} style={{ borderBottom:'1px solid rgba(42,51,80,0.4)', cursor:'pointer' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='rgba(30,37,53,0.5)')}
                  onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                <td className="px-3 py-2.5 text-xs font-medium" style={{ color:'var(--text)' }}>{w.name}</td>
                <td className="px-3 py-2.5 text-xs" style={{ color:'var(--text3)' }}>{w.trigger}</td>
                <td className="px-3 py-2.5 text-xs" style={{ color:'var(--text2)' }}>{w.runs.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-xs font-medium" style={{ color:'var(--green)' }}>{w.success}%</td>
                <td className="px-3 py-2.5"><span className={`badge ${w.status==='Active'?'badge-green':'badge-amber'}`}>{w.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
          <div className="px-4 py-3" style={{ borderTop:'1px solid var(--border)' }}>
            {[['Success rate','94%',94,'var(--green)'],['Avg latency','94ms',30,'var(--accent)']].map(([l,v,p,c])=>(
              <div key={l} className="flex items-center gap-2 mb-2">
                <div className="text-xs w-24" style={{ color:'var(--text2)' }}>{l}</div>
                <div className="flex-1 h-1.5 rounded-full" style={{ background:'var(--bg4,#1e2535)' }}>
                  <div className="h-full rounded-full" style={{ width:`${p}%`, background:c }} />
                </div>
                <div className="text-xs w-10 text-right" style={{ color:'var(--text2)' }}>{v}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
