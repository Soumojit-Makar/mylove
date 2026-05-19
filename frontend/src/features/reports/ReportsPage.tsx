// ReportsPage
import { Card, AIInsightCard } from '../../components/ui'
const KPIS = [
  { metric:'MRR', actual:'$402K', target:'$380K', delta:'+5.8%', up:true },
  { metric:'ARR', actual:'$4.82M', target:'$4.2M', delta:'+14.8%', up:true },
  { metric:'Churn Rate', actual:'2.4%', target:'3.1%', delta:'-0.7pp', up:true },
  { metric:'Expansion MRR', actual:'$48K', target:'$39K', delta:'+23%', up:true },
  { metric:'Net Revenue Retention', actual:'118%', target:'112%', delta:'+6pp', up:true },
]
const SLA = [
  { team:'Enterprise Support', val:'98.2%', pct:98 },
  { team:'Mid-Market', val:'94.1%', pct:94 },
  { team:'SMB Tier', val:'88.4%', pct:88 },
  { team:'Technical Support', val:'96.7%', pct:97 },
  { team:'Billing & Account', val:'99.1%', pct:99 },
]
export function ReportsPage() {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs" style={{ color:'var(--text2)' }}>Period:</span>
        {['Last 7d','Last 30d','Q4 2025','Custom'].map((l,i)=>(
          <button key={l} className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ background:i===1?'var(--surface2)':'transparent', border:'1px solid var(--border)', color:i===1?'var(--text)':'var(--text3)' }}>{l}</button>
        ))}
        <div className="ml-auto flex gap-2">
          {[['📥 Export PDF','badge-blue'],['📊 Export CSV','badge-gray'],['📅 Schedule','badge-green']].map(([l,b])=>(
            <button key={l} className={`badge ${b} cursor-pointer`} style={{ padding:'5px 10px' }}>{l}</button>
          ))}
        </div>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns:'1fr 1fr' }}>
        <Card>
          <div className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color:'var(--text3)' }}>Revenue KPI Scorecard</div>
          {KPIS.map(k=>(
            <div key={k.metric} className="flex items-center py-2" style={{ borderBottom:'1px solid rgba(42,51,80,0.4)' }}>
              <div className="flex-1 text-xs" style={{ color:'var(--text2)' }}>{k.metric}</div>
              <div className="text-sm font-semibold mr-3" style={{ color:'var(--text)' }}>{k.actual}</div>
              <div className="text-xs mr-2" style={{ color:'var(--text3)' }}>vs {k.target}</div>
              <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                    style={{ background:k.up?'rgba(34,214,149,0.1)':'rgba(245,80,90,0.1)', color:k.up?'var(--green)':'var(--red)' }}>{k.delta}</span>
            </div>
          ))}
        </Card>
        <Card>
          <div className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color:'var(--text3)' }}>SLA Compliance by Team</div>
          {SLA.map(s=>(
            <div key={s.team} className="flex items-center gap-2 mb-3">
              <div className="text-xs w-36 flex-shrink-0" style={{ color:'var(--text2)' }}>{s.team}</div>
              <div className="flex-1 h-1.5 rounded-full" style={{ background:'var(--bg4,#1e2535)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                     style={{ width:`${s.pct}%`, background:s.pct>=95?'var(--green)':s.pct>=88?'var(--amber)':'var(--red)' }} />
              </div>
              <div className="text-xs w-10 text-right" style={{ color:'var(--text2)' }}>{s.val}</div>
            </div>
          ))}
          <AIInsightCard title="Auto Delivery" text="Next scheduled delivery: Mon 9am → 8 recipients. Last sent: Oct 21 · 9:00am" />
        </Card>
      </div>
    </div>
  )
}
export default ReportsPage
