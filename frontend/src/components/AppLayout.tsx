import React, { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FileText, ShieldCheck, ClipboardList,
  Settings, LogOut, Menu, X, Bell, ChevronDown,
  PenSquare, Users, Lock, Search, HelpCircle, FileCheck, Layers, History
} from 'lucide-react'
import { useApp } from '../context/AppContext'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  roles?: Array<'user' | 'supervisor' | 'manager'>
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard', roles: ['user'] },
  { to: '/supervisor', icon: <PenSquare size={18} />, label: 'Sign Queue', roles: ['supervisor'] },
  { to: '/manager', icon: <Lock size={18} />, label: 'Sign Queue', roles: ['manager'] },
  { to: '/documents', icon: <FileText size={18} />, label: 'Documents' },
  { to: '/verify', icon: <ShieldCheck size={18} />, label: 'Verify' },
  { to: '/audit', icon: <ClipboardList size={18} />, label: 'Audit Log' },
  { to: '/settings', icon: <Settings size={18} />, label: 'Settings' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const { currentUser, logout } = useApp()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const filteredNav = navItems.filter(item => {
    if (!item.roles) return true
    return item.roles.includes(currentUser?.accessRole as 'user' | 'supervisor' | 'manager')
  })

  // Editor sidebar is styled in a special minimized mode (as seen in screenshots: Document, Layers, History)
  const isEditorPage = location.pathname.includes('/editor')

  if (isEditorPage) {
    return (
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Editor Minimized Sidebar */}
        <aside className="w-16 flex flex-col justify-between items-center py-6 bg-surface-container border-r border-outline-variant/60 flex-shrink-0">
          <div className="flex flex-col items-center gap-6 w-full">
            {/* Logo */}
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm cursor-pointer" onClick={() => navigate('/dashboard')}>
              <PenSquare size={18} />
            </div>

            {/* Editor Nav Options */}
            <div className="flex flex-col gap-2 w-full px-2">
              <button className="w-full h-11 flex items-center justify-center rounded-lg text-primary bg-primary/10 border border-primary/20" title="Document Details">
                <FileText size={18} />
              </button>
              <button className="w-full h-11 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low" title="Fields / Layers">
                <Layers size={18} />
              </button>
              <button className="w-full h-11 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low" title="Audit Trail History">
                <History size={18} />
              </button>
            </div>
          </div>

          {/* Bottom Settings & Log Out Actions */}
          <div className="flex flex-col gap-2 items-center w-full px-2">
            <button className="p-2 text-on-surface-variant hover:text-primary rounded-lg hover:bg-surface-container-low" onClick={() => navigate('/settings')} title="Settings">
              <Settings size={18} />
            </button>
            <button className="p-2 text-on-surface-variant hover:text-error rounded-lg hover:bg-error/5" onClick={handleLogout} title="Log Out">
              <LogOut size={18} />
            </button>
          </div>
        </aside>

        {/* Content canvas wrapper */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    )
  }

  // Dashboard & standard page layouts
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-surface-container border-r border-outline-variant/60 flex-shrink-0">
        <div className="flex flex-col h-full justify-between">
          <div className="flex flex-col">
            {/* Logo block */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-outline-variant/40">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm">
                <PenSquare size={18} />
              </div>
              <div>
                <span className="font-display font-extrabold text-primary text-base">SignHere</span>
                <p className="text-[10px] text-on-surface-variant/80 uppercase tracking-widest font-bold">Enterprise Security</p>
              </div>
            </div>

            {/* Sidebar menu items */}
            <nav className="px-4 py-4 space-y-1">
              {filteredNav.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    isActive ? 'sidebar-link-active' : 'sidebar-link'
                  }
                >
                  <span>{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Bottom links */}
          <div className="px-4 pb-6 space-y-1">
            <button
              onClick={() => navigate('/settings')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low text-sm font-medium transition-all"
            >
              <HelpCircle size={18} />
              Help Center
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/5 text-sm font-medium transition-all"
            >
              <LogOut size={18} />
              Log out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Layout toggle sidebars */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-on-surface/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-50 flex flex-col w-64 bg-surface-container border-r border-outline-variant/60 animate-fade-in">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface"
            >
              <X size={18} />
            </button>
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center gap-3 px-6 py-5 border-b border-outline-variant/40">
                  <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm">
                    <PenSquare size={18} />
                  </div>
                  <div>
                    <span className="font-display font-extrabold text-primary text-base">SignHere</span>
                    <p className="text-[10px] text-on-surface-variant/80 uppercase tracking-widest font-bold">Enterprise Security</p>
                  </div>
                </div>
                <nav className="px-4 py-4 space-y-1">
                  {filteredNav.map(item => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        isActive ? 'sidebar-link-active' : 'sidebar-link'
                      }
                    >
                      <span>{item.icon}</span>
                      {item.label}
                    </NavLink>
                  ))}
                </nav>
              </div>
              <div className="px-4 pb-6 space-y-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/5 text-sm font-medium transition-all"
                >
                  <LogOut size={18} />
                  Log out
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main content viewport */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="flex items-center justify-between px-6 h-16 border-b border-outline-variant/60 bg-surface-container-lowest flex-shrink-0">
          <div className="flex items-center gap-3 flex-1">
            <button
              className="lg:hidden p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>

            {/* Search Input Box */}
            <div className="relative max-w-md w-full hidden sm:block">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={16} />
              <input
                type="text"
                placeholder="Search documents, people, or tags..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="w-full px-10 py-2 rounded-lg bg-surface-container border border-outline-variant/50 text-on-surface placeholder-on-surface-variant/40 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Action icons */}
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant hover:text-on-surface transition-colors">
              <Bell size={18} />
            </button>
            <button className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant hover:text-on-surface transition-colors">
              <HelpCircle size={18} />
            </button>

            {/* Profile Avatar Trigger dropdown */}
            <div className="relative ml-2">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1 hover:opacity-90 transition-opacity"
              >
                <div
                  className="w-8 h-8 rounded-full border border-outline-variant/60 flex items-center justify-center text-xs font-bold text-white shadow-sm"
                  style={{ backgroundColor: currentUser?.avatarColor }}
                >
                  {currentUser?.initials}
                </div>
                <ChevronDown size={14} className="text-on-surface-variant/60" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-md py-1 z-50 animate-slide-up">
                  <div className="px-4 py-2 border-b border-outline-variant/50">
                    <p className="text-xs font-semibold text-on-surface truncate">{currentUser?.name}</p>
                    <p className="text-[10px] text-on-surface-variant truncate">{currentUser?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-on-surface-variant hover:text-error hover:bg-error/5 transition-all text-left font-medium"
                  >
                    <LogOut size={14} />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Viewport page content container */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
