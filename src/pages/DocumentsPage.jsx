import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AppLayout from '../components/AppLayout'
import UploadModal from '../components/UploadModal'
import {
  Plus, FileText, Eye, Download, MoreHorizontal, Search,
  Filter, CheckCircle2, Clock, FileEdit, Lock
} from 'lucide-react'

function StatusBadge({ status }) {
  const cfg = {
    pending: { cls: 'badge-pending', dot: 'dot-pending', label: 'Pending' },
    signed:  { cls: 'badge-signed',  dot: 'dot-signed',  label: 'Signed'  },
    draft:   { cls: 'badge-draft',   dot: 'dot-draft',   label: 'Draft'   },
  }
  const c = cfg[status] || cfg.pending
  return <span className={`badge ${c.cls}`}><span className={`dot ${c.dot}`} />{c.label}</span>
}

function Avatar({ user, size = 28 }) {
  return (
    <div style={{ width: size, height: size, background: user?.avatarColor || '#888', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: size * 0.38, fontWeight: 700, flexShrink: 0 }}>
      {user?.initials}
    </div>
  )
}

export default function DocumentsPage() {
  const navigate = useNavigate()
  const { documents, user, logAuditEvent } = useApp()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showUpload, setShowUpload] = useState(false)

  const FILTERS = ['All', 'Pending', 'Signed', 'Draft']

  const filtered = documents.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.category.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'All' || d.status === statusFilter.toLowerCase()
    return matchSearch && matchStatus
  })

  const handleView = (doc) => {
    logAuditEvent(doc.id, 'view')
    navigate(`/documents/${doc.id}`)
  }

  const handleDownload = (doc) => {
    logAuditEvent(doc.id, 'download')
    // In production: trigger signed PDF download
    alert(`Download triggered for ${doc.name}\nAudit event logged (FR-016)`)
  }

  const counts = {
    All: documents.length,
    Pending: documents.filter(d => d.status === 'pending').length,
    Signed: documents.filter(d => d.status === 'signed').length,
    Draft: documents.filter(d => d.status === 'draft').length,
  }

  return (
    <AppLayout>
      <div style={{ padding: '32px' }}>
        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 4 }}>Documents</h1>
            <p style={{ color: 'var(--text-3)', fontSize: 14 }}>{documents.length} total documents across all statuses</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowUpload(true)} style={{ gap: 8 }}>
            <Plus size={17} /> Upload document
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3" style={{ marginBottom: 20 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
            <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }} />
            <input className="input" placeholder="Search by name or category…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34, height: 36, fontSize: 13 }} />
          </div>
          <div className="flex gap-1" style={{ background: 'var(--cream-dark)', borderRadius: 10, padding: 3 }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setStatusFilter(f)} style={{
                padding: '5px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
                background: statusFilter === f ? 'var(--white)' : 'transparent',
                color: statusFilter === f ? 'var(--text-1)' : 'var(--text-3)',
                boxShadow: statusFilter === f ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s',
              }}>
                {f} <span style={{ opacity: 0.6, fontSize: 11 }}>({counts[f]})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--cream)' }}>
                {['Document', 'Status', 'Category', 'Sender', 'Recipients', 'Signatures', 'Last activity', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-4)' }}>
                    <FileText size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                    No documents match your search
                  </td>
                </tr>
              ) : filtered.map((doc, i) => {
                const signedCount = doc.markers.filter(m => m.signed).length
                const totalCount = doc.markers.length
                return (
                  <tr key={doc.id}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-light)' : 'none', transition: 'background 0.1s', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '14px 16px' }}>
                      <div className="flex items-center gap-3">
                        <div style={{ width: 36, height: 36, background: 'var(--cream-dark)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
                          <FileText size={16} style={{ color: 'var(--text-3)' }} />
                          {doc.locked && (
                            <div style={{ position: 'absolute', bottom: -3, right: -3, width: 14, height: 14, background: 'var(--signed-text)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                              <Lock size={7} style={{ color: '#fff' }} />
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-1)' }} onClick={() => handleView(doc)}>{doc.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-4)', fontFamily: 'monospace', marginTop: 1 }}>{doc.hash.substring(0, 20)}…</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}><StatusBadge status={doc.status} /></td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-2)' }}>{doc.category}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div className="flex items-center gap-2">
                        <Avatar user={doc.sender} />
                        <span style={{ fontSize: 13 }}>{doc.sender?.name?.split(' ')[0]}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {doc.recipients.length > 0 ? (
                        <div className="flex" style={{ gap: 0 }}>
                          {doc.recipients.slice(0, 3).map((r, ri) => (
                            <div key={r.id} style={{ width: 26, height: 26, background: r.avatarColor, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700, border: '2px solid white', marginLeft: ri > 0 ? -8 : 0 }}>{r.initials}</div>
                          ))}
                          {doc.recipients.length > 3 && <div style={{ width: 26, height: 26, background: 'var(--cream-dark)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, color: 'var(--text-3)', border: '2px solid white', marginLeft: -8 }}>+{doc.recipients.length - 3}</div>}
                        </div>
                      ) : <span style={{ fontSize: 13, color: 'var(--text-4)' }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {totalCount > 0 ? (
                        <div className="flex items-center gap-2">
                          <div style={{ width: 60, height: 4, background: 'var(--cream-dark)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(signedCount / totalCount) * 100}%`, background: signedCount === totalCount ? 'var(--signed-text)' : 'var(--brand)', borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{signedCount}/{totalCount}</span>
                        </div>
                      ) : <span style={{ fontSize: 12, color: 'var(--text-4)' }}>No markers</span>}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{doc.lastActivity}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div className="flex items-center gap-1">
                        <button className="btn btn-ghost" style={{ padding: '5px 8px' }} onClick={() => handleView(doc)} title="View">
                          <Eye size={15} style={{ color: 'var(--text-3)' }} />
                        </button>
                        {doc.status === 'signed' && (
                          <button className="btn btn-ghost" style={{ padding: '5px 8px' }} onClick={() => handleDownload(doc)} title="Download">
                            <Download size={15} style={{ color: 'var(--text-3)' }} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </AppLayout>
  )
}
