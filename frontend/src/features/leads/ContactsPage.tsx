// ContactsPage.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Card, LoadingSpinner, Pagination } from '../../components/ui'
import { Search, Plus } from 'lucide-react'

const MOCK = [
  { _id:'1', name:'Jordan Kim', email:'jordan@techco.io', company:'TechCo Inc', title:'CTO', tags:['enterprise','hot'] },
  { _id:'2', name:'Maria Santos', email:'maria@globex.com', company:'Globex Corp', title:'VP Sales', tags:['mid-market'] },
  { _id:'3', name:'Alex Chen', email:'alex@startupxyz.io', company:'StartupXYZ', title:'Founder', tags:['startup'] },
  { _id:'4', name:'Priya Nair', email:'priya@megacorp.com', company:'MegaCorp Ltd', title:'CIO', tags:['enterprise','vip'] },
  { _id:'5', name:'Tom Williams', email:'tom@acme.solutions', company:'Acme Solutions', title:'Manager', tags:[] },
]

export default function ContactsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['contacts', page, search],
    queryFn: () => api.get('/contacts', { params: { page, search: search || undefined } }).then(r => r.data),
    placeholderData: { items: MOCK, total: 820, page: 1, pages: 41 },
  })
  const contacts = data?.items || MOCK
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs flex-1 max-w-xs"
             style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
          <Search size={11} />
          <input value={search} onChange={e => setSearch(e.target.value)}
                 placeholder="Search contacts..." className="bg-transparent outline-none flex-1"
                 style={{ color: 'var(--text)' }} />
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ml-auto"
                style={{ background: 'var(--accent)', color: '#fff' }}>
          <Plus size={11} /> New Contact
        </button>
      </div>
      <Card padding={false}>
        {isLoading ? <LoadingSpinner /> : (
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Name','Email','Company','Title','Tags','Actions'].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-medium uppercase tracking-wider"
                      style={{ color: 'var(--text3)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {contacts.map((c: typeof MOCK[0]) => (
                  <tr key={c._id} style={{ borderBottom: '1px solid rgba(42,51,80,0.4)', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,37,53,0.5)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--text)' }}>{c.name}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--accent2)' }}>{c.email}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--text2)' }}>{c.company}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--text3)' }}>{c.title}</td>
                    <td className="px-3 py-2">{c.tags.map(t => <span key={t} className="badge badge-blue mr-1">{t}</span>)}</td>
                    <td className="px-3 py-2"><span className="badge badge-gray cursor-pointer">View</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
          <Pagination page={data?.page||1} pages={data?.pages||41} total={data?.total||820} pageSize={20} onChange={setPage} />
        </div>
      </Card>
    </div>
  )
}
