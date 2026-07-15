import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  FileText, ChevronLeft, ChevronRight, Users, Plus, Send,
  PenSquare, Lock, Calendar, Eye, ZoomIn, ZoomOut, RotateCcw, RotateCw, XCircle
} from 'lucide-react'
import AppLayout from '../components/AppLayout'
import SignatureModal from '../components/SignatureModal'
import InviteModal from '../components/InviteModal'
import PDFViewer from '../components/PDFViewer'
import { useApp } from '../context/AppContext'
import type { Document, Marker, User, SignatureData } from '../types'
import { SUPERVISOR_USER, MANAGER_USER } from '../constants/mockData'

const BASE_PDF_SCALE = 1.2
const MIN_MARKER_WIDTH = 80
const MIN_MARKER_HEIGHT = 30

export default function DocumentEditor() {
  const { id } = useParams<{ id: string }>()
  const { documents, updateDocument, currentUser } = useApp()
  const navigate = useNavigate()

  const doc = documents.find(d => d.id === id)

  const [activePage, setActivePage] = useState(1)
  const [markers, setMarkers] = useState<Marker[]>([])
  const markersRef = useRef<Marker[]>([])
  const [showInvite, setShowInvite] = useState(false)
  const [showSign, setShowSign] = useState(false)
  const [activeMarkerToSign, setActiveMarkerToSign] = useState<Marker | null>(null)
  const [pendingSignature, setPendingSignature] = useState<SignatureData | null>(null)
  
  // Assignee selector state
  const [assignedUser, setAssignedUser] = useState<User>(SUPERVISOR_USER)
  const [signatories, setSignatories] = useState<User[]>([SUPERVISOR_USER, MANAGER_USER])

  // Dragging and interactive states
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null)
  const dragMovedRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [pdfDimensions, setPdfDimensions] = useState<{ width: number; height: number } | null>(null)
  const [zoomScale, setZoomScale] = useState(1.2)

  // Resizing states
  const [resizingId, setResizingId] = useState<string | null>(null)
  const [resizeStartDims, setResizeStartDims] = useState({ width: 0, height: 0 })
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 })

  // Rejection states
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  // Panning/Scrolling states
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ scrollLeft: 0, scrollTop: 0, x: 0, y: 0 })
  const viewportRef = useRef<HTMLDivElement>(null)

  const handlePdfLoadSuccess = (info: { pageCount: number; width: number; height: number }) => {
    setPdfDimensions({ width: info.width, height: info.height })
    if (doc && doc.pageCount !== info.pageCount) {
      updateDocument(doc.id, { pageCount: info.pageCount })
    }
  }

  const getScaleFactor = () => zoomScale / BASE_PDF_SCALE

  const handleMarkerPointerDown = (marker: Marker, e: React.PointerEvent) => {
    if (!canMoveMarker(marker)) return
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDraggingId(marker.id)
    dragStartPosRef.current = { x: e.clientX, y: e.clientY }
    dragMovedRef.current = false
    
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top
    
    const scaleFactor = getScaleFactor()
    const visualX = marker.x * scaleFactor
    const visualY = marker.y * scaleFactor

    setDragOffset({
      x: clickX - visualX,
      y: clickY - visualY,
    })
  }

  const handleMarkerMove = (e: React.PointerEvent | React.MouseEvent) => {
    if (!draggingId || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()

    if (dragStartPosRef.current) {
      const deltaX = Math.abs(e.clientX - dragStartPosRef.current.x)
      const deltaY = Math.abs(e.clientY - dragStartPosRef.current.y)
      if (deltaX > 3 || deltaY > 3) {
        dragMovedRef.current = true
      }
    }
    
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top
    
    let newVisualX = clickX - dragOffset.x
    let newVisualY = clickY - dragOffset.y
    
    const marker = markers.find(m => m.id === draggingId)
    if (!marker) return
    
    const scaleFactor = getScaleFactor()
    const visualWidth = marker.width * scaleFactor
    const visualHeight = marker.height * scaleFactor

    newVisualX = Math.max(0, Math.min(rect.width - visualWidth, newVisualX))
    newVisualY = Math.max(0, Math.min(rect.height - visualHeight, newVisualY))
    
    const baseNewX = newVisualX / scaleFactor
    const baseNewY = newVisualY / scaleFactor

    const updated = markers.map(m => m.id === draggingId ? { ...m, x: baseNewX, y: baseNewY } : m)
    markersRef.current = updated
    setMarkers(updated)
  }

  const handleResizePointerDown = (marker: Marker, e: React.PointerEvent) => {
    if (!canResizeMarker(marker)) return
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setResizingId(marker.id)
    setResizeStartDims({ width: marker.width, height: marker.height })
    setResizeStartPos({ x: e.clientX, y: e.clientY })
  }

  const handleResizeMove = (e: React.PointerEvent | React.MouseEvent) => {
    if (!resizingId) return
    const marker = markers.find(m => m.id === resizingId)
    if (!marker) return

    const deltaX = e.clientX - resizeStartPos.x
    const deltaY = e.clientY - resizeStartPos.y

    const scaleFactor = getScaleFactor()
    const pageRect = containerRef.current?.getBoundingClientRect()
    const maxWidth = pageRect ? Math.max(MIN_MARKER_WIDTH, pageRect.width / scaleFactor - marker.x) : Infinity
    const maxHeight = pageRect ? Math.max(MIN_MARKER_HEIGHT, pageRect.height / scaleFactor - marker.y) : Infinity
    const newWidth = Math.min(maxWidth, Math.max(MIN_MARKER_WIDTH, resizeStartDims.width + (deltaX / scaleFactor)))
    const newHeight = Math.min(maxHeight, Math.max(MIN_MARKER_HEIGHT, resizeStartDims.height + (deltaY / scaleFactor)))

    const updated = markers.map(m => m.id === resizingId ? { ...m, width: newWidth, height: newHeight } : m)
    markersRef.current = updated
    setMarkers(updated)
  }

  const finishMarkerMove = () => {
    if (draggingId && doc) {
      updateDocument(doc.id, { markers: markersRef.current })
      setDraggingId(null)
      dragStartPosRef.current = null
    }
  }

  const handleViewportPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement
    // Avoid triggering panning when clicking nodes, buttons, dropdowns, etc.
    if (target.closest('.node-marker-item') || target.closest('button') || target.closest('select') || target.closest('input')) {
      return
    }
    if (e.button !== 0) return // Left click only
    
    e.preventDefault() // Prevents text selection/image dragging from interrupting our scroll panning
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsPanning(true)
    if (viewportRef.current) {
      setPanStart({
        scrollLeft: viewportRef.current.scrollLeft,
        scrollTop: viewportRef.current.scrollTop,
        x: e.clientX,
        y: e.clientY
      })
    }
  }

  const handleViewportPointerMove = (e: React.PointerEvent) => {
    if (isPanning && viewportRef.current) {
      const dx = e.clientX - panStart.x
      const dy = e.clientY - panStart.y
      viewportRef.current.scrollLeft = panStart.scrollLeft - dx
      viewportRef.current.scrollTop = panStart.scrollTop - dy
      return
    }

    if (resizingId) {
      handleResizeMove(e)
      
      // Auto edge scroll detection during resize
      if (viewportRef.current) {
        const viewport = viewportRef.current
        const rect = viewport.getBoundingClientRect()
        const relativeX = e.clientX - rect.left
        const relativeY = e.clientY - rect.top
        const scrollThreshold = 70
        const scrollSpeed = 16
        
        if (relativeY < scrollThreshold) {
          viewport.scrollTop -= scrollSpeed
        } else if (relativeY > rect.height - scrollThreshold) {
          viewport.scrollTop += scrollSpeed
        }
        if (relativeX < scrollThreshold) {
          viewport.scrollLeft -= scrollSpeed
        } else if (relativeX > rect.width - scrollThreshold) {
          viewport.scrollLeft += scrollSpeed
        }
      }
      return
    }

    if (draggingId) {
      handleMarkerMove(e)

      // Auto edge scroll detection during drag
      if (viewportRef.current) {
        const viewport = viewportRef.current
        const rect = viewport.getBoundingClientRect()
        const relativeX = e.clientX - rect.left
        const relativeY = e.clientY - rect.top
        const scrollThreshold = 70
        const scrollSpeed = 16
        
        if (relativeY < scrollThreshold) {
          viewport.scrollTop -= scrollSpeed
        } else if (relativeY > rect.height - scrollThreshold) {
          viewport.scrollTop += scrollSpeed
        }
        if (relativeX < scrollThreshold) {
          viewport.scrollLeft -= scrollSpeed
        } else if (relativeX > rect.width - scrollThreshold) {
          viewport.scrollLeft += scrollSpeed
        }
      }
    }
  }

  const handleViewportPointerUp = () => {
    if (isPanning) {
      setIsPanning(false)
    }
    if (draggingId) {
      finishMarkerMove()
    }
    if (resizingId) {
      if (doc) {
        updateDocument(doc.id, { markers: markersRef.current })
      }
      setResizingId(null)
    }
  }

  useEffect(() => {
    if (doc) {
      const nextMarkers = doc.markers || []
      markersRef.current = nextMarkers
      setMarkers(nextMarkers)
      const nextSignatories = doc.recipients?.length ? doc.recipients : [SUPERVISOR_USER, MANAGER_USER]
      setSignatories(nextSignatories)
      setAssignedUser(current => (
        nextSignatories.some(user => user.id === current.id || user.email === current.email)
          ? current
          : nextSignatories[0]
      ))
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
  const canCurrentSignerEditMarker = (marker: Marker) => {
    const isSigningWorkflow = doc.status === 'pending_supervisor' || doc.status === 'pending_manager'
    return isSigningWorkflow &&
      !marker.signed &&
      marker.assignedTo.accessRole === currentUser?.accessRole &&
      (isSupervisor || isManager)
  }

  const canMoveMarker = (marker: Marker) => {
    return canPlaceMarkers || canCurrentSignerEditMarker(marker)
  }

  const canResizeMarker = (marker: Marker) => {
    return canPlaceMarkers || canCurrentSignerEditMarker(marker)
  }

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
      assignedTo: assignedUser || signatories[0] || SUPERVISOR_USER,
      signed: false,
    }
    const updated = [...markers, newMarker]
    markersRef.current = updated
    setMarkers(updated)
    updateDocument(doc.id, { markers: updated })
  }

  const handleMarkerClick = (marker: Marker) => {
    if (dragMovedRef.current) {
      dragMovedRef.current = false
      return
    }

    const isAssigned = marker.assignedTo.id === currentUser?.id
    const isSupervisorTurn = canSupervisorSign && marker.assignedTo.accessRole === 'supervisor'
    const isManagerTurn = canManagerSign && marker.assignedTo.accessRole === 'manager'

    if (isAssigned && !marker.signed) {
      if (isSupervisorTurn || isManagerTurn) {
        setActiveMarkerToSign(marker)
        setShowSign(true)
      }
    }
  }

  const handleSignConfirm = async (sig: SignatureData) => {
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
            ip: 'server-injected',
            certId,
            algorithm: 'SHA-256',
            baselineHash: doc.baselineHash || 'a1b2c3d4...',
          }
        }
      }
      return m
    })

    setMarkers(updatedMarkers)
    markersRef.current = updatedMarkers
    setShowSign(false)

    const newAuditLog = [
      ...(doc.auditLog || []),
      {
        id: `al-${Date.now()}`,
        event: 'DOCUMENT_SIGNED',
        user: currentUser!,
        timestamp: now,
        ip: 'server-injected',
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

    await updateDocument(doc.id, {
      markers: updatedMarkers,
      status: nextStatus,
      auditLog: newAuditLog,
      updatedAt: now,
    })

    if (nextStatus === 'locked') {
      navigate('/complete', { state: { documentName: doc.name, docId: doc.id } })
    }
  }

  const handleRejectConfirm = () => {
    if (!doc) return
    const now = new Date()
    updateDocument(doc.id, {
      status: 'rejected',
      updatedAt: now,
      rejectionComment: rejectionReason,
      auditLog: [
        ...(doc.auditLog || []),
        {
          id: `al-${Date.now()}`,
          event: 'DOCUMENT_REJECTED',
          user: currentUser!,
          timestamp: now,
          ip: 'server-injected',
          documentId: doc.id,
          documentName: doc.name,
          metadata: { reason: rejectionReason }
        }
      ]
    })
    setShowRejectConfirm(false)
    navigate('/dashboard')
  }

  const handleSendWorkflow = () => {
    if (markers.length === 0 || doc.status === 'rejected') return
    setShowInvite(true)
  }

  const handleResubmit = () => {
    if (markers.length === 0) return
    const now = new Date()
    updateDocument(doc.id, {
      status: 'pending_supervisor',
      markers: markers,
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
          metadata: { action: 'Resubmitted document after rejection' }
        }
      ]
    })
    navigate('/documents')
  }

  const handleInviteConfirm = (selectedSignatories: User[]) => {
    const now = new Date()
    setSignatories(selectedSignatories)
    const selectedEmails = new Set(selectedSignatories.map(user => user.email))
    const workflowMarkers = markers.map(marker => (
      selectedEmails.has(marker.assignedTo.email)
        ? marker
        : { ...marker, assignedTo: selectedSignatories[0] || marker.assignedTo }
    ))
    markersRef.current = workflowMarkers
    setMarkers(workflowMarkers)

    updateDocument(doc.id, {
      status: 'pending_supervisor',
      recipients: selectedSignatories,
      markers: workflowMarkers,
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
          metadata: { action: `Assigned ${selectedSignatories.length} signatories` },
        },
        {
          id: `al-${Date.now() + 1}`,
          event: 'SIGNING_INVITATION_SENT',
          user: currentUser!,
          timestamp: now,
          ip: '192.168.1.108',
          documentId: doc.id,
          documentName: doc.name,
          metadata: { action: `Invited ${selectedSignatories.map(user => user.email).join(', ')}` }
        }
      ]
    })
    setShowInvite(false)
    navigate('/documents')
  }

  const deleteMarker = (mid: string) => {
    if (!canPlaceMarkers) return
    const marker = markers.find(m => m.id === mid)
    if (marker?.signed) return
    const updated = markers.filter(m => m.id !== mid)
    markersRef.current = updated
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
          {canSupervisorSign && (
            <button
              onClick={() => {
                setRejectionReason('')
                setShowRejectConfirm(true)
              }}
              className="btn-secondary py-2 px-4 text-xs font-bold text-error border-error/30 hover:bg-error/5"
            >
              <XCircle size={14} /> Reject Document
            </button>
          )}
          <button className="btn-ghost text-xs font-bold gap-1">
            <Eye size={14} /> PREVIEW
          </button>
          {canPlaceMarkers && (
            <button
              onClick={doc.status === 'rejected' ? handleResubmit : handleSendWorkflow}
              disabled={markers.length === 0}
              className="btn-primary py-2 px-4 text-xs font-bold"
            >
              {doc.status === 'rejected' ? (
                'Resubmit Document'
              ) : (
                <>
                  Next: Add Recipients <ChevronRight size={14} />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {doc.status === 'rejected' && doc.rejectionComment && (
        <div id="rejection-banner" className="bg-error/10 border-b border-error/20 px-6 py-3 text-xs text-error flex items-start gap-2.5">
          <XCircle size={16} className="text-error mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-bold">Document Rejected:</span>{" "}
            <span className="italic text-on-surface">"{doc.rejectionComment}"</span>
          </div>
        </div>
      )}
 
      <div className="flex flex-1 h-[calc(100vh-7rem)] overflow-hidden">
        {/* Editor Main Canvas */}
        <div 
          ref={viewportRef}
          onPointerDown={handleViewportPointerDown}
          onPointerMove={handleViewportPointerMove}
          onPointerUp={handleViewportPointerUp}
          onPointerCancel={handleViewportPointerUp}
          className="flex-1 flex flex-col bg-surface-container-low overflow-auto p-8 relative items-start justify-start bg-confetti-gradient scroll-smooth"
          style={{
            cursor: isPanning ? 'grabbing' : draggingId ? 'move' : resizingId ? 'se-resize' : 'grab',
            touchAction: 'pan-x pan-y'
          }}
        >
          
          {/* Main White Page Canvas */}
          <div 
            className="relative bg-white text-slate-900 border border-outline-variant/80 rounded-lg shadow-md overflow-hidden flex flex-col select-none flex-shrink-0 mx-auto"
            style={{ 
              width: pdfDimensions ? `${pdfDimensions.width}px` : '100%',
              height: pdfDimensions ? `${pdfDimensions.height}px` : '560px'
            }}
          >
            {/* Agreement contents / Real PDF page */}
            <div
              ref={containerRef}
              className="flex-1 relative overflow-hidden bg-white"
              style={{
                width: '100%',
                height: '100%',
                padding: doc.downloadUrl ? '0' : '2.5rem'
              }}
            >
              {doc.downloadUrl ? (
                <PDFViewer 
                  url={doc.downloadUrl} 
                  page={activePage} 
                  onLoadSuccess={handlePdfLoadSuccess}
                  scale={zoomScale}
                />
              ) : (
                renderDocumentMockup()
              )}

              {/* Render Dragged / Placed Node Markers */}
              {markers.filter(m => m.page === activePage).map(marker => {
                 const isAssignedToCurrent = marker.assignedTo.id === currentUser?.id
                 const isClickable = isAssignedToCurrent && !marker.signed &&
                   ((canSupervisorSign && marker.assignedTo.accessRole === 'supervisor') ||
                    (canManagerSign && marker.assignedTo.accessRole === 'manager'))

                const scaleFactor = getScaleFactor()
                const visualX = Math.round(marker.x * scaleFactor)
                const visualY = Math.round(marker.y * scaleFactor)
                const visualWidth = Math.round(marker.width * scaleFactor)
                const visualHeight = Math.round(marker.height * scaleFactor)
                const isResizable = canResizeMarker(marker)

                return (
                  <div
                    key={marker.id}
                    onPointerDown={(e) => handleMarkerPointerDown(marker, e)}
                    onClick={() => handleMarkerClick(marker)}
                    style={{
                      position: 'absolute',
                      left: `${visualX}px`,
                      top: `${visualY}px`,
                      width: `${visualWidth}px`,
                      height: `${visualHeight}px`,
                      cursor: canMoveMarker(marker) ? 'move' : isClickable ? 'pointer' : 'default',
                    }}
                    className={`node-marker-item rounded-lg flex items-center justify-between cursor-pointer transition-all select-none overflow-hidden
                      ${marker.signed
                        ? 'text-emerald-800'
                        : isClickable
                          ? 'border border-primary bg-primary-container text-on-primary-container shadow-sm animate-pulse ring-2 ring-primary/30'
                          : 'border border-outline-variant bg-surface-container-low text-on-surface shadow-sm'
                      }`}
                  >
                    {marker.signed ? (
                      <div className="flex items-center justify-center w-full h-full overflow-hidden">
                        <img 
                          src={marker.signature} 
                          alt="Sig" 
                          className="w-full h-full object-contain"
                          style={{ imageRendering: 'auto' }}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full h-full px-3 py-1 gap-2">
                        <div className="min-w-0">
                          <p className="font-bold truncate capitalize leading-tight text-[10px]">
                            {marker.type}
                          </p>
                          <p className="text-on-surface-variant truncate leading-none mt-0.5 text-[8px]">
                            {marker.assignedTo.name.split(' ')[0]}
                          </p>
                        </div>
                        {canPlaceMarkers && (
                          <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); deleteMarker(marker.id) }}
                            className="p-0.5 text-on-surface-variant hover:text-error rounded hover:bg-surface-container flex-shrink-0"
                          >
                            x
                          </button>
                        )}
                      </div>
                    )}

                    {/* Resize handle in the bottom-right corner */}
                    {isResizable && (
                      <div
                        onPointerDown={(e) => handleResizePointerDown(marker, e)}
                        className="absolute bottom-0 right-0 w-3.5 h-3.5 cursor-se-resize bg-primary hover:bg-primary/80 rounded-tl-lg flex items-center justify-center shadow-sm text-white select-none"
                        style={{ zIndex: 10 }}
                      >
                        <svg width="6" height="6" viewBox="0 0 6 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 0L0 6M6 3L3 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                        </svg>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bottom Zoom/Undo Page Controls Bar */}
          <div className="mt-4 px-6 py-2 bg-white rounded-full border border-outline-variant shadow-sm flex items-center gap-6 text-xs text-on-surface-variant z-10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setZoomScale(z => Math.max(0.6, z - 0.15))}
                className="p-1 hover:bg-surface-container rounded"
              >
                <ZoomOut size={14} />
              </button>
              <span className="font-semibold font-mono w-10 text-center">
                {Math.round(getScaleFactor() * 100)}%
              </span>
              <button 
                onClick={() => setZoomScale(z => Math.min(2.5, z + 0.15))}
                className="p-1 hover:bg-surface-container rounded"
              >
                <ZoomIn size={14} />
              </button>
            </div>
            <div className="w-px h-4 bg-outline-variant" />
            <div className="flex items-center gap-3">
              <button className="p-1 hover:bg-surface-container rounded" title="Undo"><RotateCcw size={14} /></button>
              <button className="p-1 hover:bg-surface-container rounded" title="Redo"><RotateCw size={14} /></button>
            </div>
            <div className="w-px h-4 bg-outline-variant" />
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setActivePage(p => Math.max(1, p - 1))}
                disabled={activePage === 1}
                className="p-1 hover:bg-surface-container rounded disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="font-semibold font-mono">
                Page {activePage} of {doc.pageCount || 1}
              </span>
              <button 
                onClick={() => setActivePage(p => Math.min(doc.pageCount || 1, p + 1))}
                disabled={activePage === (doc.pageCount || 1)}
                className="p-1 hover:bg-surface-container rounded disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
            </div>
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
                  onChange={e => {
                    const nextUser = signatories.find(user => user.id === e.target.value)
                    if (nextUser) setAssignedUser(nextUser)
                  }}
                  className="w-full input-field py-2 text-xs"
                >
                  {signatories.map((user, index) => (
                    <option key={`${user.id}-${user.email}`} value={user.id}>
                      {index + 1}. {user.name} ({user.accessRole === 'manager' ? 'Manager' : 'Supervisor'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Visual Flow details */}
            <div className="border-t border-outline-variant/40 pt-4">
              <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Recipients List</h3>
              <div className="space-y-2">
                {signatories.map((user, index) => (
                  <div key={`${user.id}-${user.email}`} className="flex justify-between items-center text-xs p-2.5 bg-surface-container-low rounded-lg">
                    <span className="text-on-surface-variant truncate pr-2">
                      {index + 1}. {user.name}
                    </span>
                    <span className={index === 0 ? 'text-primary font-bold' : 'text-on-surface-variant/40'}>
                      {index === 0 ? 'Active' : 'Locked'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Add Recipient bottom action */}
          {canPlaceMarkers && doc.status !== 'rejected' && (
            <div className="p-5 border-t border-outline-variant/40">
              <button
                onClick={() => setShowInvite(true)}
                className="w-full btn-secondary justify-center py-2.5 text-xs font-bold"
              >
                + ADD RECIPIENT
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Invite Signatories Modal */}
      {showInvite && doc.status !== 'rejected' && (
        <InviteModal
          documentName={doc.name}
          initialSignatories={signatories}
          onConfirm={handleInviteConfirm}
          onClose={() => setShowInvite(false)}
        />
      )}

      {/* Signature Draw Modal */}
      {showSign && (
        <SignatureModal
          onConfirm={(sig) => {
            setShowSign(false)
            setPendingSignature(sig)
          }}
          onClose={() => setShowSign(false)}
        />
      )}

      {/* Confirm Signature Dialog */}
      {pendingSignature && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md bg-white border border-outline-variant p-6 rounded-2xl shadow-xl text-center flex flex-col gap-4">
            <h3 className="text-lg font-bold text-on-surface">Confirm Your Signature</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed text-left">
              Are you sure you want to apply this signature to the document? This action is legally binding and will be permanently recorded in the document audit trail.
            </p>
            
            {/* Signature Preview */}
            <div className="border border-outline-variant/60 rounded-xl bg-slate-50 p-4 flex items-center justify-center h-28">
              <img
                src={pendingSignature.dataUrl}
                alt="Signature Preview"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setPendingSignature(null)}
                className="btn-secondary flex-1"
              >
                Go Back
              </button>
              <button
                onClick={async () => {
                  const sig = pendingSignature
                  setPendingSignature(null)
                  await handleSignConfirm(sig)
                }}
                className="btn-primary flex-1 justify-center animate-pulse"
              >
                Confirm & Sign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {showRejectConfirm && (
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
            <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
              Rejecting "<span className="text-on-surface font-semibold">{doc.name}</span>" will halt the sequential signing flow and notify the Staff initiator.
            </p>
            <div className="mb-5">
              <label htmlFor="rejection-reason" className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-variant mb-1.5">
                Reason for Rejection (Required)
              </label>
              <textarea
                id="rejection-reason"
                className="w-full text-xs p-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:outline-none focus:border-error resize-none h-20"
                placeholder="Enter the reason why you are rejecting this document..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowRejectConfirm(false)} className="btn-secondary flex-1">Cancel</button>
              <button
                id="confirm-reject-btn"
                onClick={handleRejectConfirm}
                disabled={!rejectionReason.trim()}
                className="btn-danger flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
