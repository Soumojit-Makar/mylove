import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAppSelector } from '../app/store'
import toast from 'react-hot-toast'

const BASE_DELAY = 1_000
const MAX_DELAY  = 30_000

export function useWebSocket() {
  const { user, accessToken } = useAppSelector(s => s.auth)
  const qc = useQueryClient()
  const wsRef      = useRef<WebSocket | null>(null)
  const timerRef   = useRef<ReturnType<typeof setTimeout>>()
  const delayRef   = useRef(BASE_DELAY)
  const activeRef  = useRef(true)

  const invalidate = useCallback((keys: string[]) => {
    keys.forEach(k => qc.invalidateQueries({ queryKey: [k] }))
  }, [qc])

  const handleEvent = useCallback((msg: { event: string; data: Record<string, unknown> }) => {
    const { event, data } = msg

    // ── Push notifications ──────────────────────────────────
    const toastMap: Record<string, string> = {
      'lead.created':        '🟢 New lead captured',
      'lead.score_changed':  `🎯 Lead scored ${data?.score}`,
      'deal.won':            '🏆 Deal won!',
      'deal.lost':           '❌ Deal lost',
      'ticket.sla_breached': '🚨 SLA breach alert!',
      'account.churn_risk':  '⚠️ Churn risk detected',
      'ticket.created':      '🎫 New support ticket',
    }
    const message = toastMap[event]
    if (message) {
      const urgent = event.includes('sla') || event.includes('churn') || event === 'deal.lost'
      urgent ? toast.error(message, { duration: 6000 }) : toast.success(message, { duration: 3000 })
    }

    // ── Proactive cache invalidation ────────────────────────
    // When the server pushes an event, immediately invalidate the
    // relevant React Query caches so the next render gets fresh data
    // without waiting for staleTime to expire.
    const invalidationMap: Record<string, string[]> = {
      'lead.created':        ['leads', 'analytics'],
      'lead.score_changed':  ['leads', 'analytics'],
      'deal.created':        ['deals', 'analytics'],
      'deal.stage_changed':  ['deals', 'analytics'],
      'deal.won':            ['deals', 'analytics'],
      'deal.lost':           ['deals', 'analytics'],
      'ticket.created':      ['tickets'],
      'ticket.sla_breached': ['tickets'],
      'account.churn_risk':  ['accounts'],
    }
    const keys = invalidationMap[event]
    if (keys) invalidate(keys)
  }, [invalidate])

  useEffect(() => {
    if (!user || !accessToken) return
    activeRef.current = true

    const connect = () => {
      if (!activeRef.current) return

      // On Vercel the frontend is served from a different origin than the
      // backend, so use VITE_WS_URL. Fall back to current host for local dev.
      const wsBase = import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
      const url = `${wsBase}/api/v1/notifications/ws/${user.tenant_id}?token=${accessToken}`

      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        delayRef.current = BASE_DELAY   // reset backoff on successful connect
      }

      ws.onmessage = ({ data }) => {
        try { handleEvent(JSON.parse(data)) } catch { /* ignore malformed */ }
      }

      ws.onclose = () => {
        if (!activeRef.current) return
        // Exponential backoff with jitter
        const delay = delayRef.current + Math.random() * 500
        delayRef.current = Math.min(delayRef.current * 2, MAX_DELAY)
        timerRef.current = setTimeout(connect, delay)
      }

      ws.onerror = () => ws.close()
    }

    connect()

    return () => {
      activeRef.current = false
      clearTimeout(timerRef.current)
      wsRef.current?.close()
    }
  }, [user?.tenant_id, accessToken, handleEvent])
}
