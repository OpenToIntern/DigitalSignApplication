import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  LayoutDashboard, FileText, Settings, Bell,
  HelpCircle, LogOut, ChevronDown, Search, Shield, Users, BarChart3
} from 'lucide-react'
import { useState } from 'react'

const NAV_BASE = {
  user: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: FileText, label: 'Documents', path: '/documents' },
    { icon: Shield, label: 'Verify', path: '/verify' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ],
  manager: [
    { icon: LayoutDashboard, label: 'Team Dashboard', path: '/manager' },
    { icon: FileText, label: 'Documents', path: '/documents' },
    { icon: Users, label: 'Team', path: '/manager' },
    { icon: Shield, label: 'Verify', path: '/verify' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ],
  supervisor: [
    { icon: LayoutDashboard, label: 'Overview', path: '/supervisor' },
    { icon: FileText, label: 'Documents', path: '/documents' },
    { icon: BarChart3, label: 'Compliance', path: '/supervisor' },
    { icon: Shield, label: 'Verify', path: '/verify' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ],
}

const ROLE_LABEL = { user: 'User', manager: 'Manager', supervisor: 'Supervisor' }

export default function AppLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, stats } = useApp()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const NAV = NAV_BASE[user?.accessRole] || NAV_BASE.user

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--cream)' }}>

      {/* Sidebar */}
      <aside style={{ width: 240, background: 'var(--white)', borderRight: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-light)' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, background: 'var(--brand)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>S</span>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px', lineHeight: 1 }}>SignHere</div>
              <div style={{ fontSize: 10, color: 'var(--text-4)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 1 }}>
                {ROLE_LABEL[user?.accessRole] || 'User'} Console
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 12px', flex: 1 }}>
          {NAV.map(({ icon: Icon, label, path }) => {
            const active = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path))
            return (
              <button key={path} onClick={() => navigate(path)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                borderRadius: 8, border: 'none', cursor: 'pointer', marginBottom: 2,
                background: active ? 'var(--brand-light)' : 'transparent',
                color: active ? 'var(--brand)' : 'var(--text-2)',
                fontWeight: active ? 600 : 400, fontSize: 14,
                transition: 'background 0.15s, color 0.15s',
              }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--cream)'; e.currentTarget.style.color = 'var(--text-1)' } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)' } }}>
                <Icon size={17} />
                {label}
                {label === 'Documents' && stats.pending > 0 && (
                  <span style={{ marginLeft: 'auto', background: 'var(--brand)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 99 }}>{stats.pending}</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* User footer */}
        <div style={{ borderTop: '1px solid var(--border-light)', padding: '12px' }}>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowUserMenu(p => !p)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ width: 34, height: 34, background: user?.avatarColor || 'var(--brand)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {user?.initials}
              </div>
              <div style={{ textAlign: 'left', overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                <div className="flex items-center gap-1">
                  <span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</span>
                </div>
              </div>
              <ChevronDown size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
            </button>
            {showUserMenu && (
              <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', padding: '6px', marginBottom: 4, zIndex: 50 }}>
                <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', gap: 10, borderRadius: 6, color: '#E24B4A' }} onClick={handleLogout}>
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{ height: 56, background: 'var(--white)', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16, flexShrink: 0 }}>
          <div style={{ flex: 1, position: 'relative', maxWidth: 400 }}>
            <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }} />
            <input className="input" placeholder="Search documents, people, or tags…" style={{ paddingLeft: 34, height: 34, fontSize: 13 }} />
          </div>
          <nav className="flex gap-1" style={{ marginLeft: 'auto' }}>
            {['Documents', 'Vault', 'Analytics'].map(label => (
              <button key={label} className="btn btn-ghost" style={{ fontSize: 14, color: 'var(--text-2)', padding: '6px 12px' }}>{label}</button>
            ))}
          </nav>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <button className="btn btn-ghost" style={{ padding: '6px 8px', position: 'relative' }}>
            <Bell size={17} style={{ color: 'var(--text-2)' }} />
            {stats.awaitingMe > 0 && <span style={{ position: 'absolute', top: 5, right: 5, width: 8, height: 8, background: 'var(--brand)', borderRadius: '50%', border: '1.5px solid white' }} />}
          </button>
          <button className="btn btn-ghost" style={{ padding: '6px 8px' }}>
            <HelpCircle size={17} style={{ color: 'var(--text-2)' }} />
          </button>
          <div style={{ width: 32, height: 32, background: user?.avatarColor || 'var(--brand)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {user?.initials}
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: 'auto', padding: '0' }} className="page-enter">
          {children}
        </main>
      </div>
    </div>
  )
}