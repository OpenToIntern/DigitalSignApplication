import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { X, Mail, Plus, Trash2, Send, CheckCircle2, Users } from 'lucide-react'

export default function InviteModal({ doc, currentRecipients, onSend, onClose }) {
  const { mockUsers, user } = useApp()
  const [recipients, setRecipients] = useState(currentRecipients || [])
  const [emailInput, setEmailInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const suggestedUsers = mockUsers.filter(u => u.id !== user?.id && !recipients.find(r => r.id === u.id))

  const addByEmail = () => {
    const email = emailInput.trim()
    if (!email) return
    const existing = mockUsers.find(u => u.email === email)
    if (existing && !recipients.find(r => r.id === existing.id)) {
      setRecipients(p => [...p, existing])
    } else if (!existing) {
      // Create a placeholder user for external invitees
      const parts = email.split('@')[0].split('.')
      const name = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
      setRecipients(p => [...p, {
        id: 'ext-' + Date.now(),
        name,
        email,
        initials: name.split(' ').map(w => w[0]).join('').slice(0, 2),
        avatarColor: '#888888',
        external: true,
      }])
    }
    setEmailInput('')
  }

  const remove = (id) => setRecipients(p => p.filter(r => r.id !== id))
  const addSuggested = (u) => setRecipients(p => [...p, u])

  const handleSend = () => {
    if (recipients.length === 0) return
    setSending(true)
    // Simulate email dispatch (FR-007)
    setTimeout(() => {
      setSending(false)
      setSent(true)
      setTimeout(() => { onSend(recipients) }, 1200)
    }, 1800)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}><X size={18} /></button>

        {!sent ? (
          <>
            <div style={{ marginBottom: 24 }}>
              <div className="flex items-center gap-3" style={{ marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, background: 'var(--brand-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={20} style={{ color: 'var(--brand)' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700 }}>Add signatories</h2>
                  <p style={{ fontSize: 13, color: 'var(--text-3)' }}>FR-006: Designate signatories by email · FR-007: Email notifications sent</p>
                </div>
              </div>
            </div>

            {/* Add by email */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Add by email</label>
              <div className="flex gap-2">
                <input
                  className="input"
                  placeholder="Enter email address…"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addByEmail()}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary" onClick={addByEmail} style={{ gap: 6, flexShrink: 0 }}>
                  <Plus size={15} /> Add
                </button>
              </div>
            </div>

            {/* Suggested from system */}
            {suggestedUsers.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 10 }}>Suggested colleagues</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {suggestedUsers.map(u => (
                    <div key={u.id} className="flex items-center gap-3" style={{ padding: '10px 14px', border: '1px solid var(--border-light)', borderRadius: 10, background: 'var(--cream)' }}>
                      <div style={{ width: 34, height: 34, background: u.avatarColor, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>{u.initials}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{u.email} · {u.role || 'Team member'}</div>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => addSuggested(u)} style={{ color: 'var(--brand)', fontWeight: 500, gap: 4 }}>
                        <Plus size={13} /> Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current recipients */}
            {recipients.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 10 }}>
                  Will receive invitation ({recipients.length})
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {recipients.map(r => (
                    <div key={r.id} className="flex items-center gap-3" style={{ padding: '10px 14px', border: '1.5px solid var(--brand)', borderRadius: 10, background: 'var(--brand-light)' }}>
                      <div style={{ width: 34, height: 34, background: r.avatarColor, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>{r.initials}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{r.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{r.email}{r.external ? ' · External' : ''}</div>
                      </div>
                      <Mail size={13} style={{ color: 'var(--brand)', marginRight: 4 }} />
                      <button onClick={() => remove(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ padding: '12px 14px', background: 'var(--cream)', borderRadius: 8, marginBottom: 20, fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>
              <strong style={{ color: 'var(--text-2)' }}>FR-007:</strong> Each signatory receives an email with a secure portal link. In-app notifications are also sent. Signatories must complete Dukcapil identity verification before signing.
            </div>

            <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSend} disabled={recipients.length === 0 || sending} style={{ gap: 8, opacity: recipients.length === 0 ? 0.5 : 1 }}>
                {sending ? 'Sending…' : <><Send size={15} /> Send invitations ({recipients.length})</>}
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 60, height: 60, background: 'var(--signed-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle2 size={30} style={{ color: 'var(--signed-text)' }} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Invitations sent!</h3>
            <p style={{ color: 'var(--text-3)', fontSize: 14 }}>
              {recipients.length} signator{recipients.length > 1 ? 'ies have' : 'y has'} been notified by email with a secure signing link.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
