import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AppLayout from '../components/AppLayout'
import { CheckCircle2, Download, Lock, Shield, FileText, ArrowLeft, Clock, User } from 'lucide-react'

function fmtDate(d) {
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function DocumentComplete() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { documents, logAuditEvent, showToast } = useApp()
  const doc = documents.find(d => d.id === id)

  if (!doc) return (
    <AppLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 16 }}>
        <FileText size={48} style={{ color: 'var(--text-4)' }} />
        <h2>Document not found</h2>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Back</button>
      </div>
    </AppLayout>
  )

  const handleDownload = () => {
    logAuditEvent(doc.id, 'download')
    showToast(`${doc.name} downloaded · Audit event logged`)
  }

  const signedMarkers = doc.markers.filter(m => m.signed)

  return (
    <AppLayout>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
        {/* Back */}
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/documents')} style={{ gap: 6, color: 'var(--text-3)', marginBottom: 32 }}>
          <ArrowLeft size={14} /> Back to documents
        </button>

        {/* Success header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 72, height: 72, background: 'var(--signed-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '3px solid var(--signed-border)' }}>
            <CheckCircle2 size={36} style={{ color: 'var(--signed-text)' }} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.5px' }}>Document fully signed & locked</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 15, lineHeight: 1.6, maxWidth: 480, margin: '0 auto' }}>
            All required signatures have been collected. This document is now cryptographically locked and cannot be modified (FR-012).
          </p>
        </div>

        {/* Document card */}
        <div className="card" style={{ padding: '24px', marginBottom: 24 }}>
          <div className="flex items-center gap-4" style={{ marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, background: 'var(--cream-dark)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <FileText size={22} style={{ color: 'var(--text-3)' }} />
              <div style={{ position: 'absolute', bottom: -4, right: -4, width: 18, height: 18, background: 'var(--signed-text)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                <Lock size={9} style={{ color: '#fff' }} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{doc.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{doc.category} · {doc.size} · {doc.pages} pages</div>
            </div>
            <span className="badge badge-signed"><span className="dot dot-signed" />Signed</span>
          </div>

          {/* Hash */}
          <div style={{ padding: '10px 14px', background: 'var(--cream)', borderRadius: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>SHA-256 Baseline Hash (FR-010)</div>
            <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-2)', wordBreak: 'break-all' }}>{doc.hash}</div>
          </div>

          <button className="btn btn-primary w-full" style={{ justifyContent: 'center', gap: 8, fontSize: 15, padding: '12px 0' }} onClick={handleDownload}>
            <Download size={18} /> Download signed document
          </button>
        </div>

        {/* Signatures summary */}
        <div className="card" style={{ padding: '24px', marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Signatures ({signedMarkers.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {signedMarkers.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: '1px solid var(--signed-border)', borderRadius: 10, background: 'var(--signed-bg)' }}>
                <div style={{ width: 36, height: 36, background: m.assignedTo?.avatarColor || 'var(--brand)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {m.assignedTo?.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{m.assignedTo?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{m.assignedTo?.email}</div>
                  {m.metadata && (
                    <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>
                      Cert: {m.metadata.certId} · {m.metadata.algorithm}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--signed-text)', display: 'block', marginBottom: 4, marginLeft: 'auto' }} />
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{m.signedAt ? fmtDate(m.signedAt) : '—'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance info */}
        <div className="card" style={{ padding: '20px 24px', background: 'var(--cream)', border: '1px solid var(--border-light)' }}>
          <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
            <Shield size={16} style={{ color: 'var(--brand)', flexShrink: 0 }} />
            <h4 style={{ fontSize: 14, fontWeight: 600 }}>Legal validity & compliance</h4>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              ['eIDAS compliant', 'Legally binding in EU'],
              ['ESIGN Act compliant', 'Legally binding in US'],
              ['X.509 certificates', 'Cryptographic identity'],
              ['SHA-256 integrity', 'Tamper detection'],
              ['Full audit trail', 'FR-016 compliant'],
              ['AES-256 encrypted', 'NFR-004 compliant'],
            ].map(([title, sub]) => (
              <div key={title} className="flex items-center gap-2">
                <CheckCircle2 size={13} style={{ color: 'var(--signed-text)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
