/**
 * useEventSource — SSE hook.
 * Skips connection when no real backend is configured (VITE_API_URL not set)
 * to avoid console errors from EventSource hitting an HTML 404 page.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAppSelector } from '../app/store'
import toast from 'react-hot-toast'

const BASE_DELAY = 1_000
const MAX_DELAY  = 30_000
const HAS_REAL_BACKEND = Boolean(import.meta.env.VITE_API_URL)

export function useEventSource() {
  const { user, accessToken } = useAppSelector(s => s.auth)
  const qc        = useQueryClient()
  const esRef     = useRef<EventSource | null>(null)
  const timerRef  = useRef<ReturnType<typeof setTimeout>>()
  const delayRef  = useRef(BASE_DELAY)
  const activeRef = useRef(true)

  const invalidate = useCallback((keys: string[]) => {
    keys.forEach(k => qc.invalidateQueries({ queryKey: [k] }))
  }, [qc])

  const handleEvent = useCallback((raw: string) => {
    let msg: { event: string; data: Record<string, unknown> }
    try { msg = JSON.parse(raw) } catch { return }
    const { event, data } = msg

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

    const invalidationMap: Record<string, string[]> = {
      'lead.created':       ['leads', 'analytics'],
      'lead.score_changed': ['leads', 'analytics'],
      'deal.created':       ['deals', 'analytics'],
      'deal.stage_changed': ['deals', 'analytics'],
      'deal.won':           ['deals', 'analytics'],
      'deal.lost':          ['deals', 'analytics'],
      'ticket.created':     ['tickets'],
      'ticket.sla_breached':['tickets'],
      'account.churn_risk': ['accounts'],
    }
    const keys = invalidationMap[event]
    if (keys) invalidate(keys)
  }, [invalidate])

  useEffect(() => {
    // Don't attempt SSE without a real backend — EventSource can't add custom
    // auth headers, and hitting an HTML 404 page produces noisy console errors.
    if (!HAS_REAL_BACKEND) return
    if (!user || !accessToken) return

    activeRef.current = true

    const connect = () => {
      if (!activeRef.current) return
      const url = `/api/v1/stream/${user.tenant_id}?token=${accessToken}`
      const es = new EventSource(url)
      esRef.current = es

      es.onopen = () => { delayRef.current = BASE_DELAY }
      es.onmessage = ({ data }) => { if (data && data !== '{"event":"connected"}') handleEvent(data) }
      es.onerror = () => {
        es.close()
        if (!activeRef.current) return
        const delay = delayRef.current + Math.random() * 500
        delayRef.current = Math.min(delayRef.current * 2, MAX_DELAY)
        timerRef.current = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      activeRef.current = false
      clearTimeout(timerRef.current)
      esRef.current?.close()
    }
  }, [user?.tenant_id, accessToken, handleEvent])
}
