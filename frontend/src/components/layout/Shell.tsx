import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../app/store'
import { logout } from '../../features/auth/authSlice'
import { toggleSidebar } from '../../app/uiSlice'
import {
  LayoutDashboard, Users, TrendingUp, Building2, Megaphone,
  GitBranch, HeadphonesIcon, BarChart3, FileText, UserCog,
  Settings, Bell, Search, LogOut, ChevronLeft, ChevronRight,
  Zap
} from 'lucide-react'
import { useEventSource } from '../../hooks/useEventSource'
import { cn } from '../../lib/utils'

const NAV = [
  { section: 'Core' },
  { to: '/dashboard',  label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/leads',      label: 'Leads',         icon: Users,           badge: '24' },
  { to: '/deals',      label: 'Sales Pipeline',icon: TrendingUp },
  { to: '/contacts',   label: 'Contacts',      icon: Users },
  { to: '/accounts',   label: 'Accounts',      icon: Building2 },
  { section: 'Automation' },
  { to: '/campaigns',  label: 'Marketing',     icon: Megaphone },
  { to: '/workflows',  label: 'Workflows',     icon: GitBranch },
  { to: '/tickets',    label: 'Service Desk',  icon: HeadphonesIcon,  badge: '7' },
  { section: 'Intelligence' },
  { to: '/analytics',  label: 'Analytics & AI',icon: BarChart3 },
  { to: '/reports',    label: 'Reports',       icon: FileText },
  { section: 'Admin' },
  { to: '/hr',         label: 'HR & Teams',    icon: UserCog },
  { to: '/settings',   label: 'Settings',      icon: Settings },
]

 function Shell() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { user } = useAppSelector(s => s.auth)
  const { sidebarCollapsed } = useAppSelector(s => s.ui)
  useEventSource() // connect via SSE

  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* SIDEBAR */}
      <aside
        className="flex flex-col transition-all duration-200"
        style={{
          width: sidebarCollapsed ? 56 : 200,
          background: 'var(--bg2)',
          borderRight: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-3 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
               style={{ background: 'var(--accent)' }}>N</div>
          {!sidebarCollapsed && (
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>NexusCRM</div>
              <div className="text-xs" style={{ color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Enterprise</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-1.5">
          {NAV.map((item, i) => {
            if ('section' in item) {
              return !sidebarCollapsed ? (
                <div key={i} className="px-2 pt-4 pb-1 text-xs font-medium uppercase tracking-widest"
                     style={{ color: 'var(--text3)' }}>{item.section}</div>
              ) : <div key={i} className="my-2 mx-2 h-px" style={{ background: 'var(--border)' }} />
            }
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to!}
                className={({ isActive }) =>
                  cn('flex items-center gap-2 px-2.5 py-1.5 rounded-lg mb-0.5 text-xs font-medium transition-all relative',
                    isActive
                      ? 'text-blue-400'
                      : 'hover:text-white'
                  )
                }
                style={({ isActive }) => ({
                  background: isActive ? 'rgba(79,110,247,0.12)' : 'transparent',
                  color: isActive ? 'var(--accent2)' : 'var(--text2)',
                })}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r"
                            style={{ background: 'var(--accent)' }} />
                    )}
                    <Icon size={14} className="flex-shrink-0" />
                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                                style={{ background: 'var(--accent)', color: '#fff', fontSize: 10 }}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-2" style={{ borderTop: '1px solid var(--border)' }}>
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--surface)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                   style={{ background: 'linear-gradient(135deg, var(--accent), var(--purple))' }}>
                {user?.name?.slice(0, 2).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{user?.name}</div>
                <div className="text-xs truncate" style={{ color: 'var(--text3)' }}>{user?.role?.replace('_', ' ')}</div>
              </div>
              <button onClick={handleLogout} className="p-1 rounded hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--text3)' }}>
                <LogOut size={12} />
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} className="w-full flex justify-center p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--text3)' }}>
              <LogOut size={14} />
            </button>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOPBAR */}
        <header className="flex items-center gap-3 px-5 h-13 flex-shrink-0"
                style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', height: 52 }}>
          <button onClick={() => dispatch(toggleSidebar())} className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--text3)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          <div className="flex-1" />

          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
            <Search size={12} />
            <span>Search anything...</span>
            <kbd className="ml-4 px-1.5 py-0.5 rounded text-xs" style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>⌘K</kbd>
          </button>

          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-lg transition-colors"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
              <Bell size={14} />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--red)' }} />
            </button>
            <button className="p-2 rounded-lg transition-colors"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
              <Zap size={14} />
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold cursor-pointer"
                 style={{ background: 'linear-gradient(135deg, var(--accent), var(--purple))' }}>
              {user?.name?.slice(0, 2).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
export default Shell