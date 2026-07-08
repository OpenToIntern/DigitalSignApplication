import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PenSquare, Clock, CheckCircle, XCircle, FileText, Eye, AlertCircle, Lock } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import SignatureModal from '../components/SignatureModal'
import { useApp } from '../context/AppContext'
import type { Document, SignatureData } from '../types'

function ManagerDocCard({
  doc,
  onSign,
  onReject,
  isLocked,
}: {
  doc: Document
  onSign: (doc: Document) => void
  onReject: (doc: Document) => void
  isLocked: boolean
}) {
  const navigate = useNavigate()
  return (
    <div className={`glass-card p-5 transition-all duration-200 ${isLocked ? 'opacity-60 bg-surface-container' : 'hover:border-primary/40'}`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
            <FileText size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-on-surface truncate">{doc.name}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              From: <span className="font-semibold">{doc.sender.name}</span> · {new Date(doc.uploadedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        {isLocked ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-container-high text-on-surface-variant border border-outline-variant/40">
            <Lock size={10} /> Locked (Pending Supervisor)
          </span>
        ) : (
          <span className="badge-pending whitespace-nowrap self-start sm:self-auto">
            <Clock size={12} /> Awaiting Your Signature
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/30 text-xs text-on-surface-variant">
        <AlertCircle size={12} className="text-primary flex-shrink-0" />
        {isLocked ? (
          <span>Sequential signing is enforced (FR-006a). Supervisor must approve first.</span>
        ) : (
          <span>Supervisor signature is recorded. You may now perform the final signoff.</span>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => navigate(`/documents/${doc.id}/editor`)}
          disabled={isLocked}
          className="btn-ghost text-xs flex-1 justify-center disabled:opacity-40"
        >
          <Eye size={13} /> Review
        </button>
        <button
          onClick={() => onReject(doc)}
          disabled={isLocked}
          className="btn-secondary text-xs flex-1 justify-center text-error border-error/30 hover:bg-error/5 disabled:opacity-40"
        >
          <XCircle size={13} /> Reject
        </button>
        <button
          onClick={() => onSign(doc)}
          disabled={isLocked}
          className="btn-primary text-xs flex-1 justify-center disabled:opacity-40"
        >
          <PenSquare size={13} /> Sign Now
        </button>
      </div>
    </div>
  )
}

export default function ManagerDashboard() {
  const { documents, updateDocument } = useApp()
  const [signingDoc, setSigningDoc] = useState<Document | null>(null)
  const [rejectingDoc, setRejectingDoc] = useState<Document | null>(null)
  const navigate = useNavigate()

  const readyDocs = documents.filter(d => d.status === 'pending_manager')
  const lockedDocs = documents.filter(d => d.status === 'pending_supervisor')
  const completedDocs = documents.filter(d => d.status === 'locked' || d.status === 'signed')

  const handleSign = (doc: Document) => setSigningDoc(doc)
  const handleReject = (doc: Document) => setRejectingDoc(doc)

  const handleSignConfirm = (sig: SignatureData) => {
    if (!signingDoc) return
    const updatedMarkers = (signingDoc.markers || []).map(m => {
      if (m.assignedTo.accessRole === 'manager' && !m.signed) {
        return {
          ...m,
          signed: true,
          signature: sig.dataUrl,
          signedAt: new Date(),
        }
      }
      return m
    })
    updateDocument(signingDoc.id, {
      status: 'locked',
      markers: updatedMarkers,
      updatedAt: new Date(),
    })
    setSigningDoc(null)
    navigate('/complete', { state: { documentName: signingDoc.name, docId: signingDoc.id } })
  }

  const handleRejectConfirm = () => {
    if (!rejectingDoc) return
    updateDocument(rejectingDoc.id, { status: 'rejected', updatedAt: new Date() })
    setRejectingDoc(null)
  }

  return (
    <AppLayout>
      <div className="page-container max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="section-title text-2xl flex items-center gap-2">
            <Lock className="text-primary" />
            Manager Sign Queue
          </h1>
          <p className="section-subtitle mt-0.5">Documents requiring final signature and secure locking</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Ready to Sign', value: readyDocs.length, color: 'text-amber-800' },
            { label: 'Locked/Awaiting First', value: lockedDocs.length, color: 'text-on-surface-variant/70' },
            { label: 'Completed & Locked', value: completedDocs.length, color: 'text-primary' },
          ].map((s, i) => (
            <div key={i} className="glass-card p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Ready queue */}
        <div>
          <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
            Ready for Your Signature ({readyDocs.length})
          </h2>

          {readyDocs.length === 0 ? (
            <div className="glass-card flex flex-col items-center justify-center py-16 text-on-surface-variant/60">
              <CheckCircle size={40} className="mb-3 text-emerald-500/40" />
              <p className="text-sm font-semibold text-emerald-800">All caught up!</p>
              <p className="text-xs mt-1">No documents waiting for your final signature.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {readyDocs.map(doc => (
                <ManagerDocCard key={doc.id} doc={doc} onSign={handleSign} onReject={handleReject} isLocked={false} />
              ))}
            </div>
          )}
        </div>

        {/* Locked queue */}
        {lockedDocs.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
              Awaiting Supervisor Signature First ({lockedDocs.length})
            </h2>
            <div className="space-y-4">
              {lockedDocs.map(doc => (
                <ManagerDocCard key={doc.id} doc={doc} onSign={handleSign} onReject={handleReject} isLocked={true} />
              ))}
            </div>
          </div>
        )}

        {/* Completed list */}
        {completedDocs.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
              Completed & Locked Documents ({completedDocs.length})
            </h2>
            <div className="glass-card overflow-hidden">
              {completedDocs.map((doc, i) => (
                <div
                  key={doc.id}
                  className={`flex items-center justify-between px-5 py-3.5 hover:bg-surface-container-low transition-colors ${i < completedDocs.length - 1 ? 'border-b border-outline-variant/30' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <FileText size={15} className="text-on-surface-variant" />
                    <div>
                      <p className="text-sm text-on-surface font-semibold">{doc.name}</p>
                      <p className="text-[10px] text-on-surface-variant">From: {doc.sender.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="badge-locked">Locked</span>
                    <button onClick={() => navigate(`/documents/${doc.id}/editor`)} className="btn-ghost text-xs py-1">
                      <Eye size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Signature Modal */}
      {signingDoc && (
        <SignatureModal
          onConfirm={handleSignConfirm}
          onClose={() => setSigningDoc(null)}
        />
      )}

      {/* Reject Confirm Modal */}
      {rejectingDoc && (
        <div className="modal-overlay">
          <div className="modal-content max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center text-error">
                <XCircle size={20} />
              </div>
              <div>
                <h3 className="font-display font-bold text-on-surface">Reject Document?</h3>
                <p className="text-xs text-on-surface-variant">Halt the signature flow.</p>
              </div>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed mb-5">
              Rejecting "<span className="text-on-surface font-semibold">{rejectingDoc.name}</span>" will halt the workflow and notify the Staff initiator.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setRejectingDoc(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleRejectConfirm} className="btn-danger flex-1">
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
