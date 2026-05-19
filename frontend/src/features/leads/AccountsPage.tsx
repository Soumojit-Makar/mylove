// AccountsPage.tsx
import { Card, MetricCard, AIInsightCard } from '../../components/ui'
import { formatCurrency } from '../../lib/utils'
const ACCOUNTS = [
  { name:'Acme Corp', plan:'Enterprise', mrr:12400, health:88, nps:'Promoter', renewal:'Dec 2025' },
  { name:'MegaCorp Ltd', plan:'Enterprise', mrr:24800, health:92, nps:'Promoter', renewal:'Jan 2026' },
  { name:'Globex Industries', plan:'Growth', mrr:4200, health:28, nps:'Detractor', renewal:'Mar 2026' },
  { name:'TechCo Inc', plan:'Pro', mrr:2800, health:71, nps:'Passive', renewal:'Feb 2026' },
  { name:'DataFlow AI', plan:'Enterprise', mrr:8400, health:84, nps:'Promoter', renewal:'Nov 2025' },
]
const hc = (h: number) => h >= 80 ? 'var(--green)' : h >= 60 ? 'var(--amber)' : 'var(--red)'
export default function AccountsPage() {
  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-4 gap-3 mb-4">
        <MetricCard label="Total Accounts" value="1,842" sub="active" accentColor="var(--green)" />
        <MetricCard label="Health Score Avg" value="72.4" sub="12 at risk" accentColor="var(--accent)" />
        <MetricCard label="Churn (MTD)" value="8" delta={{value:'3',up:true}} sub="vs last month" accentColor="var(--amber)" />
        <MetricCard label="Net Promoter" value="64" delta={{value:'4 pts',up:true}} accentColor="var(--purple)" />
      </div>
      <AIInsightCard title="Churn Risk" text="Globex Industries shows critical churn signals: health score 28, 3 open P1 tickets, NPS detractor. Recommend immediate CSM escalation and executive outreach." action="View at-risk accounts" />
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Account','Plan','MRR','Health','NPS','Renewal','Actions'].map(h => (
              <th key={h} className="text-left px-3 py-2.5 text-xs font-medium uppercase tracking-wider" style={{ color:'var(--text3)', borderBottom:'1px solid var(--border)' }}>{h}</th>
            ))}</tr></thead>
            <tbody>{ACCOUNTS.map(a => (
              <tr key={a.name} style={{ borderBottom:'1px solid rgba(42,51,80,0.4)', cursor:'pointer' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='rgba(30,37,53,0.5)')}
                  onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                <td className="px-3 py-2.5 text-xs font-medium" style={{ color:'var(--text)' }}>{a.name}</td>
                <td className="px-3 py-2.5"><span className="badge badge-blue">{a.plan}</span></td>
                <td className="px-3 py-2.5 text-xs font-medium" style={{ color:'var(--green)' }}>{formatCurrency(a.mrr)}/mo</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold" style={{ color:hc(a.health) }}>{a.health}</span>
                    <div className="w-10 h-1.5 rounded-full" style={{ background:'var(--bg4,#1e2535)' }}>
                      <div className="h-full rounded-full" style={{ width:`${a.health}%`, background:hc(a.health) }} />
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5"><span className={`badge ${a.nps==='Promoter'?'badge-green':a.nps==='Detractor'?'badge-red':'badge-amber'}`}>{a.nps}</span></td>
                <td className="px-3 py-2.5 text-xs" style={{ color:'var(--text3)' }}>{a.renewal}</td>
                <td className="px-3 py-2.5"><span className="badge badge-gray cursor-pointer">View</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
