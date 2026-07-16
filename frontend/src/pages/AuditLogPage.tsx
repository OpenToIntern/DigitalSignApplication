import React, { useState, useEffect } from 'react'
import { ClipboardList, Search, RefreshCw, Calendar, Globe, Loader2 } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import AuditPanel from '../components/AuditPanel'
import { useApp } from '../context/AppContext'
import type { AuditLogEntry } from '../types'

function normalizeAuditUser(user: any) {
  if (!user) return null
  const name = user.name || user.email?.split('@')[0] || 'Unknown'
  return {
    id: user.id,
    name,
    email: user.email || '',
    initials: user.initials || name.split(' ').filter(Boolean).slice(0, 2).map((p: string) => p[0]?.toUpperCase()).join('') || '?',
    nik: user.nik || '',
    verified: user.verified ?? true,
    avatarColor: user.avatarColor || '#9a3412',
    role: user.role || (user.accessRole === 'manager' ? 'Manager' : user.accessRole === 'supervisor' ? 'Supervisor' : 'Staff'),
    accessRole: user.accessRole || 'user',
  }
}

export default function AuditLogPage() {
  const { token } = useApp()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterEvent, setFilterEvent] = useState<string>('all')

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

  const fetchLogs = async () => {
    if (!token) return
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${apiBase}/audit-logs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!res.ok) throw new Error('Failed to fetch audit logs')
      const data = await res.json()
      const mapped: AuditLogEntry[] = data.map((log: any) => ({
        id: log.id,
        event: log.event,
        user: normalizeAuditUser(log.user),
        timestamp: log.timestamp,
        ip: log.ip,
        documentId: log.documentId,
        documentName: log.documentName || undefined,
        metadata: log.metadata || undefined,
      }))
      setLogs(mapped)
    } catch (err: any) {
      console.error('Error fetching audit logs:', err)
      setError(err.message || 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [token])

  const events = Array.from(new Set(logs.map(l => l.event)))

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.documentName?.toLowerCase().includes(search.toLowerCase()) ||
      log.user?.name.toLowerCase().includes(search.toLowerCase()) ||
      log.ip.includes(search)
    
    const matchesEvent = filterEvent === 'all' || log.event === filterEvent

    return matchesSearch && matchesEvent
  })

  return (
    <AppLayout>
      <div className="page-container max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="section-title text-2xl flex items-center gap-2">
              <ClipboardList className="text-indigo-400" />
              Cryptographic Audit Log
            </h1>
            <p className="section-subtitle mt-1">
              Immutable record of all document activities, cryptographic operations, and signing flows (FR-016).
            </p>
          </div>
          <button onClick={fetchLogs} className="btn-secondary self-start sm:self-auto" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Toolbar */}
        <div className="glass-card p-4 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Search by user, IP, or document..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          <select
            value={filterEvent}
            onChange={e => setFilterEvent(e.target.value)}
            className="input-field py-2 text-xs w-full sm:w-48"
          >
            <option value="all">All Events</option>
            {events.map(e => (
              <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        {/* Audit List Panel Container */}
        <div className="glass-card p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant/60">
              <Loader2 size={32} className="mb-3 animate-spin text-primary" />
              <p className="text-sm font-semibold">Loading audit logs...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-red-500">
              <ClipboardList size={32} className="mb-3 opacity-40" />
              <p className="text-sm font-semibold">{error}</p>
              <button onClick={fetchLogs} className="btn-ghost text-xs mt-3">Try Again</button>
            </div>
          ) : (
            <AuditPanel entries={filteredLogs} />
          )}
        </div>
      </div>
    </AppLayout>
  )
}
