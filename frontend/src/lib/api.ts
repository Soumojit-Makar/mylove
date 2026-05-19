/**
 * Axios instance — configured for Vercel same-origin deployment.
 *
 * On Vercel, both frontend and backend are served from the same domain:
 *   - / and /assets  → static React build
 *   - /api/*         → Python serverless function
 *
 * So baseURL is just "/api/v1" — no cross-origin requests, no proxy needed.
 * VITE_API_URL can override this for local dev (pointing at localhost:8000).
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

export const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || '') + '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

// ─── Request interceptor — attach Bearer token ────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Response interceptor — deduplicated 401 refresh ─────────
let _refreshPromise: Promise<string> | null = null

api.interceptors.response.use(
  res => res,
  async (err: AxiosError) => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = localStorage.getItem('refreshToken')

      if (!refreshToken) {
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(err)
      }

      // If a refresh is already in flight, all 401s share the same promise
      // so we only hit /auth/refresh once even with concurrent requests.
      if (!_refreshPromise) {
        _refreshPromise = axios
          .post(`${api.defaults.baseURL}/auth/refresh`, null, {
            params: { refresh_token: refreshToken },
          })
          .then(({ data }) => {
            localStorage.setItem('accessToken',  data.access_token)
            localStorage.setItem('refreshToken', data.refresh_token)
            return data.access_token
          })
          .catch(() => {
            localStorage.clear()
            window.location.href = '/login'
            return Promise.reject(new Error('Session expired'))
          })
          .finally(() => { _refreshPromise = null })
      }

      try {
        const newToken = await _refreshPromise
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        return Promise.reject(err)
      }
    }

    return Promise.reject(err)
  }
)
