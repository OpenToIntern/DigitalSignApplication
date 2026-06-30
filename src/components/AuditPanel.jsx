import { X, Upload, Eye, Pen, Download, Lock, AlertCircle, Clock } from 'lucide-react'

const EVENT_CONFIG = {
  upload:   { icon: Upload,       label: 'Document uploaded',      color: '#2A6496', bg: '#EEF4FB' },
  view:     { icon: Eye,          label: 'Document viewed',        color: '#6B3A9B', bg: '#F3EEF9' },
  sign:     { icon: Pen,          label: 'Signature applied',      color: '#27723A', bg: '#EEF7EE' },
  lock:     { icon: Lock,         label: 'Document locked',        color: '#9B3A1A', bg: '#F5EDE8' },
  download: { icon: Download,     label: 'Document downloaded',    color: '#7A6018', bg: '#FEF8EE' },
  failed:   { icon: AlertCircle,  label: 'Signature attempt failed', color: '#C0392B', bg: '#FCF0F0' },
}

function fmtTimestamp(ts) {
  const d = new Date(ts)
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

export default function AuditPanel({ doc, onClose }) {
  const sorted = [...(doc?.auditLog || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  return (
    <div style={{ width: 320, background: 'var(--white)', borderLeft: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Audit log</h3>
          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>FR-016 · {sorted.length} events recorded</p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
          <X size={16} />
        </button>
      </div>

      {/* Hash reference */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', background: 'var(--cream)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Document baseline hash</div>
        <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-2)', wordBreak: 'break-all', lineHeight: 1.5 }}>{doc?.hash}</div>
      </div>

      {/* Events */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-4)' }}>
            <Clock size={24} style={{ margin: '0 auto 8px', display: 'block' }} />
            No events yet
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            {/* Timeline line */}
            <div style={{ position: 'absolute', left: 15, top: 8, bottom: 8, width: 1, background: 'var(--border-light)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {sorted.map((entry, i) => {
                const cfg = EVENT_CONFIG[entry.event] || EVENT_CONFIG.view
                const Icon = cfg.icon
                return (
                  <div key={i} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                    {/* Icon dot on timeline */}
                    <div style={{ width: 30, height: 30, background: cfg.bg, borderRadius: '50%', border: `2px solid ${cfg.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                      <Icon size={13} style={{ color: cfg.color }} />
                    </div>
                    <div style={{ flex: 1, paddingTop: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>{cfg.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>
                        by <strong style={{ color: 'var(--text-2)' }}>{entry.user?.name}</strong>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 2 }}>
                        {fmtTimestamp(entry.timestamp)} UTC
                      </div>
                      <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-4)' }}>
                        IP: {entry.ip}
                      </div>
                      {entry.metadata && (
                        <div style={{ marginTop: 6, padding: '6px 10px', background: 'var(--cream)', borderRadius: 6 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.7 }}>
                            <span style={{ fontWeight: 600 }}>Cert:</span> {entry.metadata.certId}<br />
                            <span style={{ fontWeight: 600 }}>Algo:</span> {entry.metadata.algorithm}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-light)', background: 'var(--cream)' }}>
        <p style={{ fontSize: 11, color: 'var(--text-4)', lineHeight: 1.6 }}>
          All events are immutable and timestamped in UTC. Audit log satisfies BR-005, FR-016 requirements for compliance monitoring and dispute resolution.
        </p>
      </div>
    </div>
  )
}
