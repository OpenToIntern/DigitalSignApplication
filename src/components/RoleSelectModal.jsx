import { useState } from 'react'
import { ACCESS_ROLES, MOCK_USERS } from '../context/AppContext'
import { X, User, Users, ShieldCheck, ArrowRight, ChevronLeft } from 'lucide-react'

const ROLE_ICONS = { user: User, manager: Users, supervisor: ShieldCheck }

const GOOGLE_POOL = MOCK_USERS

export default function RoleSelectModal({ mode = 'login', onConfirm, onClose }) {
  const [step, setStep] = useState('role') // role -> account
  const [selectedRole, setSelectedRole] = useState(null)

  const accountsForRole = GOOGLE_POOL.filter(u => u.accessRole === selectedRole)
  const fallbackAccounts = accountsForRole.length ? accountsForRole : GOOGLE_POOL.slice(0, 2)

  const handlePickRole = (roleId) => {
    setSelectedRole(roleId)
    setStep('account')
  }

  const handlePickAccount = (account) => {
    onConfirm(account, selectedRole)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}><X size={18} /></button>

        {step === 'role' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, background: 'var(--brand)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 22 }}>S</span>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
                {mode === 'register' ? 'Create your SignHere account' : 'Sign in to SignHere'}
              </h2>
              <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Please choose your role</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {ACCESS_ROLES.map(r => {
                const Icon = ROLE_ICONS[r.id]
                return (
                  <button key={r.id} onClick={() => handlePickRole(r.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--white)', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s', width: '100%', textAlign: 'left' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.background = 'var(--brand-light)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--white)' }}>
                    <div style={{ width: 42, height: 42, background: 'var(--brand-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={20} style={{ color: 'var(--brand)' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{r.label}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.4 }}>{r.desc}</div>
                    </div>
                    <ArrowRight size={16} style={{ color: 'var(--text-4)', flexShrink: 0 }} />
                  </button>
                )
              })}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-4)', textAlign: 'center', lineHeight: 1.6 }}>
              Role determines dashboard access and oversight permissions within your organization.
            </p>
          </>
        )}

        {step === 'account' && (
          <>
            <button onClick={() => setStep('role')} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 13, marginBottom: 16, padding: 0 }}>
              <ChevronLeft size={15} /> Back
            </button>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--brand-light)', borderRadius: 99, padding: '4px 12px', marginBottom: 14 }}>
                {(() => { const Icon = ROLE_ICONS[selectedRole]; return <Icon size={13} style={{ color: 'var(--brand)' }} /> })()}
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand)', textTransform: 'capitalize' }}>{selectedRole}</span>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Choose your Google account</h2>
              <p style={{ color: 'var(--text-3)', fontSize: 14 }}>OAuth 2.0 authentication (FR-001)</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {fallbackAccounts.map(u => (
                <button key={u.id} onClick={() => handlePickAccount(u)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--white)', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s', width: '100%' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.background = 'var(--brand-light)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--white)' }}>
                  <div style={{ width: 40, height: 40, background: u.avatarColor, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{u.initials}</div>
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{u.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{u.email}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-3)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                    Continue
                  </div>
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-4)', textAlign: 'center', lineHeight: 1.6 }}>
              By continuing, you agree to SignHere's Terms of Service and Privacy Policy.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
