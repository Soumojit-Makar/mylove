import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency = 'USD'): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toString()
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date))
}

export function formatRelative(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function scoreColor(score: number): string {
  if (score >= 80) return 'var(--green)'
  if (score >= 60) return 'var(--amber)'
  return 'var(--red)'
}

export function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    active: 'badge-green', live: 'badge-green', won: 'badge-green',
    open: 'badge-amber', running: 'badge-amber', warm: 'badge-amber', in_progress: 'badge-amber',
    hot: 'badge-red', p1: 'badge-red', breached: 'badge-red',
    cold: 'badge-gray', closed: 'badge-gray', lost: 'badge-gray',
    new: 'badge-blue', draft: 'badge-blue', prospect: 'badge-blue',
    mql: 'badge-purple', sql: 'badge-purple',
  }
  return map[status?.toLowerCase()] || 'badge-gray'
}

export function initials(name: string): string {
  return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'
}

export function paginate<T>(items: T[], page: number, size: number): T[] {
  return items.slice((page - 1) * size, page * size)
}
