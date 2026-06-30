import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  Eye, ArrowRight, X, Plus, Pen, Type, Calendar, Hash,
  ChevronDown, Trash2, CheckCircle2, Lock, FileText, Send,
  Shield, AlertCircle, ZoomIn, ZoomOut
} from 'lucide-react'
import SignatureModal from '../components/SignatureModal'
import InviteModal from '../components/InviteModal'
import AuditPanel from '../components/AuditPanel'

const FIELDS = [
  { type: 'signature', icon: Pen, label: 'Signature', sub: 'Click to sign' },
  { type: 'initials', icon: Hash, label: 'Initials', sub: 'Small signature' },
  { type: 'date', icon: Calendar, label: 'Date signed', sub: 'Auto-filled date' },
  { type: 'text', icon: Type, label: 'Text input', sub: 'Custom text field' },
]

const DOC_CONTENT = [
  { type: 'h1', text: 'Standard Employment Agreement' },
  { type: 'hr' },
  { type: 'p', text: 'This Agreement is made as of this 24th day of May, 2024, by and between SignHere Technologies Inc. (the "Company") and the individual identified below (the "Employee").' },
  { type: 'h2', text: '1. Position and Duties' },
  { type: 'p', text: 'The Employee shall serve in the position of Senior Product Designer. In this capacity, the Employee shall exercise such powers as are typically associated with such position.' },
  { type: 'h2', text: '2. Compensation' },
  { type: 'p', text: 'The Company shall pay the Employee a base salary of $165,000 per annum, payable in accordance with the Company\'s standard payroll practices.' },
  { type: 'h2', text: '3. Confidentiality' },
  { type: 'p', text: 'The Employee agrees to keep confidential all proprietary information, trade secrets, and business data belonging to the Company during and after employment.' },
  { type: 'sig-row' },
]

export default function DocumentEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { documents, user, signDocument, updateDocument, showToast, mockUsers } = useApp()
  const doc = documents.find(d => d.id === id)

  const [activeAssignee, setActiveAssignee] = useState(user)
  const [markers, setMarkers] = useState(doc?.markers || [])
  const [showSignModal, setShowSignModal] = useState(null) // marker id
  const [showInvite, setShowInvite] = useState(false)
  const [showAudit, setShowAudit] = useState(false)
  const [dragField, setDragField] = useState(null)
  const [recipients, setRecipients] = useState(doc?.recipients || [])
  const [panel, setPanel] = useState('fields') // fields | recipients | audit
  const docRef = useRef()

  useEffect(() => { setMarkers(doc?.markers || []) }, [id])

  if (!doc) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
      <FileText size={48} style={{ color: 'var(--text-4)' }} />
      <h2 style={{ fontSize: 20, fontWeight: 600 }}>Document not found</h2>
      <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Back to dashboard</button>
    </div>
  )

  const handleDocClick = (e) => {
    if (!dragField) return
    const rect = docRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    const newMarker = {
      id: 'm' + Date.now(),
      x: Math.max(5, Math.min(85, x)),
      y: Math.max(5, Math.min(95, y)),
      type: dragField,
      assignedTo: activeAssignee,
      signed: false,
    }
    setMarkers(p => [...p, newMarker])
    setDragField(null)
    showToast(`${dragField} field placed for ${activeAssignee?.name}`)
  }

  const removeMarker = (mid) => setMarkers(p => p.filter(m => m.id !== mid))

  const handleSign = (markerId) => setShowSignModal(markerId)

  const handleSignComplete = (signatureData) => {
    signDocument(doc.id, showSignModal, signatureData)
    setMarkers(p => p.map(m => m.id === showSignModal ? { ...m, signed: true, signedAt: new Date() } : m))
    setShowSignModal(null)
    showToast('Document signed — metadata embedded (FR-011)')
    const allSigned = markers.every(m => m.id === showSignModal ? true : m.signed)
    if (allSigned && markers.length > 0) {
      setTimeout(() => navigate(`/documents/${doc.id}/complete`), 800)
    }
  }

  const handleSendInvitations = (invitees) => {
    setRecipients(invitees)
    updateDocument(doc.id, { recipients: invitees, status: 'pending', markers })
    setShowInvite(false)
    showToast(`Invitations sent to ${invitees.length} signator${invitees.length > 1 ? 'ies' : 'y'} (FR-007)`)
  }

  const canSign = markers.some(m => !m.signed && m.assignedTo?.id === user?.id)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top bar */}
      <div style={{ height: 52, background: 'var(--white)', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16, flexShrink: 0, zIndex: 10 }}>
        <div style={{ width: 28, height: 28, background: 'var(--brand)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>S</span>
        </div>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)' }}>{doc.name}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowAudit(p => !p)} style={{ gap: 6, color: 'var(--text-2)' }}>
            <Shield size={14} /> Audit log
          </button>
          <button className="btn btn-ghost btn-sm" style={{ gap: 6, color: 'var(--text-2)' }}>
            <Eye size={14} /> Preview
          </button>
          {doc.status === 'draft' || doc.status === 'pending' ? (
            canSign ? (
              <button className="btn btn-primary btn-sm" style={{ gap: 6 }} onClick={() => {
                const myMarker = markers.find(m => !m.signed && m.assignedTo?.id === user?.id)
                if (myMarker) handleSign(myMarker.id)
              }}>
                <Pen size={14} /> Sign now
              </button>
            ) : (
              <button className="btn btn-primary btn-sm" style={{ gap: 6 }} onClick={() => setShowInvite(true)}>
                Next: add recipients <ArrowRight size={14} />
              </button>
            )
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--signed-text)', fontWeight: 600 }}>
              <CheckCircle2 size={15} /> Fully signed
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left toolbar */}
        <div style={{ width: 44, background: 'var(--white)', borderRight: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 8, flexShrink: 0 }}>
          {[
            { icon: FileText, key: 'fields', title: 'Fields' },
            { icon: Shield, key: 'audit', title: 'Audit' },
          ].map(({ icon: Icon, key, title }) => (
            <button key={key} title={title} onClick={() => setPanel(p => p === key ? null : key)} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: panel === key ? 'var(--brand-light)' : 'transparent', color: panel === key ? 'var(--brand)' : 'var(--text-3)', transition: 'all 0.15s' }}>
              <Icon size={18} />
            </button>
          ))}
        </div>

        {/* Document canvas */}
        <div style={{ flex: 1, background: '#E8E4DE', overflow: 'auto', display: 'flex', justifyContent: 'center', padding: '28px 24px', cursor: dragField ? 'crosshair' : 'default' }}>
          <div ref={docRef} onClick={handleDocClick} style={{ width: 760, background: 'var(--white)', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', borderRadius: 4, padding: '60px 72px', minHeight: 1000, position: 'relative', userSelect: 'none' }}>
            {/* Document content */}
            {DOC_CONTENT.map((block, i) => {
              if (block.type === 'h1') return <h1 key={i} style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>{block.text}</h1>
              if (block.type === 'hr') return <div key={i} style={{ height: 2, background: 'var(--brand)', marginBottom: 20 }} />
              if (block.type === 'h2') return <h2 key={i} style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', marginTop: 24, marginBottom: 8 }}>{block.text}</h2>
              if (block.type === 'p') return <p key={i} style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 12 }}>{block.text}</p>
              if (block.type === 'sig-row') return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 48, borderTop: '1px solid var(--border-light)', paddingTop: 32 }}>
                  {[{ label: 'EMPLOYER SIGNATURE', date: 'DATE' }, { label: 'EMPLOYEE SIGNATURE', date: 'DATE SIGNED' }].map(({ label, date }) => (
                    <div key={label}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 24 }}>{label}</div>
                      <div style={{ height: 1, background: 'var(--border)', marginBottom: 6 }} />
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)' }}>{date}</div>
                      <div style={{ height: 1, background: 'var(--border)', marginTop: 18 }} />
                    </div>
                  ))}
                </div>
              )
              return null
            })}

            {/* SHA-256 hash display */}
            <div style={{ marginTop: 40, padding: '10px 14px', background: 'var(--cream)', borderRadius: 6, fontSize: 11, fontFamily: 'monospace', color: 'var(--text-3)', wordBreak: 'break-all' }}>
              Document hash (SHA-256): {doc.hash}
            </div>

            {/* Markers */}
            {markers.map(marker => (
              <div key={marker.id} style={{ position: 'absolute', left: `${marker.x}%`, top: `${marker.y}%`, transform: 'translate(-50%, -50%)', zIndex: 10 }}>
                {marker.signed ? (
                  <div style={{ padding: '6px 12px', background: 'var(--signed-bg)', border: '1px solid var(--signed-border)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6, minWidth: 120 }}>
                    <CheckCircle2 size={12} style={{ color: 'var(--signed-text)', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--signed-text)', fontWeight: 600 }}>Signed</div>
                      <div style={{ fontSize: 9, color: 'var(--signed-text)', opacity: 0.8 }}>{marker.assignedTo?.name}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div
                      onClick={(e) => { e.stopPropagation(); if (marker.assignedTo?.id === user?.id) handleSign(marker.id) }}
                      style={{
                        padding: '8px 14px', border: `1.5px dashed ${marker.assignedTo?.id === user?.id ? 'var(--brand)' : 'var(--text-4)'}`,
                        background: marker.assignedTo?.id === user?.id ? 'var(--brand-light)' : 'rgba(250,247,242,0.9)',
                        borderRadius: 6, cursor: marker.assignedTo?.id === user?.id ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', gap: 6, minWidth: 110, position: 'relative',
                      }}>
                      {marker.assignedTo?.id === user?.id ? (
                        <>
                          <Pen size={12} style={{ color: 'var(--brand)' }} />
                          <span style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 600 }}>Click to sign</span>
                        </>
                      ) : (
                        <>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: marker.assignedTo?.avatarColor || 'var(--text-3)', flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{marker.assignedTo?.name?.split(' ')[0]}</span>
                        </>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); removeMarker(marker.id) }} style={{ position: 'absolute', top: -7, right: -7, width: 16, height: 16, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                        <X size={8} style={{ color: 'var(--text-3)' }} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {dragField && (
              <div style={{ position: 'absolute', inset: 0, border: '2px solid var(--brand)', borderRadius: 4, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(155,58,26,0.04)' }}>
                <div style={{ background: 'var(--brand)', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                  Click to place {dragField} field
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        {panel === 'fields' && (
          <div style={{ width: 272, background: 'var(--white)', borderLeft: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
            <div style={{ padding: '18px 18px 12px', borderBottom: '1px solid var(--border-light)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Standard fields</h3>
              <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>Drag fields onto the document to request information.</p>
            </div>

            {/* Fields */}
            <div style={{ padding: '14px 14px', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {FIELDS.map(({ type, icon: Icon, label, sub }) => (
                  <div key={type}
                    onClick={() => setDragField(dragField === type ? null : type)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                      border: `1.5px solid ${dragField === type ? 'var(--brand)' : 'var(--border)'}`,
                      borderRadius: 10, cursor: 'pointer',
                      background: dragField === type ? 'var(--brand-light)' : 'var(--white)',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (dragField !== type) e.currentTarget.style.borderColor = 'var(--brand-mid)' }}
                    onMouseLeave={e => { if (dragField !== type) e.currentTarget.style.borderColor = 'var(--border)' }}>
                    <div style={{ width: 38, height: 38, background: dragField === type ? 'var(--brand)' : 'var(--brand-light)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={18} style={{ color: dragField === type ? '#fff' : 'var(--brand)' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: dragField === type ? 'var(--brand)' : 'var(--text-1)' }}>{label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Assigned to */}
            <div style={{ padding: '14px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 10 }}>Assigned to</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[user, ...recipients.filter(r => r.id !== user?.id)].map(u => u && (
                  <button key={u.id} onClick={() => setActiveAssignee(u)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    border: `1.5px solid ${activeAssignee?.id === u.id ? 'var(--brand)' : 'var(--border)'}`,
                    borderRadius: 10, background: activeAssignee?.id === u.id ? 'var(--brand-light)' : 'var(--white)',
                    cursor: 'pointer', transition: 'all 0.15s', width: '100%',
                  }}>
                    <div style={{ width: 32, height: 32, background: u.avatarColor, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{u.initials}</div>
                    <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}{u.id === user?.id ? ' (You)' : ''}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                    </div>
                    {activeAssignee?.id === u.id && <CheckCircle2 size={14} style={{ color: 'var(--brand)', marginLeft: 'auto', flexShrink: 0 }} />}
                  </button>
                ))}
                <button onClick={() => setShowInvite(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: '1.5px dashed var(--border)', borderRadius: 10, background: 'transparent', cursor: 'pointer', color: 'var(--text-3)', fontSize: 13, width: '100%', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--brand)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)' }}>
                  <Plus size={14} /> Add signatory
                </button>
              </div>
            </div>

            {/* Markers summary */}
            {markers.length > 0 && (
              <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border-light)', marginTop: 'auto' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-3)', textTransform: 'uppercase', margin: '14px 0 8px' }}>Placed fields ({markers.length})</div>
                {markers.map(m => (
                  <div key={m.id} className="flex items-center justify-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <div className="flex items-center gap-2">
                      {m.signed ? <CheckCircle2 size={12} style={{ color: 'var(--signed-text)' }} /> : <Pen size={12} style={{ color: 'var(--text-3)' }} />}
                      <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{m.type} — {m.assignedTo?.name?.split(' ')[0]}</span>
                    </div>
                    {!m.signed && <button onClick={() => removeMarker(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: 2 }}><Trash2 size={12} /></button>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {panel === 'audit' && <AuditPanel doc={doc} onClose={() => setPanel('fields')} />}
      </div>

      {showSignModal && (
        <SignatureModal
          marker={markers.find(m => m.id === showSignModal)}
          doc={doc}
          onSign={handleSignComplete}
          onClose={() => setShowSignModal(null)}
        />
      )}

      {showInvite && (
        <InviteModal
          doc={doc}
          currentRecipients={recipients}
          onSend={handleSendInvitations}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  )
}