import { MetricCard, Card, AIInsightCard } from '../../components/ui'

const TICKETS = [
  { id:'TK-2841', subject:'Acme Corp — Login issue', priority:'P1', status:'Open', age:'2h 14m', sla:82, assigned:'Sarah A.' },
  { id:'TK-2840', subject:'DataFlow — API rate limit', priority:'P2', status:'Open', age:'45m', sla:40, assigned:'Mike R.' },
  { id:'TK-2839', subject:'MegaCorp — Export bug', priority:'P2', status:'In Progress', age:'1h 20m', sla:60, assigned:'Lisa P.' },
  { id:'TK-2838', subject:'Globex — Onboarding help', priority:'P3', status:'Open', age:'3h', sla:88, assigned:'Tom W.' },
  { id:'TK-2837', subject:'StartupXYZ — Billing Q', priority:'P3', status:'Resolved', age:'—', sla:100, assigned:'Sarah A.' },
]

const pb = (pri: string) => pri==='P1'?'badge-red':pri==='P2'?'badge-amber':'badge-gray'
const sb = (s: string) => s==='Resolved'?'badge-green':s==='In Progress'?'badge-amber':'badge-gray'
const sc = (v: number) => v>=80?'var(--green)':v>=50?'var(--amber)':'var(--red)'

export default function TicketsPage() {
  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-4 gap-3 mb-4">
        <MetricCard label="Open Tickets" value="38" sub="7 breaching SLA" accentColor="var(--red)" />
        <MetricCard label="CSAT Score" value="87.4" delta={{value:'2.1',up:true}} accentColor="var(--green)" />
        <MetricCard label="Avg Resolution" value="4.2h" sub="SLA target: 4h" accentColor="var(--amber)" />
        <MetricCard label="NPS Score" value="64" sub="Industry: 48" accentColor="var(--purple)" />
      </div>
      <Card padding={false}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom:'1px solid var(--border)' }}>
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color:'var(--text3)' }}>Live Ticket Queue</span>
          <button className="text-xs font-medium" style={{ color:'var(--accent2)' }}>+ New Ticket</button>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>{['ID','Subject','Priority','Status','Assignee','Age','SLA'].map(h=>(
            <th key={h} className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wider" style={{ color:'var(--text3)', borderBottom:'1px solid var(--border)' }}>{h}</th>
          ))}</tr></thead>
          <tbody>{TICKETS.map(t=>(
            <tr key={t.id} style={{ borderBottom:'1px solid rgba(42,51,80,0.4)', cursor:'pointer' }}
                onMouseEnter={e=>(e.currentTarget.style.background='rgba(30,37,53,0.5)')}
                onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <td className="px-3 py-2.5 text-xs font-medium" style={{ color:'var(--accent2)', fontFamily:'var(--mono)' }}>{t.id}</td>
              <td className="px-3 py-2.5 text-xs" style={{ color:'var(--text)' }}>{t.subject}</td>
              <td className="px-3 py-2.5"><span className={`badge ${pb(t.priority)}`}>{t.priority}</span></td>
              <td className="px-3 py-2.5"><span className={`badge ${sb(t.status)}`}>{t.status}</span></td>
              <td className="px-3 py-2.5 text-xs" style={{ color:'var(--text2)' }}>{t.assigned}</td>
              <td className="px-3 py-2.5 text-xs" style={{ color:t.age.includes('2h')||t.age.includes('3h')?'var(--red)':'var(--text3)' }}>{t.age}</td>
              <td className="px-3 py-2.5">
                {t.status==='Resolved'
                  ? <span className="badge badge-green">Met</span>
                  : <div className="w-16 h-1.5 rounded-full" style={{ background:'var(--bg4,#1e2535)' }}>
                      <div className="h-full rounded-full" style={{ width:`${t.sla}%`, background:sc(t.sla) }} />
                    </div>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </Card>
    </div>
  )
}
