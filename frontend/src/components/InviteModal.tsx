import React, { useMemo, useState, useEffect } from 'react'
import {
  X, Users, Lock, Mail, AlertCircle, CheckCircle, RefreshCw,
  ArrowDown, ArrowUp, Trash2, Plus
} from 'lucide-react'
import type { User, Marker } from '../types'
import { normalizeUser, useApp } from '../context/AppContext'

interface InviteModalProps {
  documentName: string
  initialSignatories: User[]
  markers: Marker[]
  onConfirm: (signatories: User[]) => void
  onClose: () => void
}

export default function InviteModal({ documentName, initialSignatories, markers, onConfirm, onClose }: InviteModalProps) {
  const { currentUser } = useApp()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [signatories, setSignatories] = useState<User[]>(initialSignatories)
  const [liveReviewers, setLiveReviewers] = useState<User[]>([])
  const [selectedReviewerId, setSelectedReviewerId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Lock background page scroll when modal is mounted, and restore on unmount
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  // Fetch live reviewers
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
        const res = await fetch(`${apiBase}/users`)
        if (!res.ok) throw new Error('Failed to fetch users')
        const data = await res.json()
        const filtered = data
          .map(normalizeUser)
          .filter((u: User) => (u.accessRole === 'supervisor' || u.accessRole === 'manager') && u.id !== currentUser?.id && u.email?.toLowerCase() !== currentUser?.email?.toLowerCase())
        setLiveReviewers(filtered)
        if (filtered.length > 0) {
          setSelectedReviewerId(filtered[0].id)
        }
      } catch (err) {
        console.error('InviteModal: Failed to fetch live users:', err)
      }
    }
    fetchUsers()
  }, [currentUser])


  const hasAtLeastOneMarker = markers.length > 0
  const recipientEmails = signatories.map(s => s.email.toLowerCase())
  const hasMarkersForAll = signatories.every(sig => {
    return markers.some(m => {
      const mEmail = m.assignedTo?.email?.toLowerCase()
      return mEmail === sig.email.toLowerCase()
    })
  })

  const allMarkersAssignedToRecipients = markers.every(m => {
    const mEmail = m.assignedTo?.email?.toLowerCase()
    return mEmail && recipientEmails.includes(mEmail)
  })

  // Can send if at least 1 recipient is added, at least 1 marker placed, all recipients have markers, and all markers belong to a recipient
  const canSend = signatories.length > 0 && hasAtLeastOneMarker && hasMarkersForAll && allMarkersAssignedToRecipients
  const firstRecipient = signatories[0]

  const emailPreview = useMemo(() => {
    if (!firstRecipient) return 'No signer selected.'
    return `${firstRecipient.name} will receive: "Your signature is required on '${documentName}'. Click to sign."`
  }, [documentName, firstRecipient])

  const addSelectedReviewer = () => {
    const reviewer = liveReviewers.find(r => r.id === selectedReviewerId)
    if (!reviewer) return

    if (signatories.some(s => s.email.toLowerCase() === reviewer.email.toLowerCase())) {
      setError('That signatory is already in the list.')
      return
    }

    setSignatories(prev => [...prev, reviewer])
    setError(null)
  }

  const removeSigner = (emailToRemove: string) => {
    setSignatories(prev => prev.filter(s => s.email !== emailToRemove))
  }

  const moveSigner = (index: number, direction: -1 | 1) => {
    setSignatories(prev => {
      const next = [...prev]
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= next.length) return prev
      const current = next[index]
      next[index] = next[targetIndex]
      next[targetIndex] = current
      return next
    })
  }

  const updateSignerRole = (emailToUpdate: string, nextRole: User['accessRole']) => {
    setSignatories(prev => prev.map(s => (
      s.email === emailToUpdate
        ? {
          ...s,
          accessRole: nextRole,
          role: nextRole === 'manager' ? 'Manager' : 'Supervisor',
          avatarColor: nextRole === 'manager' ? '#ec4899' : '#8b5cf6',
        }
          : s
    )))
  }

  const handleSend = async () => {
    if (!hasAtLeastOneMarker) {
      setError('Please place at least one signature marker on the document before sending invitations.')
      return
    }
    if (!hasMarkersForAll) {
      setError('Each recipient must have at least one signature marker placed and assigned to them.')
      return
    }

    if (!canSend) {
      setError('Please verify the signatories and markers placement before sending.')
      return
    }

    setSending(true)
    await new Promise(r => setTimeout(r, 900))
    setSending(false)
    setSent(true)
    setTimeout(() => onConfirm(signatories), 700)
  }

  return (
    <div className="modal-overlay">
      <div 
        className="modal-content max-w-2xl bg-white border border-outline-variant p-6 sm:p-8 text-left flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* 1. FIXED HEADER */}
        <div className="flex items-center justify-between mb-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-on-surface">Add Signers</h2>
              <p className="text-xs text-on-surface-variant truncate max-w-[360px]">{documentName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container">
            <X size={18} />
          </button>
        </div>

        {/* 2. SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto pr-1 mb-5 space-y-4 border-y border-outline-variant/30 py-4 text-left">
          
          {/* Select Reviewer from live dropdown */}
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Select Signer</p>
            {liveReviewers.length === 0 ? (
              <div className="text-xs text-red-700 bg-red-50 p-3.5 rounded-xl border border-red-200 flex items-start gap-2.5">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">No Reviewers Available</p>
                  <p className="mt-1 leading-relaxed">No Supervisor or Manager accounts exist in the database. Please register reviewer accounts first.</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <select
                  value={selectedReviewerId}
                  onChange={e => setSelectedReviewerId(e.target.value)}
                  className="input-field flex-1 text-xs"
                >
                  {liveReviewers.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.email}) - {r.accessRole === 'manager' ? 'Manager' : 'Supervisor'}
                    </option>
                  ))}
                </select>
                <button onClick={addSelectedReviewer} className="btn-secondary justify-center text-xs font-bold whitespace-nowrap">
                  <Plus size={15} /> Add Signer
                </button>
              </div>
            )}
          </div>

          {markers.length === 0 && (
            <div id="missing-markers-error" className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle size={13} className="flex-shrink-0" />
              Please place at least one signature marker on the document before sending invitations.
            </div>
          )}
          {markers.length > 0 && !hasMarkersForAll && (
            <div id="recipient-markers-error" className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle size={13} className="flex-shrink-0" />
              Each recipient must have at least one signature marker placed and assigned to them.
            </div>
          )}
          {markers.length > 0 && !allMarkersAssignedToRecipients && (
            <div id="orphaned-markers-error" className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle size={13} className="flex-shrink-0" />
              You have placed markers assigned to reviewers who are not in the Recipients list. Add them or remove the markers.
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle size={13} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <AlertCircle size={13} className="flex-shrink-0" />
            Signing follows the order listed below. Each signatory is notified only when their turn begins.
          </div>

          {/* Signing Order list */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Signing Order</p>
            {signatories.map((user, index) => {
              const locked = index > 0
              return (
                <div
                  key={user.email}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left ${
                    locked
                      ? 'border-outline-variant/60 bg-surface-container-low'
                      : 'border-primary/20 bg-primary/5'
                  }`}
                >
                  <div className="relative">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: user.avatarColor }}
                    >
                      {user.initials}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ${
                      locked ? 'bg-surface-container-high text-on-surface-variant' : 'bg-primary text-white'
                    }`}>
                      {index + 1}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate">{user.name}</p>
                    <p className="text-xs text-on-surface-variant truncate font-mono">{user.email}</p>
                  </div>

                  <select
                    value={user.accessRole}
                    onChange={e => updateSignerRole(user.email, e.target.value as User['accessRole'])}
                    className="input-field py-1.5 px-2 text-xs w-28"
                  >
                    <option value="supervisor">SPV</option>
                    <option value="manager">Manager</option>
                  </select>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveSigner(index, -1)}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg hover:bg-surface-container disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => moveSigner(index, 1)}
                      disabled={index === signatories.length - 1}
                      className="p-1.5 rounded-lg hover:bg-surface-container disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      onClick={() => removeSigner(user.email)}
                      className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container"
                      title="Remove signer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Email Preview */}
          <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/40 text-left font-sans">
            <p className="text-xs font-semibold text-on-surface-variant mb-2 flex items-center gap-1.5">
              <Mail size={12} className="text-primary" /> Email notification preview
            </p>
            <p className="text-xs text-on-surface-variant leading-relaxed">{emailPreview}</p>
            {signatories.length > 1 && (
              <p className="text-[10px] text-on-surface-variant/70 mt-2 flex items-center gap-1">
                <Lock size={11} /> Later signers are notified when their turn opens.
              </p>
            )}
          </div>

          {sent && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              <CheckCircle size={14} className="flex-shrink-0" />
              Invitations saved. Redirecting...
            </div>
          )}
        </div>

        {/* 3. FIXED FOOTER */}
        <div className="flex gap-3 flex-shrink-0">
          <button onClick={onClose} disabled={sending || sent} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSend} disabled={sending || sent || !canSend} className="btn-primary flex-1">
            {sending ? (
              <span className="flex items-center gap-2 justify-center">
                <RefreshCw size={14} className="animate-spin" /> Sending...
              </span>
            ) : (
              <span className="flex items-center gap-2 justify-center">
                <Mail size={14} /> Send Invitations
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
