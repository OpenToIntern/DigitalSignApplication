import React, { useState } from 'react'
import { ClipboardList, User as UserIcon, Clock, Globe, Hash, FileText, Info, Shield, ChevronRight, ChevronDown } from 'lucide-react'
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
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const hours = String(d.getUTCHours()).padStart(2, '0')
  const minutes = String(d.getUTCMinutes()).padStart(2, '0')
  const seconds = String(d.getUTCSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`
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
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  const toggleExpand = (id: string) => {
    if (compact) return
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }))
  }

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
      {entries.map((entry, idx) => {
        const isExpanded = !!expandedIds[entry.id]
        const isExpandable = !compact && (entry.event === 'DOCUMENT_SIGNED' || (entry.metadata && Object.keys(entry.metadata).length > 0))

        return (
          <div
            key={entry.id || idx}
            className={`flex flex-col p-3 rounded-lg hover:bg-surface-container-low transition-colors group ${
              isExpandable ? 'cursor-pointer' : ''
            }`}
            onClick={() => isExpandable && toggleExpand(entry.id)}
          >
            <div className="flex gap-3 w-full">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5
                  ${EVENT_STYLES[entry.event]?.color.replace('text-', 'bg-') || 'bg-slate-500'}`}
                />
                {idx < entries.length - 1 && (
                  <div className="w-px flex-1 bg-outline-variant/60 mt-2" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    {isExpandable && (
                      <span className="text-on-surface-variant/50 group-hover:text-on-surface-variant/80 transition-colors">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </span>
                    )}
                    <EventBadge event={entry.event} />
                  </div>
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

                {/* Collapsed metadata badges */}
                {!isExpanded && entry.metadata && !compact && Object.keys(entry.metadata).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
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

            {/* Expanded details view */}
            {isExpanded && !compact && (
              <div
                className="mt-3 ml-5 p-3.5 bg-surface-container-low rounded-lg border border-outline-variant/40 space-y-2 text-xs font-mono text-on-surface-variant"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                  <div>
                    <span className="font-bold text-on-surface">Event Type:</span> {entry.event}
                  </div>
                  <div>
                    <span className="font-bold text-on-surface">Timestamp:</span> {formatDate(entry.timestamp)}
                  </div>
                  <div>
                    <span className="font-bold text-on-surface">IP Address:</span> {entry.ip || 'N/A'}
                  </div>
                  {entry.userId && (
                    <div>
                      <span className="font-bold text-on-surface">Signer UUID:</span> {entry.userId}
                    </div>
                  )}
                  {entry.metadata?.certId && (
                    <div>
                      <span className="font-bold text-on-surface">Certificate ID:</span> {entry.metadata.certId}
                    </div>
                  )}
                  {entry.metadata?.algorithm && (
                    <div>
                      <span className="font-bold text-on-surface">Algorithm:</span> {entry.metadata.algorithm}
                    </div>
                  )}
                  {entry.metadata?.issuer && (
                    <div className="md:col-span-2">
                      <span className="font-bold text-on-surface">Certificate Issuer:</span> {entry.metadata.issuer}
                    </div>
                  )}
                  {entry.metadata?.validFrom && (
                    <div className="md:col-span-2">
                      <span className="font-bold text-on-surface">Certificate Validity:</span> {entry.metadata.validFrom} to {entry.metadata.validTo}
                    </div>
                  )}
                  {entry.metadata?.serialNumber && (
                    <div className="md:col-span-2">
                      <span className="font-bold text-on-surface">Certificate Serial:</span> {entry.metadata.serialNumber}
                    </div>
                  )}
                  {entry.metadata?.hash && (
                    <div className="md:col-span-2 truncate" title={entry.metadata.hash}>
                      <span className="font-bold text-on-surface">Document Hash:</span> {entry.metadata.hash}
                    </div>
                  )}
                  {entry.metadata?.baselineHash && (
                    <div className="md:col-span-2 truncate" title={entry.metadata.baselineHash}>
                      <span className="font-bold text-on-surface">Baseline Hash:</span> {entry.metadata.baselineHash}
                    </div>
                  )}
                  {entry.metadata?.signatureEvidence && (
                    <div className="md:col-span-2 break-all max-h-[60px] overflow-y-auto" title={entry.metadata.signatureEvidence}>
                      <span className="font-bold text-on-surface">Signature Evidence:</span> {entry.metadata.signatureEvidence}
                    </div>
                  )}
                  {entry.metadata?.action && (
                    <div className="md:col-span-2 italic">
                      <span className="font-bold text-on-surface">Action:</span> {entry.metadata.action}
                    </div>
                  )}
                  {entry.metadata?.reason && (
                    <div className="md:col-span-2 text-red-700 font-medium">
                      <span className="font-bold text-on-surface">Reason:</span> {entry.metadata.reason}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
