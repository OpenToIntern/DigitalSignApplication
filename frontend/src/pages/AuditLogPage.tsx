import React, { useState } from 'react'
import { ClipboardList, Search, RefreshCw, Trash2, Calendar, Globe } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import AuditPanel from '../components/AuditPanel'
import { MOCK_AUDIT_LOGS } from '../constants/mockData'

export default function AuditLogPage() {
  const [logs, setLogs] = useState(MOCK_AUDIT_LOGS)
  const [search, setSearch] = useState('')
  const [filterEvent, setFilterEvent] = useState<string>('all')

  const events = Array.from(new Set(logs.map(l => l.event)))

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.documentName?.toLowerCase().includes(search.toLowerCase()) ||
      log.user?.name.toLowerCase().includes(search.toLowerCase()) ||
      log.ip.includes(search)
    
    const matchesEvent = filterEvent === 'all' || log.event === filterEvent

    return matchesSearch && matchesEvent
  })

  const clearLogs = () => {
    if (window.confirm('Are you sure you want to clear the audit logs? This action is recorded in the system audit trail.')) {
      setLogs([
        {
          id: `al-${Date.now()}`,
          event: 'AUDIT_LOG_CLEARED',
          user: null,
          timestamp: new Date(),
          ip: 'system',
          metadata: { action: 'Admin cleared logs (mock action)' }
        }
      ])
    }
  }

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
              Immutably track all document activities, cryptographic operations, and signing flows (FR-016).
            </p>
          </div>
          <button onClick={clearLogs} className="btn-secondary self-start sm:self-auto border-red-500/20 text-red-400 hover:bg-red-500/10">
            <Trash2 size={14} /> Clear Logs
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
          <AuditPanel entries={filteredLogs} />
        </div>
      </div>
    </AppLayout>
  )
}
