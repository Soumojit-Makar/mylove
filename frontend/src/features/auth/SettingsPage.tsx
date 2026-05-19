import { Card, AIInsightCard } from '../../components/ui'
const CONFIG = [['Organization Name','NexusCRM Demo Corp'],['Domain','nexus.crm.io'],['Timezone','UTC +5:30 (IST)'],['Currency','USD ($)'],['Fiscal Year Start','January']]
const INTEGRATIONS = [
  { name:'Slack', status:'Connected', badge:'badge-green', icon:'💬' },
  { name:'Salesforce', status:'Syncing', badge:'badge-amber', icon:'☁️' },
  { name:'HubSpot', status:'Not connected', badge:'badge-gray', icon:'🟠' },
  { name:'Stripe Billing', status:'Connected', badge:'badge-green', icon:'💳' },
  { name:'Twilio SMS', status:'Connected', badge:'badge-green', icon:'📱' },
  { name:'Zapier', status:'Connected', badge:'badge-green', icon:'⚡' },
  { name:'Webhooks', status:'Active (12)', badge:'badge-blue', icon:'🔗' },
]
export default function SettingsPage() {
  return (
    <div className="animate-fade-in">
      <div className="grid gap-4" style={{ gridTemplateColumns:'1fr 1fr' }}>
        <div>
          <Card>
            <div className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color:'var(--text3)' }}>Platform Configuration</div>
            {CONFIG.map(([k,v])=>(
              <div key={k} className="flex justify-between py-2" style={{ borderBottom:'1px solid rgba(42,51,80,0.4)' }}>
                <span className="text-xs" style={{ color:'var(--text3)' }}>{k}</span>
                <span className="text-xs" style={{ color:'var(--text)' }}>{v}</span>
              </div>
            ))}
          </Card>
          <div className="mt-4">
            <AIInsightCard title="Enterprise Plan — Active" text="Unlimited seats · All modules · AI features · Priority support. Next billing: Nov 1, 2025 · $2,400/mo · Auto-renew ON" />
          </div>
          <Card>
            <div className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color:'var(--text3)' }}>API Access</div>
            <div className="p-3 rounded-lg text-xs" style={{ background:'var(--bg3)', fontFamily:'var(--mono)' }}>
              <div style={{ color:'var(--text3)' }}>API Key: <span style={{ color:'var(--accent2)' }}>nxcrm_live_••••••••••••••••••••</span></div>
              <div className="mt-1" style={{ color:'var(--text3)' }}>Rate limit: <span style={{ color:'var(--green)' }}>10,000 req/hr</span> · REST + SSE</div>
              <div className="mt-1" style={{ color:'var(--text3)' }}>Docs: <span style={{ color:'var(--accent2)', cursor:'pointer' }}>api.nexuscrm.io/docs</span></div>
            </div>
            <button className="mt-3 text-xs font-medium" style={{ color:'var(--amber)' }}>Regenerate API Key</button>
          </Card>
        </div>
        <Card>
          <div className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color:'var(--text3)' }}>Integrations</div>
          {INTEGRATIONS.map(i=>(
            <div key={i.name} className="flex items-center gap-2.5 py-2.5" style={{ borderBottom:'1px solid rgba(42,51,80,0.4)' }}>
              <span className="text-base w-6 text-center">{i.icon}</span>
              <span className="flex-1 text-xs" style={{ color:'var(--text)' }}>{i.name}</span>
              <span className={`badge ${i.badge}`}>{i.status}</span>
              <button className="text-xs" style={{ color:'var(--accent2)' }}>Configure</button>
            </div>
          ))}
          <div className="mt-4">
            <div className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color:'var(--text3)' }}>SaaS Subscription Plans</div>
            {[['Starter','$49/mo','5 users · Core CRM'],['Pro','$199/mo','25 users · + Automation'],['Growth','$599/mo','100 users · + Analytics'],['Enterprise','Custom','Unlimited · All modules']].map(([plan,price,desc])=>(
              <div key={plan} className="flex items-center p-2.5 rounded-lg mb-1.5 cursor-pointer transition-all"
                   style={{ background:plan==='Enterprise'?'rgba(79,110,247,0.08)':'transparent', border:`1px solid ${plan==='Enterprise'?'rgba(79,110,247,0.3)':'var(--border)'}` }}>
                <div className="flex-1">
                  <div className="text-xs font-medium" style={{ color:plan==='Enterprise'?'var(--accent2)':'var(--text)' }}>{plan}</div>
                  <div className="text-xs" style={{ color:'var(--text3)' }}>{desc}</div>
                </div>
                <div className="text-xs font-semibold" style={{ color:plan==='Enterprise'?'var(--accent2)':'var(--text2)' }}>{price}</div>
                {plan==='Enterprise' && <span className="badge badge-blue ml-2">Current</span>}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
