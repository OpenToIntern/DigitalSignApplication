import React, { useMemo, useState } from 'react'
import {
  X, Users, Lock, Mail, AlertCircle, CheckCircle, RefreshCw,
  ArrowDown, ArrowUp, Trash2, Plus
} from 'lucide-react'
import type { User } from '../types'
import { MANAGER_USER, SUPERVISOR_USER } from '../constants/mockData'

interface InviteModalProps {
  documentName: string
  initialSignatories: User[]
  onConfirm: (signatories: User[]) => void
  onClose: () => void
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function makeSigner(email: string, name: string, accessRole: User['accessRole']): User {
  const cleanEmail = email.trim().toLowerCase()
  const cleanName = name.trim() || cleanEmail.split('@')[0]
  const initials = cleanName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'S'

  return {
    id: `temp-${cleanEmail}`,
    name: cleanName,
    email: cleanEmail,
    initials,
    nik: '',
    verified: true,
    avatarColor: accessRole === 'manager' ? '#ec4899' : '#8b5cf6',
    role: accessRole === 'manager' ? 'Manager' : 'Supervisor',
    accessRole,
    external: true,
  }
}

export default function InviteModal({ documentName, initialSignatories, onConfirm, onClose }: InviteModalProps) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [signatories, setSignatories] = useState<User[]>(
    initialSignatories.length > 0 ? initialSignatories : [SUPERVISOR_USER, MANAGER_USER]
  )
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [accessRole, setAccessRole] = useState<User['accessRole']>('supervisor')
  const [error, setError] = useState<string | null>(null)

  const hasSupervisor = signatories.some(s => s.accessRole === 'supervisor')
  const hasManager = signatories.some(s => s.accessRole === 'manager')
  const canSend = signatories.length > 0 && hasSupervisor && hasManager
  const firstRecipient = signatories[0]

  const emailPreview = useMemo(() => {
    if (!firstRecipient) return 'No signer selected.'
    return `${firstRecipient.name} will receive: "Your signature is required on '${documentName}'. Click to sign."`
  }, [documentName, firstRecipient])

  const resetForm = () => {
    setEmail('')
    setName('')
    setAccessRole('supervisor')
    setError(null)
  }

  const addSigner = () => {
    const cleanEmail = email.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setError('Enter a valid signatory email address.')
      return
    }
    if (signatories.some(s => s.email.toLowerCase() === cleanEmail)) {
      setError('That signatory is already in the list.')
      return
    }

    setSignatories(prev => [...prev, makeSigner(cleanEmail, name, accessRole)])
    resetForm()
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
    if (!canSend) {
      setError('Add at least one Supervisor and one Manager before sending.')
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
      <div className="modal-content max-w-2xl bg-white border border-outline-variant p-6 sm:p-8 text-left">
        <div className="flex items-center justify-between mb-5">
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

        <div className="grid grid-cols-1 md:grid-cols-[1fr_160px] gap-3 mb-3">
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') addSigner()
            }}
            className="input-field"
            placeholder="signer@company.com"
            type="email"
          />
          <select
            value={accessRole}
            onChange={e => setAccessRole(e.target.value as User['accessRole'])}
            className="input-field"
          >
            <option value="supervisor">Supervisor</option>
            <option value="manager">Manager</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 mb-4">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="input-field"
            placeholder="Full name"
          />
          <button onClick={addSigner} className="btn-secondary justify-center">
            <Plus size={15} /> Add
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
            <AlertCircle size={13} className="flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          <AlertCircle size={13} className="flex-shrink-0" />
          Signing follows this order. Manager access stays locked until the required supervisor signature is recorded.
        </div>

        <div className="space-y-3 mb-5 max-h-[300px] overflow-y-auto pr-1">
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

        <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/40 mb-5 text-left">
          <p className="text-xs font-semibold text-on-surface-variant mb-2 flex items-center gap-1.5">
            <Mail size={12} className="text-primary" /> Email notification preview
          </p>
          <p className="text-xs text-on-surface-variant">{emailPreview}</p>
          {signatories.length > 1 && (
            <p className="text-[10px] text-on-surface-variant/70 mt-2 flex items-center gap-1">
              <Lock size={11} /> Later signers are notified when their turn opens.
            </p>
          )}
        </div>

        {sent && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
            <CheckCircle size={14} className="flex-shrink-0" />
            Invitations saved. Redirecting...
          </div>
        )}

        <div className="flex gap-3">
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
