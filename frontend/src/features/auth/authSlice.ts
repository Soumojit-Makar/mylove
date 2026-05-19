import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { api } from '../../lib/api'

interface User {
  id: string
  name: string
  email: string
  role: string
  tenant_id: string
  avatar_url?: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  loading: boolean
  error: string | null
}

const initialState: AuthState = {
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  loading: false,
  error: null,
}

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/login', credentials)
      // Fetch current user
      api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`
      const { data: user } = await api.get('/auth/me')
      return { ...data, user }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Login failed')
    }
  }
)

export const logout = createAsyncThunk('auth/logout', async () => {
  try { await api.post('/auth/logout') } catch {}
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setTokens: (state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) => {
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken
      localStorage.setItem('accessToken', action.payload.accessToken)
      localStorage.setItem('refreshToken', action.payload.refreshToken)
    },
    clearAuth: state => {
      state.user = null
      state.accessToken = null
      state.refreshToken = null
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
    },
  },
  extraReducers: builder => {
    builder
      .addCase(login.pending, state => { state.loading = true; state.error = null })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false
        state.accessToken = action.payload.access_token
        state.refreshToken = action.payload.refresh_token
        state.user = action.payload.user
        localStorage.setItem('accessToken', action.payload.access_token)
        localStorage.setItem('refreshToken', action.payload.refresh_token)
        localStorage.setItem('user', JSON.stringify(action.payload.user))
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(logout.fulfilled, state => {
        state.user = null; state.accessToken = null; state.refreshToken = null
        localStorage.clear()
      })
  },
})

export const { setTokens, clearAuth } = authSlice.actions
export default authSlice.reducer
