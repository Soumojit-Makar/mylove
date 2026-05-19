import React from 'react'
import { cn, scoreColor } from '../../lib/utils'

// ─── MetricCard ───────────────────────────────────────────────
interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  delta?: { value: string; up: boolean }
  accentColor?: string
  sparkData?: number[]
}

export function MetricCard({ label, value, sub, delta, accentColor = 'var(--accent)', sparkData }: MetricCardProps) {
  const spark = sparkData ? buildSparkline(sparkData, accentColor) : null
  return (
    <div className="relative overflow-hidden rounded-xl p-4 cursor-pointer transition-transform hover:-translate-y-px"
         style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl" style={{ background: accentColor }} />
      <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--text3)' }}>{label}</div>
      <div className="text-2xl font-semibold tracking-tight leading-none" style={{ color: 'var(--text)' }}>{value}</div>
      {(sub || delta) && (
        <div className="flex items-center gap-1.5 mt-1.5">
          {delta && (
            <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium',
              delta.up ? 'text-green-400' : 'text-red-400')}
                  style={{ background: delta.up ? 'rgba(34,214,149,0.1)' : 'rgba(245,80,90,0.1)' }}>
              {delta.up ? '↑' : '↓'} {delta.value}
            </span>
          )}
          {sub && <span className="text-xs" style={{ color: 'var(--text3)' }}>{sub}</span>}
        </div>
      )}
      {spark && (
        <div className="absolute bottom-0 right-0 w-20 h-10 opacity-60"
             dangerouslySetInnerHTML={{ __html: spark }} />
      )}
    </div>
  )
}

function buildSparkline(data: number[], color: string): string {
  const w = 80, h = 40
  const max = Math.max(...data), min = Math.min(...data)
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (w - 4) + 2
    const y = h - 2 - ((v - min) / (max - min || 1)) * (h - 4)
    return `${x},${y}`
  }).join(' ')
  return `<svg width="${w}" height="${h}" style="overflow:visible"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/></svg>`
}

// ─── Badge ────────────────────────────────────────────────────
export function Badge({ label, variant = 'gray' }: { label: string; variant?: string }) {
  return <span className={`badge badge-${variant}`}>{label}</span>
}

// ─── ScoreBar ────────────────────────────────────────────────
export function ScoreBar({ score }: { score: number }) {
  const color = scoreColor(score)
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-semibold w-6" style={{ color }}>{score}</span>
      <div className="flex-1 h-1 rounded-full" style={{ background: 'var(--bg4, #1e2535)' }}>
        <div className="h-full rounded-full transition-all duration-500"
             style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  )
}

// ─── Avatar ───────────────────────────────────────────────────
export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'
  return (
    <div className="rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
         style={{ width: size, height: size, fontSize: size * 0.35,
                  background: 'linear-gradient(135deg, var(--accent), var(--purple))' }}>
      {initials}
    </div>
  )
}

// ─── SectionHeader ────────────────────────────────────────────
export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text3)' }}>{title}</span>
        <div className="flex-1 h-px" style={{ background: 'var(--border)', width: 40 }} />
      </div>
      {action}
    </div>
  )
}

// ─── Card ────────────────────────────────────────────────────
export function Card({ children, className, padding = true }: {
  children: React.ReactNode; className?: string; padding?: boolean
}) {
  return (
    <div className={cn('rounded-xl', padding && 'p-4', className)}
         style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {children}
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 opacity-30">{icon}</div>
      <div className="text-sm font-medium mb-1" style={{ color: 'var(--text2)' }}>{title}</div>
      {description && <div className="text-xs mb-4" style={{ color: 'var(--text3)' }}>{description}</div>}
      {action}
    </div>
  )
}

// ─── LoadingSpinner ───────────────────────────────────────────
export function LoadingSpinner({ size = 20 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="rounded-full border-2 border-t-transparent animate-spin"
           style={{ width: size, height: size, borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  )
}

// ─── ProgressBar ─────────────────────────────────────────────
export function ProgressBar({ value, color = 'var(--accent)', height = 5 }: {
  value: number; color?: string; height?: number
}) {
  return (
    <div className="rounded-full overflow-hidden" style={{ background: 'var(--bg4, #1e2535)', height }}>
      <div className="h-full rounded-full transition-all duration-700"
           style={{ width: `${Math.min(value, 100)}%`, background: color }} />
    </div>
  )
}

// ─── Modal ───────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 480 }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: number
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rounded-2xl shadow-2xl animate-fade-in"
           style={{ width, maxWidth: '95vw', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-5 py-4"
             style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="font-semibold" style={{ color: 'var(--text)' }}>{title}</div>
          <button onClick={onClose} className="text-lg leading-none hover:opacity-70"
                  style={{ color: 'var(--text3)' }}>✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ─── AIInsightCard ───────────────────────────────────────────
export function AIInsightCard({ title, text, action, onAction }: {
  title: string; text: string; action?: string; onAction?: () => void
}) {
  return (
    <div className="rounded-xl p-3.5 mb-3"
         style={{ background: 'linear-gradient(135deg, rgba(79,110,247,0.08), rgba(155,110,247,0.08))',
                  border: '1px solid rgba(79,110,247,0.2)' }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="w-1.5 h-1.5 rounded-full animate-pulse-slow" style={{ background: 'var(--accent)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--accent2)' }}>{title}</span>
      </div>
      <div className="text-xs leading-relaxed" style={{ color: 'var(--text2)' }}>{text}</div>
      {action && (
        <button onClick={onAction}
                className="mt-2 text-xs font-medium flex items-center gap-1 hover:opacity-80"
                style={{ color: 'var(--accent)' }}>
          {action} →
        </button>
      )}
    </div>
  )
}

// ─── Tabs ────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }: {
  tabs: string[]; active: string; onChange: (t: string) => void
}) {
  return (
    <div className="flex gap-1 p-1 rounded-lg mb-4"
         style={{ background: 'var(--bg3)' }}>
      {tabs.map(tab => (
        <button key={tab} onClick={() => onChange(tab)}
                className="flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all text-center"
                style={{
                  background: active === tab ? 'var(--surface2)' : 'transparent',
                  color: active === tab ? 'var(--text)' : 'var(--text3)',
                }}>
          {tab}
        </button>
      ))}
    </div>
  )
}

// ─── Table ───────────────────────────────────────────────────
export function Table({ headers, rows, onRowClick }: {
  headers: string[]
  rows: React.ReactNode[][]
  onRowClick?: (i: number) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} className="text-left text-xs font-medium uppercase tracking-wider px-3 py-2"
                  style={{ color: 'var(--text3)', borderBottom: '1px solid var(--border)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} onClick={() => onRowClick?.(i)}
                className="transition-colors"
                style={{ cursor: onRowClick ? 'pointer' : 'default', borderBottom: '1px solid rgba(42,51,80,0.4)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,37,53,0.5)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-xs" style={{ color: 'var(--text2)' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Pagination ──────────────────────────────────────────────
export function Pagination({ page, pages, total, pageSize, onChange }: {
  page: number; pages: number; total: number; pageSize: number; onChange: (p: number) => void
}) {
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  return (
    <div className="flex items-center justify-between mt-4 text-xs" style={{ color: 'var(--text3)' }}>
      <span>Showing {from}–{to} of {total}</span>
      <div className="flex gap-1">
        {['←', ...Array.from({ length: Math.min(pages, 5) }, (_, i) => String(i + 1)), '→'].map((p, i) => {
          const pg = p === '←' ? page - 1 : p === '→' ? page + 1 : Number(p)
          const isActive = p === String(page)
          const disabled = (p === '←' && page <= 1) || (p === '→' && page >= pages)
          return (
            <button key={i} disabled={disabled}
                    onClick={() => !disabled && onChange(pg)}
                    className="px-2 py-1 rounded text-xs font-medium transition-colors"
                    style={{
                      background: isActive ? 'var(--accent)' : 'var(--surface2)',
                      color: isActive ? '#fff' : 'var(--text2)',
                      opacity: disabled ? 0.3 : 1,
                    }}>
              {p}
            </button>
          )
        })}
      </div>
    </div>
  )
}
