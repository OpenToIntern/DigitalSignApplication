import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  FileText, ChevronLeft, ChevronRight, Users, Plus, Send,
  PenSquare, Lock, Calendar, Eye, ZoomIn, ZoomOut, RotateCcw, RotateCw
} from 'lucide-react'
import AppLayout from '../components/AppLayout'
import SignatureModal from '../components/SignatureModal'
import InviteModal from '../components/InviteModal'
import { useApp } from '../context/AppContext'
import type { Document, Marker, User, SignatureData } from '../types'
import { SUPERVISOR_USER, MANAGER_USER } from '../constants/mockData'

export default function DocumentEditor() {
  const { id } = useParams<{ id: string }>()
  const { documents, updateDocument, currentUser } = useApp()
  const navigate = useNavigate()

  const doc = documents.find(d => d.id === id)

  const [activePage, setActivePage] = useState(1)
  const [markers, setMarkers] = useState<Marker[]>([])
  const [showInvite, setShowInvite] = useState(false)
  const [showSign, setShowSign] = useState(false)
  const [activeMarkerToSign, setActiveMarkerToSign] = useState<Marker | null>(null)
  
  // Assignee selector state
  const [assignedUser, setAssignedUser] = useState<User>(SUPERVISOR_USER)

  // Dragging states
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (marker: Marker, e: React.MouseEvent) => {
    if (!canPlaceMarkers) return
    e.preventDefault()
    e.stopPropagation()
    setDraggingId(marker.id)
    
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top
    
    setDragOffset({
      x: clickX - marker.x,
      y: clickY - marker.y,
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingId || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top
    
    let newX = clickX - dragOffset.x
    let newY = clickY - dragOffset.y
    
    const marker = markers.find(m => m.id === draggingId)
    if (!marker) return
    
    newX = Math.max(0, Math.min(rect.width - marker.width, newX))
    newY = Math.max(0, Math.min(rect.height - marker.height, newY))
    
    const updated = markers.map(m => m.id === draggingId ? { ...m, x: newX, y: newY } : m)
    setMarkers(updated)
  }

  const handleMouseUp = () => {
    if (draggingId && doc) {
      updateDocument(doc.id, { markers })
      setDraggingId(null)
    }
  }

  useEffect(() => {
    if (doc) {
      setMarkers(doc.markers || [])
    }
  }, [doc])

  if (!doc) {
    return (
      <AppLayout>
        <div className="page-container flex flex-col items-center justify-center py-20 text-slate-500">
          <FileText size={48} className="mb-3 opacity-30" />
          <p className="text-sm font-semibold">Document not found</p>
          <button onClick={() => navigate('/documents')} className="btn-secondary mt-4">
            Back to Documents
          </button>
        </div>
      </AppLayout>
    )
  }

  const isStaff = currentUser?.accessRole === 'user'
  const isSupervisor = currentUser?.accessRole === 'supervisor'
  const isManager = currentUser?.accessRole === 'manager'

  const canPlaceMarkers = isStaff && (doc.status === 'draft' || doc.status === 'rejected')
  const canSupervisorSign = isSupervisor && doc.status === 'pending_supervisor'
  const canManagerSign = isManager && doc.status === 'pending_manager'

  const handlePlaceMarker = (type: Marker['type']) => {
    if (!canPlaceMarkers) return
    const newMarker: Marker = {
      id: `m-${Date.now()}`,
      x: 100 + (markers.length * 15) % 150,
      y: 360 + (markers.length * 20) % 100,
      width: type === 'signature' ? 140 : 100,
      height: 45,
      page: activePage,
      type,
      assignedTo: assignedUser,
      signed: false,
    }
    const updated = [...markers, newMarker]
    setMarkers(updated)
    updateDocument(doc.id, { markers: updated })
  }

  const handleMarkerClick = (marker: Marker) => {
    const isAssigned = marker.assignedTo.accessRole === currentUser?.accessRole
    const isSupervisorTurn = canSupervisorSign && marker.assignedTo.accessRole === 'supervisor'
    const isManagerTurn = canManagerSign && marker.assignedTo.accessRole === 'manager'

    if (isAssigned && !marker.signed) {
      if (isSupervisorTurn || isManagerTurn) {
        setActiveMarkerToSign(marker)
        setShowSign(true)
      }
    }
  }

  const handleSignConfirm = (sig: SignatureData) => {
    if (!activeMarkerToSign) return

    const now = new Date()
    const certId = `CERT-${currentUser?.accessRole?.toUpperCase()}-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`

    const updatedMarkers = markers.map(m => {
      if (m.id === activeMarkerToSign.id) {
        return {
          ...m,
          signed: true,
          signedAt: now,
          signature: sig.dataUrl,
          metadata: {
            signerId: currentUser?.id,
            signerEmail: currentUser?.email,
            timestamp: now.toISOString(),
            ip: '192.168.1.108',
            certId,
            algorithm: 'SHA-256',
            baselineHash: doc.baselineHash || 'a1b2c3d4...',
          }
        }
      }
      return m
    })

    setMarkers(updatedMarkers)
    setShowSign(false)

    const newAuditLog = [
      ...(doc.auditLog || []),
      {
        id: `al-${Date.now()}`,
        event: 'DOCUMENT_SIGNED',
        user: currentUser!,
        timestamp: now,
        ip: '192.168.1.108',
        documentId: doc.id,
        documentName: doc.name,
        metadata: { certId, algorithm: 'SHA-256' },
      }
    ]

    let nextStatus = doc.status
    if (isSupervisor) {
      nextStatus = 'pending_manager'
    } else if (isManager) {
      nextStatus = 'locked'
      newAuditLog.push({
        id: `al-${Date.now() + 1}`,
        event: 'DOCUMENT_LOCKED',
        user: null,
        timestamp: now,
        ip: 'system',
        documentId: doc.id,
        documentName: doc.name,
        metadata: { action: 'Auto-locked after final signature' }
      })
    }

    updateDocument(doc.id, {
      markers: updatedMarkers,
      status: nextStatus,
      auditLog: newAuditLog,
      updatedAt: now,
    })

    if (nextStatus === 'locked') {
      navigate('/complete', { state: { documentName: doc.name, docId: doc.id } })
    }
  }

  const handleSendWorkflow = () => {
    if (markers.length === 0) return
    setShowInvite(true)
  }

  const handleInviteConfirm = () => {
    const now = new Date()
    updateDocument(doc.id, {
      status: 'pending_supervisor',
      auditLog: [
        ...(doc.auditLog || []),
        {
          id: `al-${Date.now()}`,
          event: 'SIGNATURE_MARKERS_PLACED',
          user: currentUser!,
          timestamp: now,
          ip: '192.168.1.108',
          documentId: doc.id,
          documentName: doc.name,
        },
        {
          id: `al-${Date.now() + 1}`,
          event: 'SIGNING_INVITATION_SENT',
          user: currentUser!,
          timestamp: now,
          ip: '192.168.1.108',
          documentId: doc.id,
          documentName: doc.name,
          metadata: { action: 'Invited Supervisor and Manager' }
        }
      ]
    })
    setShowInvite(false)
    navigate('/documents')
  }

  const deleteMarker = (mid: string) => {
    if (!canPlaceMarkers) return
    const updated = markers.filter(m => m.id !== mid)
    setMarkers(updated)
    updateDocument(doc.id, { markers: updated })
  }

  const renderDocumentMockup = () => {
    const lowerName = doc.name.toLowerCase()
    if (doc.id === 'doc-002' || lowerName.includes('employment') || lowerName.includes('contract')) {
      return (
        <div className="space-y-4 text-slate-700 text-left h-full">
          <h3 className="text-left font-display font-extrabold text-base text-slate-800 border-b border-primary/20 pb-2">
            Standard Employment Agreement
          </h3>
          <p className="text-[11px] leading-relaxed text-slate-600">
            This Agreement is made as of this 24th day of May, 2024, by and between <span className="font-bold text-slate-800">SignHere Technologies Inc.</span> (the "Company") and the individual identified below (the "Employee").
          </p>
          <p className="text-[11px] leading-relaxed font-bold text-slate-800">
            1. Position and Duties
          </p>
          <p className="text-[11px] leading-relaxed text-slate-600">
            The Employee shall serve in the position of Senior Product Designer. In this capacity, the Employee shall perform such duties and exercise such powers as are typically associated with such position in a high-growth SaaS environment.
          </p>
          <p className="text-[11px] leading-relaxed font-bold text-slate-800">
            2. Compensation
          </p>
          <p className="text-[11px] leading-relaxed text-slate-600">
            The Company shall pay the Employee a base salary of $165,000 per annum, payable in accordance with the Company's standard payroll practices. The Employee is also eligible for performance bonuses as determined by the board.
          </p>

          {/* Final Signatures box lines */}
          <div className="absolute bottom-10 left-10 right-10 grid grid-cols-2 gap-10 pt-4 border-t border-outline-variant/40">
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Employer Signature</p>
              <div className="h-0.5 bg-slate-200 mt-6" />
              <p className="text-[9px] text-slate-400 mt-1">Date</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Employee Signature</p>
              <div className="h-0.5 bg-slate-200 mt-6" />
              <p className="text-[9px] text-slate-400 mt-1">Date Signed</p>
            </div>
          </div>
        </div>
      )
    }

    if (doc.id === 'doc-001' || lowerName.includes('nda') || lowerName.includes('disclosure')) {
      return (
        <div className="space-y-4 text-slate-700 text-left h-full">
          <h3 className="font-display font-extrabold text-base text-slate-800 border-b border-primary/20 pb-2">
            Mutual Non-Disclosure Agreement
          </h3>
          <p className="text-[11px] leading-relaxed text-slate-600">
            This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of the Effective Date, by and between the parties to protect confidential information shared for business purposes.
          </p>
          <p className="text-[11px] leading-relaxed font-bold text-slate-800">
            1. Definition of Confidential Information
          </p>
          <p className="text-[11px] leading-relaxed text-slate-600">
            Confidential Information refers to proprietary data, product maps, customer records, software source code, and key digital signatures.
          </p>
          <p className="text-[11px] leading-relaxed font-bold text-slate-800">
            2. Term and Termination
          </p>
          <p className="text-[11px] leading-relaxed text-slate-600">
            The obligations of confidentiality shall remain in effect for a period of five (5) years from the date of disclosure.
          </p>

          {/* Final Signatures box lines */}
          <div className="absolute bottom-10 left-10 right-10 grid grid-cols-2 gap-10 pt-4 border-t border-outline-variant/40">
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Disclosing Party Signature</p>
              <div className="h-0.5 bg-slate-200 mt-6" />
              <p className="text-[9px] text-slate-400 mt-1">Date</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Receiving Party Signature</p>
              <div className="h-0.5 bg-slate-200 mt-6" />
              <p className="text-[9px] text-slate-400 mt-1">Date Signed</p>
            </div>
          </div>
        </div>
      )
    }

    // Default dynamic visual wrapper for custom uploaded PDFs (e.g. CVs or other files)
    return (
      <div className="space-y-6 text-slate-700 text-left h-full flex flex-col justify-between">
        <div className="border-b border-slate-200 pb-3">
          <h3 className="font-display font-extrabold text-sm text-slate-800 truncate max-w-[420px]">
            {doc.name}
          </h3>
          <p className="text-[9px] text-slate-400 font-mono mt-0.5">
            Original PDF Document · Size: {doc.size} · SHA-256 baseline hash verified
          </p>
        </div>
        
        <div className="flex-1 flex flex-col justify-center items-center py-6 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200/80 p-5 select-none my-2">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2.5">
            <FileText size={20} />
          </div>
          <h4 className="text-xs font-bold text-slate-800 mb-0.5">
            PDF Document Workspace
          </h4>
          <p className="text-[10px] text-slate-500 max-w-sm leading-relaxed">
            This represents your uploaded document page. Drag signature widgets from the right sidebar panel to place them anywhere on this document.
          </p>
        </div>

        <div className="pt-2 text-[9px] text-slate-400/80 border-t border-slate-100 flex justify-between font-mono">
          <span>Page {activePage} of {doc.pageCount || 1}</span>
          <span>SignHere Secure Node API v2</span>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      {/* Editor Sub-Header / Topbar */}
      <div className="h-14 border-b border-outline-variant/60 bg-surface-container-lowest flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-lg font-display font-extrabold text-primary">SignHere</span>
          <span className="text-outline-variant">|</span>
          <span className="text-xs font-semibold text-on-surface truncate max-w-[240px]">{doc.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-ghost text-xs font-bold gap-1">
            <Eye size={14} /> PREVIEW
          </button>
          {canPlaceMarkers && (
            <button
              onClick={handleSendWorkflow}
              disabled={markers.length === 0}
              className="btn-primary py-2 px-4 text-xs font-bold"
            >
              Next: Add Recipients <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 h-[calc(100vh-7rem)] overflow-hidden">
        {/* Editor Main Canvas */}
        <div className="flex-1 flex flex-col bg-surface-container-low overflow-y-auto p-8 relative items-center justify-center bg-confetti-gradient">
          
          {/* Main White Page Canvas */}
          <div className="relative w-full max-w-2xl bg-white text-slate-900 border border-outline-variant/80 rounded-lg overflow-hidden flex flex-col shadow-md" style={{ height: '560px' }}>
            
            {/* Agreement contents mockup */}
            <div
              ref={containerRef}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="flex-1 p-10 relative overflow-hidden bg-white select-none"
            >
              {renderDocumentMockup()}

              {/* Render Dragged / Placed Node Markers */}
              {markers.filter(m => m.page === activePage).map(marker => {
                const isAssignedToCurrent = marker.assignedTo.accessRole === currentUser?.accessRole
                const isClickable = isAssignedToCurrent && !marker.signed &&
                  ((canSupervisorSign && marker.assignedTo.accessRole === 'supervisor') ||
                   (canManagerSign && marker.assignedTo.accessRole === 'manager'))

                return (
                  <div
                    key={marker.id}
                    onMouseDown={(e) => handleMouseDown(marker, e)}
                    onClick={() => handleMarkerClick(marker)}
                    style={{
                      position: 'absolute',
                      left: `${marker.x}px`,
                      top: `${marker.y}px`,
                      width: `${marker.width}px`,
                      height: `${marker.height}px`,
                      cursor: canPlaceMarkers ? 'move' : 'pointer',
                    }}
                    className={`rounded-lg border shadow-sm flex items-center justify-between px-3 py-1 cursor-pointer transition-all select-none
                      ${marker.signed
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : isClickable
                          ? 'border-primary bg-primary-container text-on-primary-container animate-pulse ring-2 ring-primary/30'
                          : 'border-outline-variant bg-surface-container-low text-on-surface'
                      }`}
                  >
                    {marker.signed ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <img src={marker.signature} alt="Sig" className="max-h-8 max-w-[80px] object-contain" />
                        <span className="text-[8px] font-mono text-emerald-600 block leading-tight">
                          Signed<br/>✓ Secure
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold truncate capitalize">{marker.type}</p>
                          <p className="text-[8px] text-on-surface-variant truncate">{marker.assignedTo.name.split(' ')[0]}</p>
                        </div>
                        {canPlaceMarkers && (
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteMarker(marker.id) }}
                            className="p-0.5 text-on-surface-variant hover:text-error rounded hover:bg-surface-container"
                          >
                            ×
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bottom Zoom/Undo Page Controls Bar */}
          <div className="mt-4 px-6 py-2 bg-white rounded-full border border-outline-variant shadow-sm flex items-center gap-6 text-xs text-on-surface-variant">
            <div className="flex items-center gap-3">
              <button className="p-1 hover:bg-surface-container rounded"><ZoomOut size={14} /></button>
              <span className="font-semibold font-mono">100%</span>
              <button className="p-1 hover:bg-surface-container rounded"><ZoomIn size={14} /></button>
            </div>
            <div className="w-px h-4 bg-outline-variant" />
            <div className="flex items-center gap-3">
              <button className="p-1 hover:bg-surface-container rounded" title="Undo"><RotateCcw size={14} /></button>
              <button className="p-1 hover:bg-surface-container rounded" title="Redo"><RotateCw size={14} /></button>
            </div>
            <div className="w-px h-4 bg-outline-variant" />
            <span className="font-semibold font-mono">Page 1 of {doc.pageCount || 1}</span>
          </div>
        </div>

        {/* Standard Fields sidebar (Right panel) */}
        <div className="w-80 border-l border-outline-variant/60 bg-surface-container-lowest flex flex-col justify-between">
          <div className="p-5 flex-1 overflow-y-auto space-y-6">
            
            {/* Panel Description */}
            <div>
              <h2 className="text-sm font-bold text-on-surface mb-1 font-display">Standard Fields</h2>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Drag fields onto the document to request information.
              </p>
            </div>

            {/* Field Types Cards (Staff placement tools) */}
            {canPlaceMarkers && (
              <div className="space-y-3">
                {[
                  { type: 'signature' as const, label: 'Signature', sub: 'Click to sign', icon: '' },
                  { type: 'initials' as const, label: 'Initials', sub: 'Small signature', icon: '' },
                  { type: 'date' as const, label: 'Date Signed', sub: 'Auto-filled date', icon: '' },
                  { type: 'text' as const, label: 'Text Input', sub: 'Custom text field', icon: 'Tt' },
                ].map(field => (
                  <button
                    key={field.type}
                    onClick={() => handlePlaceMarker(field.type)}
                    className="w-full flex items-center gap-3 p-3.5 text-left bg-surface-container-low border border-outline-variant/50 hover:border-primary/40 rounded-xl transition-all"
                  >
                    <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-base font-bold">
                      {field.icon}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface font-display">{field.label}</p>
                      <p className="text-[10px] text-on-surface-variant/75 mt-0.5">{field.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Assignee Option selection */}
            {canPlaceMarkers && (
              <div>
                <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Assigned To</h3>
                <select
                  value={assignedUser.id}
                  onChange={e => setAssignedUser(e.target.value === SUPERVISOR_USER.id ? SUPERVISOR_USER : MANAGER_USER)}
                  className="w-full input-field py-2 text-xs"
                >
                  <option value={SUPERVISOR_USER.id}>{SUPERVISOR_USER.name} (Supervisor)</option>
                  <option value={MANAGER_USER.id}>{MANAGER_USER.name} (Manager)</option>
                </select>
              </div>
            )}

            {/* Visual Flow details */}
            <div className="border-t border-outline-variant/40 pt-4">
              <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Recipients List</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs p-2.5 bg-surface-container-low rounded-lg">
                  <span className="text-on-surface-variant">1. Supervisor</span>
                  <span className="text-primary font-bold">Active</span>
                </div>
                <div className="flex justify-between items-center text-xs p-2.5 bg-surface-container-low rounded-lg">
                  <span className="text-on-surface-variant">2. Manager</span>
                  <span className="text-on-surface-variant/40">Locked</span>
                </div>
              </div>
            </div>
          </div>

          {/* Add Recipient bottom action */}
          {canPlaceMarkers && (
            <div className="p-5 border-t border-outline-variant/40">
              <button className="w-full btn-secondary justify-center py-2.5 text-xs font-bold">
                + ADD RECIPIENT
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Invite Signatories Modal */}
      {showInvite && (
        <InviteModal
          documentName={doc.name}
          onConfirm={handleInviteConfirm}
          onClose={() => setShowInvite(false)}
        />
      )}

      {/* Signature Draw Modal */}
      {showSign && (
        <SignatureModal
          onConfirm={handleSignConfirm}
          onClose={() => setShowSign(false)}
        />
      )}
    </AppLayout>
  )
}
