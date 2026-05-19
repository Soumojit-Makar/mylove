import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { store } from './app/store'
import { queryClient } from './lib/queryClient'
import Shell from './components/layout/Shell'
import LoginPage from './features/auth/LoginPage'
import { LoadingSpinner } from './components/ui'

// ─── Lazy-loaded route bundles ────────────────────────────────
// Each page is only fetched when the user navigates to that route,
// keeping the initial JS payload minimal.
const DashboardPage  = lazy(() => import('./features/analytics/DashboardPage'))
const LeadsPage      = lazy(() => import('./features/leads/LeadsPage'))
const ContactsPage   = lazy(() => import('./features/leads/ContactsPage'))
const AccountsPage   = lazy(() => import('./features/leads/AccountsPage'))
const DealsPage      = lazy(() => import('./features/deals/DealsPage'))
const CampaignsPage  = lazy(() => import('./features/campaigns/CampaignsPage'))
const TicketsPage    = lazy(() => import('./features/tickets/TicketsPage'))
const WorkflowPage   = lazy(() => import('./features/workflow/WorkflowPage'))
const AnalyticsPage  = lazy(() => import('./features/analytics/AnalyticsPage'))
const ReportsPage    = lazy(() => import('./features/reports/ReportsPage'))
const HRPage         = lazy(() => import('./features/hr/HRPage'))
const SettingsPage   = lazy(() => import('./features/auth/SettingsPage'))

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('accessToken')
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: { background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: 13 },
            }}
          />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<PrivateRoute><Shell /></PrivateRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard"  element={<Suspense fallback={<LoadingSpinner />}><DashboardPage /></Suspense>} />
              <Route path="leads"      element={<Suspense fallback={<LoadingSpinner />}><LeadsPage /></Suspense>} />
              <Route path="contacts"   element={<Suspense fallback={<LoadingSpinner />}><ContactsPage /></Suspense>} />
              <Route path="accounts"   element={<Suspense fallback={<LoadingSpinner />}><AccountsPage /></Suspense>} />
              <Route path="deals"      element={<Suspense fallback={<LoadingSpinner />}><DealsPage /></Suspense>} />
              <Route path="campaigns"  element={<Suspense fallback={<LoadingSpinner />}><CampaignsPage /></Suspense>} />
              <Route path="tickets"    element={<Suspense fallback={<LoadingSpinner />}><TicketsPage /></Suspense>} />
              <Route path="workflows"  element={<Suspense fallback={<LoadingSpinner />}><WorkflowPage /></Suspense>} />
              <Route path="analytics"  element={<Suspense fallback={<LoadingSpinner />}><AnalyticsPage /></Suspense>} />
              <Route path="reports"    element={<Suspense fallback={<LoadingSpinner />}><ReportsPage /></Suspense>} />
              <Route path="hr"         element={<Suspense fallback={<LoadingSpinner />}><HRPage /></Suspense>} />
              <Route path="settings"   element={<Suspense fallback={<LoadingSpinner />}><SettingsPage /></Suspense>} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  )
}
