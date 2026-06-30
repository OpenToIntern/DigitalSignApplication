import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AppLayout from '../components/AppLayout'
import {
  FileText, Clock, CheckSquare, ShieldCheck, ChevronRight,
  AlertOctagon, Lock, Activity, Hash
} from 'lucide-react'

function StatusBadge({ status }) {
  const cfg = {
    pending: { cls: 'badge-pending', dot: 'dot-pending', label: 'Pending' },
    signed: { cls: 'badge-signed', dot: 'dot-signed', label: 'Signed' },
    draft: { cls: 'badge-draft', dot: 'dot-draft', label: 'Draft' },
  }
  const c = cfg[status] || cfg.pending
  return <span className={`badge ${c.cls}`}><span className={`dot ${c.dot}`} />{c.label}</span>
}

export default function SupervisorDashboard() {
  const navigate = useNavigate()
  const { user, documents, orgStats } = useApp()

  // Flatten audit events org-wide, most recent first
  const allEvents = documents
    .flatMap(d => d.auditLog.map(e => ({ ...e, docName: d.name, docId: d.id })))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10)

  const flaggedDocs = documents.filter(d => d.status === 'pending' && d.auditLog.length <= 1)

  const complianceChecks = [
    { label: 'eIDAS & ESIGN Act standards', status: 'pass' },
    { label: 'AES-256 encryption at rest', status: 'pass' },
    { label: 'TLS 1.2+ in transit', status: 'pass' },
    { label: 'X.509 certificate validity', status: 'pass' },
    { label: 'MFA enforcement (FR-003)', status: 'pass' },
    { label: 'Audit trail completeness (FR-016)', status: flaggedDocs.length > 0 ? 'warn' : 'pass' },
  ]

  const eventLabel = { upload: 'Uploaded', view: 'Viewed', sign: 'Signed', lock: 'Locked', download: 'Downloaded' }
  const eventColor = { upload: 'var(--draft-text)', view: 'var(--text-3)', sign: 'var(--signed-text)', lock: 'var(--brand)', download: 'var(--text-2)' }

  return (
    <AppLayout>
      <div style={{ padding: '32px 32px' }}>
        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 4 }}>Organization oversight</h1>
            <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Welcome, {user?.name?.split(' ')[0]} — full compliance and audit visibility across SignHere.</p>
          </div>
          <button className="btn btn-secondary" style={{ gap: 8, fontSize: 14 }} onClick={() => navigate('/documents')}>
            <FileText size={16} /> All documents
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { icon: FileText, label: 'Org documents', value: orgStats.total, color: 'var(--brand)' },
            { icon: Clock, label: 'Pending signature', value: orgStats.pending, color: '#C4522A' },
            { icon: CheckSquare, label: 'Signed & locked', value: orgStats.signed, color: 'var(--signed-text)' },
            { icon: AlertOctagon, label: 'Flagged for review', value: flaggedDocs.length, color: flaggedDocs.length > 0 ? '#E24B4A' : 'var(--text-3)' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="card" style={{ padding: '20px 22px' }}>
              <div style={{ width: 38, height: 38, background: 'var(--cream)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {/* Compliance checklist */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="flex items-center gap-2" style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-light)' }}>
              <ShieldCheck size={16} style={{ color: 'var(--signed-text)' }} />
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>Compliance status</h2>
            </div>
            <div style={{ padding: '8px 12px' }}>
              {complianceChecks.map(c => (
                <div key={c.label} className="flex items-center justify-between" style={{ padding: '10px 10px' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{c.label}</span>
                  {c.status === 'pass' ? (
                    <span className="badge badge-signed">Pass</span>
                  ) : (
                    <span className="badge badge-pending">Review</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Flagged docs */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="flex items-center gap-2" style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-light)' }}>
              <AlertOctagon size={16} style={{ color: '#E24B4A' }} />
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>Flagged documents</h2>
            </div>
            <div style={{ padding: flaggedDocs.length ? '8px 12px' : '32px 22px' }}>
              {flaggedDocs.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-4)', textAlign: 'center' }}>No anomalies detected — all activity logged normally.</p>
              ) : flaggedDocs.map(d => (
                <div key={d.id} className="flex items-center justify-between" style={{ padding: '10px 10px', borderRadius: 8, cursor: 'pointer' }}
                  onClick={() => navigate(`/documents/${d.id}`)}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Only {d.auditLog.length} audit event — minimal activity since upload</div>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--text-4)' }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Org-wide audit feed */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="flex items-center gap-2" style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-light)' }}>
            <Activity size={16} style={{ color: 'var(--text-3)' }} />
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>Organization-wide audit feed</h2>
            <span style={{ fontSize: 12, color: 'var(--text-4)' }}>· FR-016</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                {['Event', 'Document', 'User', 'Timestamp', 'IP address'].map(h => (
                  <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allEvents.map((e, i) => (
                <tr key={i} style={{ borderBottom: i < allEvents.length - 1 ? '1px solid var(--border-light)' : 'none', cursor: 'pointer' }}
                  onClick={() => navigate(`/documents/${e.docId}`)}
                  onMouseEnter={ev => ev.currentTarget.style.background = 'var(--cream)'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '11px 18px' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: eventColor[e.event] || 'var(--text-2)' }}>{eventLabel[e.event] || e.event}</span>
                  </td>
                  <td style={{ padding: '11px 18px', fontSize: 13 }}>{e.docName}</td>
                  <td style={{ padding: '11px 18px' }}>
                    <div className="flex items-center gap-2">
                      <div style={{ width: 22, height: 22, background: e.user?.avatarColor, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700 }}>{e.user?.initials}</div>
                      <span style={{ fontSize: 13 }}>{e.user?.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 18px', fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{new Date(e.timestamp).toLocaleString()}</td>
                  <td style={{ padding: '11px 18px', fontSize: 12, color: 'var(--text-3)', fontFamily: 'monospace' }}>{e.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  )
}
