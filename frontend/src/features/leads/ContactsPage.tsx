// ContactsPage.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Card, LoadingSpinner, Pagination, Modal } from '../../components/ui'
import { Search, Plus, Mail, Phone, Building2, Briefcase, X } from 'lucide-react'
import toast from 'react-hot-toast'

const MOCK = [
  { _id:'1', name:'Jordan Kim',    email:'jordan@techco.io',     company:'TechCo Inc',   title:'CTO',      phone:'+1 415 555 0101', tags:['enterprise','hot'] },
  { _id:'2', name:'Maria Santos',  email:'maria@globex.com',     company:'Globex Corp',  title:'VP Sales', phone:'+1 212 555 0182', tags:['mid-market'] },
  { _id:'3', name:'Alex Chen',     email:'alex@startupxyz.io',   company:'StartupXYZ',   title:'Founder',  phone:'+1 650 555 0133', tags:['startup'] },
  { _id:'4', name:'Priya Nair',    email:'priya@megacorp.com',   company:'MegaCorp Ltd', title:'CIO',      phone:'+1 408 555 0144', tags:['enterprise','vip'] },
  { _id:'5', name:'Tom Williams',  email:'tom@acme.solutions',   company:'Acme Solutions',title:'Manager', phone:'+1 303 555 0155', tags:[] },
]

const DEFAULT_FORM = { name: '', email: '', company: '', title: '', phone: '' }
type Contact = typeof MOCK[0]

export default function ContactsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [viewContact, setViewContact] = useState<Contact | null>(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', page, search],
    queryFn: () => api.get('/contacts', { params: { page, search: search || undefined } }).then(r => r.data),
    placeholderData: { items: MOCK, total: 820, page: 1, pages: 41 },
  })
  const contacts: Contact[] = data?.items || MOCK

  const createContact = useMutation({
    mutationFn: (data: unknown) => api.post('/contacts', data).then(r => r.data),
    onSuccess: () => {
      toast.success('Contact created')
      qc.invalidateQueries({ queryKey: ['contacts'] })
      setShowCreate(false)
      setForm(DEFAULT_FORM)
    },
    onError: () => toast.error('Failed to create contact'),
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.company) { toast.error('Name, email and company are required'); return }
    setSaving(true)
    try { await createContact.mutateAsync(form) }
    finally { setSaving(false) }
  }

  const field = (label: string, key: keyof typeof form, type = 'text', required = false) => (
    <div>
      <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>
        {label}{required && <span style={{ color: 'var(--red)' }}> *</span>}
      </label>
      <input type={type} value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="input" placeholder={label} required={required} />
    </div>
  )

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs flex-1 max-w-xs"
             style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
          <Search size={11} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                 placeholder="Search contacts..." className="bg-transparent outline-none flex-1"
                 style={{ color: 'var(--text)' }} />
        </div>
        <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ml-auto"
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
                {contacts.map((c) => (
                  <tr key={c._id} style={{ borderBottom: '1px solid rgba(42,51,80,0.4)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,37,53,0.5)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--text)' }}>{c.name}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--accent2)' }}>{c.email}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--text2)' }}>{c.company}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--text3)' }}>{c.title}</td>
                    <td className="px-3 py-2">{c.tags.map(t => <span key={t} className="badge badge-blue mr-1">{t}</span>)}</td>
                    <td className="px-3 py-2">
                      <span className="badge badge-gray cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setViewContact(c)}>View</span>
                    </td>
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

      {/* New Contact Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm(DEFAULT_FORM) }}
             title="Add New Contact" width={500}>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {field('Full Name', 'name', 'text', true)}
            {field('Email Address', 'email', 'email', true)}
            {field('Company', 'company', 'text', true)}
            {field('Job Title', 'title')}
          </div>
          <div className="mb-5">{field('Phone Number', 'phone', 'tel')}</div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowCreate(false); setForm(DEFAULT_FORM) }}
              className="px-4 py-2 rounded-lg text-xs font-medium"
              style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-lg text-xs font-medium text-white"
              style={{ background: saving ? 'var(--surface2)' : 'var(--accent)' }}>
              {saving ? 'Saving…' : 'Create Contact'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Contact Modal */}
      <Modal open={!!viewContact} onClose={() => setViewContact(null)}
             title="Contact Details" width={460}>
        {viewContact && (
          <div>
            {/* Avatar + name */}
            <div className="flex items-center gap-4 mb-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                   style={{ width: 56, height: 56, background: 'linear-gradient(135deg, var(--accent), var(--purple))' }}>
                {viewContact.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{viewContact.name}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{viewContact.title}</div>
                <div className="flex gap-1 mt-1.5">
                  {viewContact.tags.map(t => <span key={t} className="badge badge-blue">{t}</span>)}
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3 mb-5">
              {[
                { icon: Mail, label: 'Email', value: viewContact.email },
                { icon: Phone, label: 'Phone', value: viewContact.phone },
                { icon: Building2, label: 'Company', value: viewContact.company },
                { icon: Briefcase, label: 'Title', value: viewContact.title },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 text-xs">
                  <div className="flex items-center justify-center rounded-lg flex-shrink-0"
                       style={{ width: 28, height: 28, background: 'var(--surface2)', color: 'var(--text3)' }}>
                    <Icon size={12} />
                  </div>
                  <div>
                    <div style={{ color: 'var(--text3)' }}>{label}</div>
                    <div className="font-medium mt-0.5" style={{ color: 'var(--text)' }}>{value || '—'}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setViewContact(null)}
                className="flex-1 px-4 py-2 rounded-lg text-xs font-medium"
                style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
                Close
              </button>
              <button onClick={() => { toast.success('Opening email client…'); setViewContact(null) }}
                className="flex-1 px-4 py-2 rounded-lg text-xs font-medium text-white"
                style={{ background: 'var(--accent)' }}>
                Send Email
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
