import { useAppSelector } from '../app/store'

const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin:   ['*'],
  admin:         ['leads.*', 'deals.*', 'contacts.*', 'accounts.*', 'campaigns.*',
                  'tickets.*', 'analytics.*', 'reports.*', 'users.*', 'hr.*', 'workflows.*'],
  sales_manager: ['leads.*', 'deals.*', 'contacts.*', 'accounts.*', 'analytics.read', 'reports.read'],
  sales_rep:     ['leads.read', 'leads.create', 'leads.update',
                  'deals.read', 'deals.create', 'deals.update', 'contacts.read'],
  marketing:     ['campaigns.*', 'leads.read', 'analytics.read'],
  support_agent: ['tickets.*', 'contacts.read', 'accounts.read'],
  hr_manager:    ['hr.*', 'users.read', 'reports.read'],
  read_only:     ['leads.read', 'deals.read', 'contacts.read', 'analytics.read'],
}

export function useAuth() {
  const { user, accessToken } = useAppSelector(s => s.auth)
  return { user, isAuthenticated: !!accessToken }
}

export function usePermission(permission: string): boolean {
  const { user } = useAppSelector(s => s.auth)
  if (!user) return false
  const perms = ROLE_PERMISSIONS[user.role] || []
  if (perms.includes('*')) return true
  const [module] = permission.split('.')
  return perms.includes(permission) || perms.includes(`${module}.*`)
}

export function useRole() {
  const { user } = useAppSelector(s => s.auth)
  return user?.role || 'read_only'
}
