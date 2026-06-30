import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AppLayout from '../components/AppLayout'
import UploadModal from '../components/UploadModal'
import {
  Plus, FileText, Clock, CheckSquare, Timer, ChevronRight,
  MoreHorizontal, Eye, Download, Trash2
} from 'lucide-react'

function StatusBadge({ status }) {
  const cfg = {
    pending: { cls: 'badge-pending', dot: 'dot-pending', label: 'Pending' },
    signed: { cls: 'badge-signed', dot: 'dot-signed', label: 'Signed' },
    draft: { cls: 'badge-draft', dot: 'dot-draft', label: 'Draft' },
  }
  const c = cfg[status] || cfg.pending
  return (
    <span className={`badge ${c.cls}`}>
      <span className={`dot ${c.dot}`} />
      {c.label}
    </span>
  )
}

function Avatar({ user, size = 30 }) {
  return (
    <div style={{ width: size, height: size, background: user?.avatarColor || '#888', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: size * 0.36, fontWeight: 700, flexShrink: 0 }}>
      {user?.initials}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, documents, stats } = useApp()
  const [filter, setFilter] = useState('All')
  const [showUpload, setShowUpload] = useState(false)
  const [menuDoc, setMenuDoc] = useState(null)

  const filtered = filter === 'All' ? documents
    : filter === 'Signed' ? documents.filter(d => d.status === 'signed')
    : documents.filter(d => d.status === 'pending')

  return (
    <AppLayout>
      <div style={{ padding: '32px 32px' }}>
        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 4 }}>Welcome back, {user?.name?.split(' ')[0]}</h1>
            <p style={{ color: 'var(--text-3)', fontSize: 14 }}>
              {stats.awaitingMe > 0
                ? `You have ${stats.awaitingMe} document${stats.awaitingMe > 1 ? 's' : ''} awaiting your signature today.`
                : 'All your documents are up to date.'}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowUpload(true)} style={{ gap: 8, fontSize: 14, padding: '10px 20px' }}>
            <Plus size={17} /> New document
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { icon: FileText, label: 'Total documents', value: stats.total, badge: '+12%', color: 'var(--brand)' },
            { icon: Clock, label: 'Pending signature', value: stats.pending, color: '#C4522A' },
            { icon: CheckSquare, label: 'Completed this month', value: stats.signed, color: 'var(--signed-text)' },
            { icon: Timer, label: 'Avg. completion time', value: '4.2h', color: 'var(--text-3)' },
          ].map(({ icon: Icon, label, value, badge, color }) => (
            <div key={label} className="card" style={{ padding: '20px 22px' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, background: 'var(--cream)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} style={{ color }} />
                </div>
                {badge && (
                  <span style={{ background: '#EEF7EC', color: '#3A7D35', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>{badge}</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Recent Activity Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="flex items-center justify-between" style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-light)' }}>
            <div className="flex items-center gap-3">
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>Recent activity</h2>
              <div className="flex gap-1">
                {['All', 'Signed', 'Pending'].map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    padding: '4px 14px', borderRadius: 99, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
                    background: filter === f ? 'var(--brand)' : 'transparent',
                    color: filter === f ? '#fff' : 'var(--text-3)',
                    transition: 'all 0.15s',
                  }}>{f}</button>
                ))}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--brand)', fontWeight: 500 }} onClick={() => navigate('/documents')}>
              View all documents <ChevronRight size={14} />
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                {['Document name', 'Status', 'Sender', 'Recipient', 'Last activity', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '11px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc, i) => (
                <tr key={doc.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-light)' : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '14px 18px' }}>
                    <div className="flex items-center gap-3">
                      <div style={{ width: 36, height: 36, background: 'var(--cream-dark)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
                        <FileText size={16} style={{ color: 'var(--text-3)' }} />
                        {doc.status === 'signed' && <div style={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, background: 'var(--signed-text)', borderRadius: '50%', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 7, color: '#fff', fontWeight: 900 }}>✓</span></div>}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 2, cursor: 'pointer', color: 'var(--text-1)' }}
                          onClick={() => navigate(`/documents/${doc.id}`)}>{doc.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{doc.category} · {doc.size}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px' }}><StatusBadge status={doc.status} /></td>
                  <td style={{ padding: '14px 18px' }}>
                    <div className="flex items-center gap-2">
                      <Avatar user={doc.sender} size={26} />
                      <span style={{ fontSize: 13 }}>{doc.sender?.name?.split(' ').slice(0, 2).join(' ')}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    {doc.recipients.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="flex" style={{ gap: 0 }}>
                          {doc.recipients.slice(0, 2).map((r, ri) => (
                            <div key={r.id} style={{ width: 26, height: 26, background: r.avatarColor, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700, border: '2px solid white', marginLeft: ri > 0 ? -8 : 0 }}>{r.initials}</div>
                          ))}
                          {doc.recipients.length > 2 && <div style={{ width: 26, height: 26, background: 'var(--cream-dark)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, color: 'var(--text-3)', border: '2px solid white', marginLeft: -8 }}>+{doc.recipients.length - 2}</div>}
                        </div>
                        <span style={{ fontSize: 13 }}>{doc.recipients[0]?.name?.split(' ')[0]}{doc.recipients.length > 1 ? ` +${doc.recipients.length - 1}` : ''}</span>
                      </div>
                    ) : <span style={{ fontSize: 13, color: 'var(--text-4)' }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{doc.lastActivity}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <div className="flex items-center gap-1">
                      <button className="btn btn-ghost" style={{ padding: '5px 8px' }} onClick={() => navigate(`/documents/${doc.id}`)} title="View">
                        <Eye size={15} style={{ color: 'var(--text-3)' }} />
                      </button>
                      <button className="btn btn-ghost" style={{ padding: '5px 8px' }} title="Download">
                        <Download size={15} style={{ color: 'var(--text-3)' }} />
                      </button>
                      <button className="btn btn-ghost" style={{ padding: '5px 8px' }} title="More">
                        <MoreHorizontal size={15} style={{ color: 'var(--text-3)' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </AppLayout>
  )
}