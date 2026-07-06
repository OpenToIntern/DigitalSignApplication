import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PenSquare, Clock, CheckCircle, XCircle, FileText, Eye, AlertCircle } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import SignatureModal from '../components/SignatureModal'
import { useApp } from '../context/AppContext'
import type { Document, SignatureData } from '../types'

function DocCard({ doc, onSign, onReject }: { doc: Document; onSign: (doc: Document) => void; onReject: (doc: Document) => void }) {
  const navigate = useNavigate()
  return (
    <div className="glass-card p-5 hover:border-primary/40 transition-colors animate-slide-up">
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
        <span className="badge-pending whitespace-nowrap self-start sm:self-auto">
          <Clock size={12} /> Awaiting Your Signature
        </span>
      </div>

      <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10 text-xs text-on-surface-variant">
        <AlertCircle size={12} className="text-primary flex-shrink-0" />
        You are Signatory #1. Manager is locked until you sign.
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => navigate(`/documents/${doc.id}/editor`)}
          className="btn-ghost text-xs flex-1 justify-center"
        >
          <Eye size={13} /> Review
        </button>
        <button
          onClick={() => onReject(doc)}
          className="btn-secondary text-xs flex-1 justify-center text-error border-error/30 hover:bg-error/5"
        >
          <XCircle size={13} /> Reject
        </button>
        <button
          onClick={() => onSign(doc)}
          className="btn-primary text-xs flex-1 justify-center"
        >
          <PenSquare size={13} /> Sign Now
        </button>
      </div>
    </div>
  )
}

export default function SupervisorDashboard() {
  const { documents, updateDocument } = useApp()
  const [signingDoc, setSigningDoc] = useState<Document | null>(null)
  const [rejectingDoc, setRejectingDoc] = useState<Document | null>(null)
  const navigate = useNavigate()

  const pendingDocs = documents.filter(d => d.status === 'pending_supervisor')
  const signedByMe = documents.filter(d =>
    d.status === 'pending_manager' || d.status === 'locked' || d.status === 'signed'
  )

  const handleSign = (doc: Document) => setSigningDoc(doc)
  const handleReject = (doc: Document) => setRejectingDoc(doc)

  const handleSignConfirm = (sig: SignatureData) => {
    if (!signingDoc) return
    const updatedMarkers = (signingDoc.markers || []).map(m => {
      if (m.assignedTo.accessRole === 'supervisor' && !m.signed) {
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
      status: 'pending_manager',
      markers: updatedMarkers,
      updatedAt: new Date(),
    })
    setSigningDoc(null)
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
            <PenSquare className="text-primary" />
            Supervisor Sign Queue
          </h1>
          <p className="section-subtitle mt-0.5">Documents awaiting your signature as first approver</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Pending Signature', value: pendingDocs.length, color: 'text-amber-800' },
            { label: 'Signed by You', value: signedByMe.length, color: 'text-emerald-800' },
            { label: 'Fully Completed', value: documents.filter(d => d.status === 'locked').length, color: 'text-primary' },
          ].map((s, i) => (
            <div key={i} className="glass-card p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Queue */}
        <div>
          <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
            Pending Action ({pendingDocs.length})
          </h2>

          {pendingDocs.length === 0 ? (
            <div className="glass-card flex flex-col items-center justify-center py-16 text-on-surface-variant/60">
              <CheckCircle size={40} className="mb-3 text-emerald-500/40" />
              <p className="text-sm font-semibold text-emerald-800">All caught up!</p>
              <p className="text-xs mt-1">No documents awaiting your signature.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingDocs.map(doc => (
                <DocCard key={doc.id} doc={doc} onSign={handleSign} onReject={handleReject} />
              ))}
            </div>
          )}
        </div>

        {/* Previous Signed list */}
        {signedByMe.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
              Previously Signed ({signedByMe.length})
            </h2>
            <div className="glass-card overflow-hidden">
              {signedByMe.map((doc, i) => (
                <div
                  key={doc.id}
                  className={`flex items-center justify-between px-5 py-3.5 hover:bg-surface-container-low transition-colors ${i < signedByMe.length - 1 ? 'border-b border-outline-variant/30' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <FileText size={15} className="text-on-surface-variant" />
                    <div>
                      <p className="text-sm text-on-surface font-semibold">{doc.name}</p>
                      <p className="text-[10px] text-on-surface-variant">From: {doc.sender.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {doc.status === 'pending_manager' ? (
                      <span className="badge-supervisor">Pending Manager</span>
                    ) : (
                      <span className="badge-locked">Completed</span>
                    )}
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

      {/* Sign modal */}
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
              Rejecting "<span className="text-on-surface font-semibold">{rejectingDoc.name}</span>" will halt the sequential signing flow and notify the Staff initiator.
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
