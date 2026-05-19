import { MetricCard, Card } from '../../components/ui'
const TEAMS = [
  { team:'Enterprise Sales', lead:'Sarah Adams', attain:94, color:'var(--green)' },
  { team:'Mid-Market', lead:'Mike Reynolds', attain:78, color:'var(--accent)' },
  { team:'SDR Team', lead:'Lisa Park', attain:88, color:'var(--green)' },
  { team:'Customer Success', lead:'Tom Wilson', attain:82, color:'var(--accent)' },
  { team:'Marketing', lead:'Priya Nair', attain:91, color:'var(--green)' },
]
const ROLES = [
  { role:'Super Admin', users:2, modules:'All', level:'Full', badge:'badge-red' },
  { role:'Sales Manager', users:8, modules:'CRM, Reports', level:'Edit', badge:'badge-blue' },
  { role:'Sales Rep', users:42, modules:'Leads, Deals', level:'Edit', badge:'badge-blue' },
  { role:'Marketing', users:12, modules:'Campaigns', level:'Edit', badge:'badge-blue' },
  { role:'Support Agent', users:28, modules:'Service', level:'Edit', badge:'badge-blue' },
  { role:'Read Only', users:56, modules:'Analytics', level:'View', badge:'badge-gray' },
]
export default function HRPage() {
  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-4 gap-3 mb-4">
        <MetricCard label="Total Staff" value="148" sub="12 teams" accentColor="var(--accent)" />
        <MetricCard label="Quota Attainment" value="78.4%" sub="Team avg" accentColor="var(--green)" />
        <MetricCard label="Onboarding" value="6" sub="in progress" accentColor="var(--amber)" />
        <MetricCard label="Certifications" value="284" sub="active badges" accentColor="var(--purple)" />
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns:'1fr 1fr' }}>
        <Card>
          <div className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color:'var(--text3)' }}>Team Performance</div>
          {TEAMS.map(t=>(
            <div key={t.team} className="flex items-center gap-2 mb-3">
              <div className="w-28 flex-shrink-0">
                <div className="text-xs font-medium" style={{ color:'var(--text)' }}>{t.team}</div>
                <div className="text-xs" style={{ color:'var(--text3)' }}>{t.lead}</div>
              </div>
              <div className="flex-1 h-1.5 rounded-full" style={{ background:'var(--bg4,#1e2535)' }}>
                <div className="h-full rounded-full" style={{ width:`${t.attain}%`, background:t.color }} />
              </div>
              <div className="text-xs w-8 text-right font-medium" style={{ color:'var(--text)' }}>{t.attain}%</div>
            </div>
          ))}
        </Card>
        <Card padding={false}>
          <div className="px-4 py-3" style={{ borderBottom:'1px solid var(--border)' }}>
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color:'var(--text3)' }}>Role & Permissions (RBAC)</span>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>{['Role','Users','Modules','Level'].map(h=><th key={h} className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wider" style={{ color:'var(--text3)', borderBottom:'1px solid var(--border)' }}>{h}</th>)}</tr></thead>
            <tbody>{ROLES.map(r=>(
              <tr key={r.role} style={{ borderBottom:'1px solid rgba(42,51,80,0.4)' }}>
                <td className="px-3 py-2.5 text-xs font-medium" style={{ color:'var(--text)' }}>{r.role}</td>
                <td className="px-3 py-2.5 text-xs" style={{ color:'var(--text2)' }}>{r.users}</td>
                <td className="px-3 py-2.5 text-xs" style={{ color:'var(--text3)' }}>{r.modules}</td>
                <td className="px-3 py-2.5"><span className={`badge ${r.badge}`}>{r.level}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}
