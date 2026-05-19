import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { api } from '../../lib/api'
import { Card, AIInsightCard, LoadingSpinner } from '../../components/ui'
import { formatCurrency } from '../../lib/utils'

const TT = { backgroundColor:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:12 }

const FUNNEL = [
  { stage:'Visitors', count:48200, pct:100, color:'var(--accent)' },
  { stage:'Leads', count:4820, pct:10, color:'var(--green)' },
  { stage:'MQL', count:1446, pct:3, color:'var(--amber)' },
  { stage:'SQL', count:578, pct:1.2, color:'var(--purple)' },
  { stage:'Closed', count:196, pct:0.4, color:'var(--teal,#22c9d4)' },
]

const ATTRIBUTION = [
  { source:'Organic', leads:4200 }, { source:'Paid', leads:2640 }, { source:'Email', leads:1850 },
  { source:'Social', leads:1380 }, { source:'Referral', leads:1090 }, { source:'Direct', leads:780 },
]

const COHORTS = [
  { cohort:'Jan 2025', m:[100,82,74,68,62,58,54] },
  { cohort:'Feb 2025', m:[100,85,76,70,65,61,null] },
  { cohort:'Mar 2025', m:[100,88,79,72,66,null,null] },
  { cohort:'Apr 2025', m:[100,84,75,69,null,null,null] },
  { cohort:'May 2025', m:[100,86,77,null,null,null,null] },
]

export default function AnalyticsPage() {
  const { data: funnel } = useQuery({
    queryKey:['analytics','funnel'],
    queryFn:()=>api.get('/analytics/funnel').then(r=>r.data),
    placeholderData:{ funnel: FUNNEL },
  })

  return (
    <div className="animate-fade-in">
      <AIInsightCard title="Predictive AI Engine — Live" text="Churn model flagged 12 accounts at high risk this week (health <30). Lead scoring model accuracy: 91.4%. Recommended: trigger win-back campaign for Globex Industries — 68% historical recovery rate." action="Review all AI recommendations" />
      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns:'1fr 1fr' }}>
        <Card>
          <div className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color:'var(--text3)' }}>Revenue Attribution (Multi-touch)</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={ATTRIBUTION} layout="vertical" margin={{ top:0, right:4, bottom:0, left:20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} horizontal={false} />
              <XAxis type="number" tick={{ fontSize:10, fill:'var(--text3)' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="source" tick={{ fontSize:10, fill:'var(--text3)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TT} />
              <Bar dataKey="leads" fill="var(--accent)" radius={[0,3,3,0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color:'var(--text3)' }}>Conversion Funnel</div>
          {FUNNEL.map(f => (
            <div key={f.stage} className="mb-3">
              <div className="flex justify-between mb-1">
                <span className="text-xs" style={{ color:'var(--text2)' }}>{f.stage}</span>
                <span className="text-xs font-semibold" style={{ color:'var(--text)' }}>{f.count.toLocaleString()}</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background:'var(--bg4,#1e2535)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                     style={{ width:`${f.pct}%`, background:f.color, maxWidth:'100%' }} />
              </div>
            </div>
          ))}
        </Card>
      </div>
      <Card>
        <div className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color:'var(--text3)' }}>Cohort Retention Analysis</div>
        <div className="overflow-x-auto">
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>
              <th className="text-left px-3 py-2 text-xs" style={{ color:'var(--text3)', borderBottom:'1px solid var(--border)' }}>Cohort</th>
              {['M0','M1','M2','M3','M4','M5','M6'].map(m=><th key={m} className="px-3 py-2 text-xs text-center" style={{ color:'var(--text3)', borderBottom:'1px solid var(--border)' }}>{m}</th>)}
            </tr></thead>
            <tbody>{COHORTS.map(c=>(
              <tr key={c.cohort} style={{ borderBottom:'1px solid rgba(42,51,80,0.3)' }}>
                <td className="px-3 py-2 text-xs" style={{ color:'var(--text2)' }}>{c.cohort}</td>
                {c.m.map((v,i)=>(
                  <td key={i} className="px-3 py-2 text-xs text-center"
                      style={{ background:v?`rgba(79,110,247,${v!/200})`:'transparent', borderRadius:4, color:v?'var(--text)':'var(--text3)' }}>
                    {v ? `${v}%` : '—'}
                  </td>
                ))}
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
