import React from 'react'
import { ClipboardList, User as UserIcon, Clock, Globe, Hash, FileText, Info, Shield } from 'lucide-react'
import type { AuditLogEntry } from '../types'

interface AuditPanelProps {
  entries: AuditLogEntry[]
  compact?: boolean
}

const EVENT_STYLES: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  DOCUMENT_UPLOADED:         { color: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-100',  icon: <FileText size={12} /> },
  DOCUMENT_VIEWED:           { color: 'text-slate-700',   bg: 'bg-slate-100 border-slate-200',   icon: <Info size={12} /> },
  SIGNATURE_MARKERS_PLACED:  { color: 'text-violet-700',  bg: 'bg-violet-50 border-violet-100',  icon: <Hash size={12} /> },
  SIGNING_INVITATION_SENT:   { color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-100',   icon: <Globe size={12} /> },
  DOCUMENT_SIGNED:           { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100', icon: <Shield size={12} /> },
  DOCUMENT_REJECTED:         { color: 'text-red-700',     bg: 'bg-red-50 border-red-100',     icon: <Info size={12} /> },
  DOCUMENT_LOCKED:           { color: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-100',  icon: <Shield size={12} /> },
  DOCUMENT_DOWNLOADED:       { color: 'text-cyan-700',    bg: 'bg-cyan-50 border-cyan-100',    icon: <FileText size={12} /> },
  MFA_VERIFIED:              { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100', icon: <Shield size={12} /> },
  USER_LOGIN:                { color: 'text-slate-700',   bg: 'bg-slate-100 border-slate-200',   icon: <UserIcon size={12} /> },
}

function formatDate(ts: Date | string) {
  const d = new Date(ts)
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function EventBadge({ event }: { event: string }) {
  const style = EVENT_STYLES[event] || { color: 'text-slate-750', bg: 'bg-slate-100 border-slate-200', icon: <Info size={12} /> }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.color} ${style.bg}`}>
      {style.icon}
      {event.replace(/_/g, ' ')}
    </span>
  )
}

export default function AuditPanel({ entries, compact = false }: AuditPanelProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-on-surface-variant/60">
        <ClipboardList size={32} className="mb-3 opacity-40 text-on-surface-variant" />
        <p className="text-sm font-semibold">No audit events recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-1 text-left">
      {entries.map((entry, idx) => (
        <div
          key={entry.id || idx}
          className="flex gap-3 p-3 rounded-lg hover:bg-surface-container-low transition-colors group"
        >
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5
              ${EVENT_STYLES[entry.event]?.color.replace('text-', 'bg-') || 'bg-slate-500'}`}
            />
            {idx < entries.length - 1 && (
              <div className="w-px flex-1 bg-outline-variant/60 mt-1" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <EventBadge event={entry.event} />
              <span className="text-xs text-on-surface-variant font-mono">
                {formatDate(entry.timestamp)}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-on-surface-variant">
              {/* User */}
              <span className="flex items-center gap-1.5 text-xs">
                <UserIcon size={11} />
                {entry.user ? (
                  <span>
                    <span className="font-semibold text-on-surface">{entry.user.name}</span>
                    {' '}
                    <span className="text-on-surface-variant/70">({entry.user.role})</span>
                  </span>
                ) : (
                  <span className="italic text-on-surface-variant/70">System</span>
                )}
              </span>

              {/* IP */}
              <span className="flex items-center gap-1.5 text-xs font-mono">
                <Globe size={11} />
                {entry.ip}
              </span>

              {/* Document */}
              {entry.documentName && !compact && (
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <FileText size={11} />
                  {entry.documentName}
                </span>
              )}
            </div>

            {/* Metadata */}
            {entry.metadata && !compact && Object.keys(entry.metadata).length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {entry.metadata.certId && (
                  <span className="inline-flex items-center gap-1 text-xs bg-surface-container-low border border-outline-variant/50 px-2 py-0.5 rounded text-on-surface-variant font-mono">
                    <Shield size={10} className="text-primary" /> {entry.metadata.certId}
                  </span>
                )}
                {entry.metadata.algorithm && (
                  <span className="inline-flex items-center gap-1 text-xs bg-surface-container-low border border-outline-variant/50 px-2 py-0.5 rounded text-on-surface-variant font-mono">
                    <Hash size={10} /> {entry.metadata.algorithm}
                  </span>
                )}
                {entry.metadata.baselineHash && (
                  <span className="inline-flex items-center gap-1 text-xs bg-surface-container-low border border-outline-variant/50 px-2 py-0.5 rounded text-on-surface-variant font-mono truncate max-w-[240px]" title={entry.metadata.baselineHash}>
                    Hash: {entry.metadata.baselineHash.slice(0, 12)}...
                  </span>
                )}
                {entry.metadata.action && (
                  <span className="text-xs text-on-surface-variant/80 italic">{entry.metadata.action}</span>
                )}
                {entry.metadata.reason && (
                  <span className="text-xs text-red-700 font-medium">{entry.metadata.reason}</span>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
