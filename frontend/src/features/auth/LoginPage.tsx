import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../app/store'
import { login } from './authSlice'
import { Zap } from 'lucide-react'

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { loading, error } = useAppSelector(s => s.auth)
  const [form, setForm] = useState({ email: 'sarah@nexuscrm.io', password: 'password123' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await dispatch(login(form))
    if (login.fulfilled.match(result)) navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'var(--bg)' }}>
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl"
             style={{ background: 'var(--accent)' }} />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 relative"
               style={{ background: 'var(--accent)' }}>
            <Zap size={24} color="#fff" />
            <div className="absolute inset-0 rounded-2xl opacity-20"
                 style={{ background: 'linear-gradient(135deg, #fff, transparent)' }} />
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>NexusCRM</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text3)' }}>Enterprise Edition v3.0</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6"
             style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>Sign in to your account</h2>
          <p className="text-xs mb-5" style={{ color: 'var(--text3)' }}>Enter your credentials to continue</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>Email</label>
              <input
                type="email" required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="input"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>Password</label>
              <input
                type="password" required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-xs px-3 py-2 rounded-lg"
                   style={{ background: 'rgba(245,80,90,0.1)', color: 'var(--red)', border: '1px solid rgba(245,80,90,0.2)' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
                    className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-all mt-2"
                    style={{ background: loading ? 'var(--surface2)' : 'var(--accent)' }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-4 p-3 rounded-lg text-xs" style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>
            <strong style={{ color: 'var(--text2)' }}>Demo credentials:</strong><br />
            sarah@nexuscrm.io / password123
          </div>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--text3)' }}>
          NexusCRM Enterprise · Multi-tenant SaaS Platform
        </p>
      </div>
    </div>
  )
}
