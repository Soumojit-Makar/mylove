/**
 * API client — uses mock data so the app works without a live backend.
 * When VITE_API_URL is set to a real server, the mock layer is bypassed.
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { mockApi } from './mockData'

// Are we running against a real backend?
const HAS_REAL_BACKEND = Boolean(import.meta.env.VITE_API_URL)

export const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || '') + '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

// ─── Mock adapter — intercepts before network ─────────────────
if (!HAS_REAL_BACKEND) {
  api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const url    = config.url || ''
    const method = (config.method || 'GET').toUpperCase()
    let   body: any = undefined
    if (config.data) {
      try { body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data }
      catch { body = config.data }
    }
    await new Promise(r => setTimeout(r, 120))
    const result = mockApi(url, method, body)
    return Promise.reject({ __mock: true, data: result, status: 200, statusText: 'OK', headers: {}, config })
  })

  api.interceptors.response.use(
    res => res,
    (err: any) => {
      if (err.__mock) return Promise.resolve({ data: err.data, status: 200, statusText: 'OK', headers: {}, config: err.config })
      return Promise.reject(err)
    }
  )
}

// ─── Request interceptor — attach Bearer token ────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Response interceptor — 401 refresh (real backend only) ──
let _refreshPromise: Promise<string> | null = null

api.interceptors.response.use(
  res => res,
  async (err: AxiosError) => {
    if (!HAS_REAL_BACKEND) return Promise.reject(err)
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) { localStorage.clear(); window.location.href = '/login'; return Promise.reject(err) }
      if (!_refreshPromise) {
        _refreshPromise = axios
          .post(`${api.defaults.baseURL}/auth/refresh`, null, { params: { refresh_token: refreshToken } })
          .then(({ data }) => { localStorage.setItem('accessToken', data.access_token); localStorage.setItem('refreshToken', data.refresh_token); return data.access_token })
          .catch(() => { localStorage.clear(); window.location.href = '/login'; return Promise.reject(new Error('Session expired')) })
          .finally(() => { _refreshPromise = null })
      }
      try { const newToken = await _refreshPromise; original.headers.Authorization = `Bearer ${newToken}`; return api(original) }
      catch { return Promise.reject(err) }
    }
    return Promise.reject(err)
  }
)
