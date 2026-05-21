import { useState } from 'react'
import { Card, MetricCard, AIInsightCard, Modal } from '../../components/ui'
import { formatCurrency } from '../../lib/utils'
import { Building2, TrendingUp, Phone, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

const ACCOUNTS = [
  { name: 'Acme Corp',         plan: 'Enterprise', mrr: 12400, health: 88, nps: 'Promoter',  renewal: 'Dec 2025', csm: 'Sarah L.',   seats: 240, region: 'North America' },
  { name: 'MegaCorp Ltd',      plan: 'Enterprise', mrr: 24800, health: 92, nps: 'Promoter',  renewal: 'Jan 2026', csm: 'James K.',   seats: 580, region: 'EMEA' },
  { name: 'Globex Industries', plan: 'Growth',     mrr: 4200,  health: 28, nps: 'Detractor', renewal: 'Mar 2026', csm: 'Priya N.',   seats: 45,  region: 'APAC' },
  { name: 'TechCo Inc',        plan: 'Pro',        mrr: 2800,  health: 71, nps: 'Passive',   renewal: 'Feb 2026', csm: 'David M.',   seats: 30,  region: 'North America' },
  { name: 'DataFlow AI',       plan: 'Enterprise', mrr: 8400,  health: 84, nps: 'Promoter',  renewal: 'Nov 2025', csm: 'Yuki T.',    seats: 120, region: 'APAC' },
]

const hc = (h: number) => h >= 80 ? 'var(--green)' : h >= 60 ? 'var(--amber)' : 'var(--red)'

type Account = typeof ACCOUNTS[0]

export default function AccountsPage() {
  const [viewAccount, setViewAccount] = useState<Account | null>(null)

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-4 gap-3 mb-4">
        <MetricCard label="Total Accounts" value="1,842" sub="active" accentColor="var(--green)" />
        <MetricCard label="Health Score Avg" value="72.4" sub="12 at risk" accentColor="var(--accent)" />
        <MetricCard label="Churn (MTD)" value="8" delta={{ value: '3', up: true }} sub="vs last month" accentColor="var(--amber)" />
        <MetricCard label="Net Promoter" value="64" delta={{ value: '4 pts', up: true }} accentColor="var(--purple)" />
      </div>

      <AIInsightCard title="Churn Risk"
        text="Globex Industries shows critical churn signals: health score 28, 3 open P1 tickets, NPS detractor. Recommend immediate CSM escalation and executive outreach."
        action="View at-risk accounts"
        onAction={() => toast('Filtering at-risk accounts…', { icon: '⚠️' })} />

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Account', 'Plan', 'MRR', 'Health', 'NPS', 'Renewal', 'Actions'].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-xs font-medium uppercase tracking-wider"
                    style={{ color: 'var(--text3)', borderBottom: '1px solid var(--border)' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {ACCOUNTS.map(a => (
                <tr key={a.name} style={{ borderBottom: '1px solid rgba(42,51,80,0.4)', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,37,53,0.5)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td className="px-3 py-2.5 text-xs font-medium" style={{ color: 'var(--text)' }}>{a.name}</td>
                  <td className="px-3 py-2.5"><span className="badge badge-blue">{a.plan}</span></td>
                  <td className="px-3 py-2.5 text-xs font-medium" style={{ color: 'var(--green)' }}>{formatCurrency(a.mrr)}/mo</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: hc(a.health) }}>{a.health}</span>
                      <div className="w-10 h-1.5 rounded-full" style={{ background: 'var(--bg4,#1e2535)' }}>
                        <div className="h-full rounded-full" style={{ width: `${a.health}%`, background: hc(a.health) }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`badge ${a.nps === 'Promoter' ? 'badge-green' : a.nps === 'Detractor' ? 'badge-red' : 'badge-amber'}`}>
                      {a.nps}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text3)' }}>{a.renewal}</td>
                  <td className="px-3 py-2.5">
                    <span className="badge badge-gray cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setViewAccount(a)}>View</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Account Detail Modal */}
      <Modal open={!!viewAccount} onClose={() => setViewAccount(null)} title="Account Details" width={500}>
        {viewAccount && (
          <div>
            {/* Header */}
            <div className="flex items-center gap-4 mb-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ width: 52, height: 52, background: 'rgba(79,110,247,0.12)', border: '1px solid rgba(79,110,247,0.2)' }}>
                <Building2 size={22} style={{ color: 'var(--accent2)' }} />
              </div>
              <div>
                <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text)' }}>{viewAccount.name}</div>
                <div className="flex gap-2 items-center">
                  <span className="badge badge-blue">{viewAccount.plan}</span>
                  <span className={`badge ${viewAccount.nps === 'Promoter' ? 'badge-green' : viewAccount.nps === 'Detractor' ? 'badge-red' : 'badge-amber'}`}>
                    {viewAccount.nps}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Monthly Revenue', value: formatCurrency(viewAccount.mrr) + '/mo', color: 'var(--green)' },
                { label: 'Renewal Date', value: viewAccount.renewal, color: 'var(--text)' },
                { label: 'Seats', value: viewAccount.seats.toString(), color: 'var(--text)' },
                { label: 'Region', value: viewAccount.region, color: 'var(--text)' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg p-3" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                  <div className="text-xs mb-1" style={{ color: 'var(--text3)' }}>{label}</div>
                  <div className="text-sm font-semibold" style={{ color }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Health bar */}
            <div className="rounded-lg p-3 mb-4" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs" style={{ color: 'var(--text2)' }}>Health Score</span>
                <span className="text-sm font-bold" style={{ color: hc(viewAccount.health) }}>{viewAccount.health}/100</span>
              </div>
              <div className="h-2 rounded-full" style={{ background: 'var(--bg4,#1e2535)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                     style={{ width: `${viewAccount.health}%`, background: hc(viewAccount.health) }} />
              </div>
            </div>

            {/* CSM */}
            <div className="flex items-center gap-2 mb-5 text-xs">
              <span style={{ color: 'var(--text3)' }}>CSM:</span>
              <span className="font-medium" style={{ color: 'var(--text)' }}>{viewAccount.csm}</span>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setViewAccount(null)}
                className="flex-1 px-4 py-2 rounded-lg text-xs font-medium"
                style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
                Close
              </button>
              <button onClick={() => { toast.success(`Opening account for ${viewAccount.name}`); setViewAccount(null) }}
                className="flex-1 px-4 py-2 rounded-lg text-xs font-medium text-white"
                style={{ background: 'var(--accent)' }}>
                Open Full Account
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
