import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AppLayout from '../components/AppLayout'
import UploadModal from '../components/UploadModal'
import {
  Plus, FileText, Clock, CheckSquare, Users, ChevronRight,
  Eye, Download, AlertTriangle, TrendingUp
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

function Avatar({ user, size = 30 }) {
  return (
    <div style={{ width: size, height: size, background: user?.avatarColor || '#888', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: size * 0.36, fontWeight: 700, flexShrink: 0 }}>
      {user?.initials}
    </div>
  )
}

export default function ManagerDashboard() {
  const navigate = useNavigate()
  const { user, documents, orgStats, mockUsers } = useApp()
  const [showUpload, setShowUpload] = useState(false)

  // Documents this manager's team is involved in (sender or recipient)
  const teamDocs = documents

  const memberLoad = mockUsers.map(u => {
    const pendingForUser = documents.filter(d => d.status === 'pending' && d.markers.some(m => !m.signed && m.assignedTo?.id === u.id)).length
    const signedByUser = documents.reduce((acc, d) => acc + d.markers.filter(m => m.signed && m.assignedTo?.id === u.id).length, 0)
    return { ...u, pendingForUser, signedByUser }
  })

  const needsAttention = documents.filter(d => d.status === 'pending')

  return (
    <AppLayout>
      <div style={{ padding: '32px 32px' }}>
        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 4 }}>Team overview, {user?.name?.split(' ')[0]}</h1>
            <p style={{ color: 'var(--text-3)', fontSize: 14 }}>
              {orgStats.pending} document{orgStats.pending !== 1 ? 's' : ''} pending across your team — track progress and unblock signatories.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowUpload(true)} style={{ gap: 8, fontSize: 14, padding: '10px 20px' }}>
            <Plus size={17} /> New document
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { icon: FileText, label: 'Team documents', value: orgStats.total, color: 'var(--brand)' },
            { icon: Clock, label: 'Awaiting signature', value: orgStats.pending, color: '#C4522A' },
            { icon: CheckSquare, label: 'Completed', value: orgStats.signed, color: 'var(--signed-text)' },
            { icon: Users, label: 'Team members', value: orgStats.activeUsers, color: 'var(--text-3)' },
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

        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
          {/* Needs attention */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="flex items-center justify-between" style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-light)' }}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} style={{ color: '#C4522A' }} />
                <h2 style={{ fontSize: 15, fontWeight: 600 }}>Needs attention</h2>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--brand)', fontWeight: 500 }} onClick={() => navigate('/documents')}>
                View all <ChevronRight size={14} />
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {needsAttention.length === 0 ? (
                  <tr><td style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-4)' }}>Nothing pending — team is all caught up.</td></tr>
                ) : needsAttention.map((doc, i) => {
                  const waitingOn = doc.markers.filter(m => !m.signed)
                  return (
                    <tr key={doc.id} style={{ borderBottom: i < needsAttention.length - 1 ? '1px solid var(--border-light)' : 'none', cursor: 'pointer' }}
                      onClick={() => navigate(`/documents/${doc.id}`)}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '14px 22px' }}>
                        <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>{doc.name}</div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={doc.status} />
                          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>· {doc.lastActivity}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 22px', textAlign: 'right' }}>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>Waiting on</div>
                        <div className="flex" style={{ justifyContent: 'flex-end' }}>
                          {waitingOn.map((m, mi) => (
                            <div key={m.id} title={m.assignedTo?.name} style={{ width: 26, height: 26, background: m.assignedTo?.avatarColor, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700, border: '2px solid white', marginLeft: mi > 0 ? -8 : 0 }}>{m.assignedTo?.initials}</div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Team load */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-light)' }}>
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>Team signing load</h2>
            </div>
            <div style={{ padding: '8px 12px' }}>
              {memberLoad.map(m => (
                <div key={m.id} className="flex items-center gap-3" style={{ padding: '12px 10px', borderRadius: 8 }}>
                  <Avatar user={m} size={32} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{m.role}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {m.pendingForUser > 0 ? (
                      <span className="badge badge-pending" style={{ fontSize: 11 }}>{m.pendingForUser} pending</span>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-4)' }}>Up to date</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </AppLayout>
  )
}
