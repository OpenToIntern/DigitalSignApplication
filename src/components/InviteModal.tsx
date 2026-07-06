import React, { useState } from 'react'
import { X, Users, ChevronRight, Lock, Mail, AlertCircle, CheckCircle, RefreshCw, ArrowRight } from 'lucide-react'
import type { User } from '../types'
import { SUPERVISOR_USER, MANAGER_USER } from '../constants/mockData'

interface InviteModalProps {
  documentName: string
  onConfirm: () => void
  onClose: () => void
}

export default function InviteModal({ documentName, onConfirm, onClose }: InviteModalProps) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSend = async () => {
    setSending(true)
    await new Promise(r => setTimeout(r, 1800))
    setSending(false)
    setSent(true)
    setTimeout(onConfirm, 1200)
  }

  const SignatoryCard = ({
    user,
    order,
    locked,
  }: {
    user: User
    order: number
    locked: boolean
  }) => (
    <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left
      ${locked
        ? 'border-outline-variant/60 bg-surface-container-low opacity-60'
        : 'border-primary/20 bg-primary/5'
      }`}>
      <div className="relative">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          style={{ backgroundColor: user.avatarColor }}
        >
          {user.initials}
        </div>
        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm
          ${locked ? 'bg-surface-container-high text-on-surface-variant' : 'bg-primary text-white'}`}>
          {order}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-on-surface truncate">{user.name}</p>
        <p className="text-xs text-on-surface-variant truncate font-mono">{user.email}</p>
        <p className="text-[10px] text-on-surface-variant/80 mt-0.5">{user.role}</p>
      </div>
      <div>
        {locked ? (
          <div className="flex items-center gap-1 text-xs text-on-surface-variant/60">
            <Lock size={12} />
            Locked
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-primary font-bold">
            <Mail size={12} />
            Will notify
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md bg-white border border-outline-variant p-6 sm:p-8 text-left">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-on-surface">Send for Signing</h2>
              <p className="text-xs text-on-surface-variant truncate max-w-[220px]">{documentName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container">
            <X size={18} />
          </button>
        </div>

        {/* Signing order info */}
        <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          <AlertCircle size={13} className="flex-shrink-0" />
          Sequential signing is enforced per FR-006a. Manager is locked until Supervisor signs.
        </div>

        {/* Signatories */}
        <div className="space-y-3 mb-5">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Signing Order</p>

          <SignatoryCard user={SUPERVISOR_USER} order={1} locked={false} />

          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 text-xs text-on-surface-variant/40">
              <div className="h-px w-12 bg-outline-variant/60" />
              <ArrowRight size={12} />
              <div className="h-px w-12 bg-outline-variant/60" />
            </div>
          </div>

          <SignatoryCard user={MANAGER_USER} order={2} locked={true} />
        </div>

        {/* Email preview */}
        <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/40 mb-5 text-left">
          <p className="text-xs font-semibold text-on-surface-variant mb-2 flex items-center gap-1.5">
            <Mail size={12} className="text-primary" /> Email notification preview
          </p>
          <p className="text-xs text-on-surface-variant">
            <span className="text-primary font-bold">{SUPERVISOR_USER.name}</span> will receive:{' '}
            <em className="text-on-surface-variant/80">"Your signature is required on '{documentName}'. Click to sign."</em>
          </p>
        </div>

        {/* Success state */}
        {sent && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
            <CheckCircle size={14} className="flex-shrink-0" />
            Invitation sent! Redirecting...
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onClose} disabled={sending || sent} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSend} disabled={sending || sent} className="btn-primary flex-1">
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
