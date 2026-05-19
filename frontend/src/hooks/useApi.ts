// API hooks for leads, deals, analytics — optimized
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api } from '../lib/api'
import toast from 'react-hot-toast'

// ─── Leads ────────────────────────────────────────────────────
export function useLeads(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: () => api.get('/leads', { params }).then(r => r.data),
    staleTime: 30_000,
    placeholderData: keepPreviousData,   // no flash when paginating/filtering
  })
}

export function useCreateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => api.post('/leads', data).then(r => r.data),
    onSuccess: () => {
      toast.success('Lead created — AI scoring in progress')
      qc.invalidateQueries({ queryKey: ['leads'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to create lead'),
  })
}

export function useUpdateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      api.patch(`/leads/${id}`, data).then(r => r.data),
    onMutate: async ({ id, data }) => {
      // Optimistic update
      await qc.cancelQueries({ queryKey: ['lead', id] })
      const prev = qc.getQueryData(['lead', id])
      qc.setQueryData(['lead', id], (old: any) => old ? { ...old, ...(data as any) } : old)
      return { prev, id }
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(['lead', ctx.id], ctx.prev)
      toast.error('Failed to update lead')
    },
    onSettled: (_d, _e, { id }) => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['lead', id] })
    },
  })
}

export function useDeleteLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/leads/${id}`),
    onSuccess: () => {
      toast.success('Lead deleted')
      qc.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

// ─── Deals ────────────────────────────────────────────────────
export function useDeals(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['deals', params],
    queryFn: () => api.get('/deals', { params }).then(r => r.data),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}

export function useCreateDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => api.post('/deals', data).then(r => r.data),
    onSuccess: () => {
      toast.success('Deal created')
      qc.invalidateQueries({ queryKey: ['deals'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to create deal'),
  })
}

export function useUpdateDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      api.patch(`/deals/${id}`, data).then(r => r.data),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ['deal', id] })
      const prev = qc.getQueryData(['deal', id])
      qc.setQueryData(['deal', id], (old: any) => old ? { ...old, ...(data as any) } : old)
      return { prev, id }
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(['deal', ctx.id], ctx.prev)
    },
    onSettled: (_d, _e, { id }) => {
      qc.invalidateQueries({ queryKey: ['deals'] })
      qc.invalidateQueries({ queryKey: ['deal', id] })
    },
  })
}

export function useForecast() {
  return useQuery({
    queryKey: ['deals', 'forecast'],
    queryFn: () => api.get('/deals/forecast').then(r => r.data),
    staleTime: 120_000,
  })
}

// ─── Contacts ─────────────────────────────────────────────────
export function useContacts(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['contacts', params],
    queryFn: () => api.get('/contacts', { params }).then(r => r.data),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })
}

// ─── Accounts ─────────────────────────────────────────────────
export function useAccounts(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['accounts', params],
    queryFn: () => api.get('/accounts', { params }).then(r => r.data),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })
}

// ─── Campaigns ────────────────────────────────────────────────
export function useCampaigns(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['campaigns', params],
    queryFn: () => api.get('/campaigns', { params }).then(r => r.data),
    staleTime: 30_000,
  })
}

// ─── Tickets ──────────────────────────────────────────────────
export function useTickets(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['tickets', params],
    queryFn: () => api.get('/tickets', { params }).then(r => r.data),
    staleTime: 15_000,
    refetchInterval: 30_000,
    placeholderData: keepPreviousData,
  })
}

export function useCreateTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => api.post('/tickets', data).then(r => r.data),
    onSuccess: () => {
      toast.success('Ticket created')
      qc.invalidateQueries({ queryKey: ['tickets'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to create ticket'),
  })
}

// ─── Workflows ────────────────────────────────────────────────
export function useWorkflows(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['workflows', params],
    queryFn: () => api.get('/workflows', { params }).then(r => r.data),
    staleTime: 60_000,
  })
}

// ─── Analytics ────────────────────────────────────────────────
export function useAnalyticsOverview() {
  return useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => api.get('/analytics/overview').then(r => r.data),
    staleTime: 120_000,
    refetchInterval: 180_000,    // reduced from 120s to 3min — server caches 5min anyway
  })
}

export function useRevenueTrend(period = 30) {
  return useQuery({
    queryKey: ['analytics', 'revenue', period],
    queryFn: () => api.get('/analytics/revenue', { params: { period } }).then(r => r.data),
    staleTime: 600_000,
  })
}

export function useCohorts() {
  return useQuery({
    queryKey: ['analytics', 'cohorts'],
    queryFn: () => api.get('/analytics/cohorts').then(r => r.data),
    staleTime: 3_600_000,   // 1 hr — matches server TTL
  })
}

export function useAttribution() {
  return useQuery({
    queryKey: ['analytics', 'attribution'],
    queryFn: () => api.get('/analytics/attribution').then(r => r.data),
    staleTime: 600_000,
  })
}

// ─── Notifications ────────────────────────────────────────────
export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: ['notifications', unreadOnly],
    queryFn: () => api.get('/notifications', { params: { unread_only: unreadOnly } }).then(r => r.data),
    staleTime: 10_000,
    refetchInterval: 30_000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    // Optimistic update — mark read immediately in UI
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ['notifications'] })
      qc.setQueriesData({ queryKey: ['notifications'] }, (old: any) => {
        if (!old?.items) return old
        return { ...old, items: old.items.map((n: any) => n._id === id ? { ...n, read: true } : n) }
      })
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

// ─── HR ───────────────────────────────────────────────────────
export function useStaff() {
  return useQuery({
    queryKey: ['hr', 'staff'],
    queryFn: () => api.get('/hr/staff').then(r => r.data),
    staleTime: 120_000,
  })
}

export function useTeamKPIs() {
  return useQuery({
    queryKey: ['hr', 'kpis'],
    queryFn: () => api.get('/hr/kpis').then(r => r.data),
    staleTime: 300_000,
  })
}

// ─── Reports ──────────────────────────────────────────────────
export function useReports() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: () => api.get('/reports').then(r => r.data),
    staleTime: 60_000,
  })
}

export function useGenerateReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ type, period }: { type: string; period: string }) =>
      api.post('/reports/generate', null, { params: { report_type: type, period } }),
    onSuccess: () => {
      toast.success('Report generation queued')
      setTimeout(() => qc.invalidateQueries({ queryKey: ['reports'] }), 3000)
    },
  })
}
