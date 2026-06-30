import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp, MOCK_USERS } from '../context/AppContext'
import { ArrowRight, Play, Lock, Shield, FileCheck, Zap, CheckCircle2, Users, Globe } from 'lucide-react'
import MfaModal from '../components/MfaModal'
import VerificationModal from '../components/VerificationModal'
import RoleSelectModal from '../components/RoleSelectModal'

export default function Landing() {
  const navigate = useNavigate()
  const { login, completeMfa, completeVerification, showToast, dashboardPathFor } = useApp()
  const [showMfa, setShowMfa] = useState(false)
  const [showVerify, setShowVerify] = useState(false)
  const [showRoleSelect, setShowRoleSelect] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [pendingAccessRole, setPendingAccessRole] = useState(null)

  const handleOAuth = (mode = 'login') => { setAuthMode(mode); setShowRoleSelect(true) }

  const handleRoleConfirm = (account, accessRole) => {
    setPendingAccessRole(accessRole)
    login(account, accessRole)
    setShowRoleSelect(false)
    setShowMfa(true)
  }

  const handleMfaSuccess = () => {
    completeMfa()
    setShowMfa(false)
    setShowVerify(true)
  }

  const handleVerified = () => {
    completeVerification()
    setShowVerify(false)
    showToast('Identity verified — welcome to SignHere')
    navigate(dashboardPathFor(pendingAccessRole))
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #FAF7F2 0%, #F5EDE5 60%, #F0E5DA 100%)' }}>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(250,247,242,0.88)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-light)', height: 56 }}>
        <div style={{ maxWidth: 1200, width: '100%', margin: '0 auto', padding: '0 32px', height: '100%' }} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div style={{ width: 30, height: 30, background: 'var(--brand)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>S</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px' }}>SignHere</span>
          </div>
          <div className="flex items-center gap-3">
            <nav className="flex gap-1">
              {['Features', 'Security', 'Compliance', 'Enterprise'].map(item => (
                <button key={item} className="btn btn-ghost" style={{ fontSize: 14, color: 'var(--text-2)' }}>{item}</button>
              ))}
            </nav>
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-2)' }} onClick={() => handleOAuth('login')}>Sign in</button>
            <button className="btn btn-primary btn-sm" onClick={() => handleOAuth('register')}>Register</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 32px 60px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--brand-light)', border: '1px solid #EAC9B8', borderRadius: 99, padding: '5px 14px', marginBottom: 28 }}>
            <Globe size={12} style={{ color: 'var(--brand)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--brand)', textTransform: 'uppercase' }}>eIDAS & ESIGN Act Compliant</span>
          </div>
          <h1 style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-1px', marginBottom: 20, color: 'var(--text-1)' }}>
            The Gold Standard for{' '}
            <span style={{ color: 'var(--brand)' }}>Digital Identity</span>
            {' '}and Signing.
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 36, maxWidth: 440 }}>
            Cryptographically secure e-signatures with X.509 certificates, SHA-256 document hashing, Dukcapil identity verification, and comprehensive audit trails — built for enterprise compliance.
          </p>
          <div className="flex items-center gap-3" style={{ marginBottom: 40 }}>
          </div>
        </div>

        {/* Hero card mockup */}
        <div style={{ position: 'relative' }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="flex items-center gap-3">
                <div style={{ width: 36, height: 36, background: 'var(--brand-light)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileCheck size={18} style={{ color: 'var(--brand)' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Service_Agreement.pdf</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>SHA-256 hash verified</div>
                </div>
              </div>
              <span className="badge badge-active">Active</span>
            </div>
            <div style={{ padding: 20 }}>
              {[100, 84, 52].map((w, i) => (
                <div key={i} style={{ height: 10, background: 'var(--cream-dark)', borderRadius: 4, width: `${w}%`, marginBottom: i < 2 ? 10 : 0 }} />
              ))}
              <div style={{ marginTop: 20, border: '1.5px dashed #EAC9B8', background: 'var(--brand-light)', borderRadius: 10, padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                onClick={() => handleOAuth('login')}>
                <div style={{ width: 36, height: 36, background: '#fff', borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-light)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                </div>
                <span style={{ fontSize: 14, color: 'var(--brand)', fontWeight: 500 }}>Click to sign here</span>
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: 'monospace' }}>X.509 · SHA-256 · PKCS</div>
              <div className="flex items-center gap-2" style={{ fontSize: 12, color: 'var(--text-3)' }}>
                <Lock size={12} /> AES-256 Encrypted
              </div>
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: -16, left: -20, background: 'var(--white)', border: '1px solid var(--border-light)', borderRadius: 12, padding: '10px 16px', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: 'var(--signed-bg)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={16} style={{ color: 'var(--signed-text)' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Completed · All signed & locked</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Signed by 3 of 3</div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px 60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { icon: Shield, label: 'eIDAS & ESIGN Compliant', sub: 'Legally binding in 195+ countries' },
            { icon: Lock, label: 'AES-256 + TLS 1.3', sub: 'Encrypted at rest and in transit' },
            { icon: Zap, label: 'SHA-256 Document Hashing', sub: 'Tamper-evident baseline hash' },
            { icon: Users, label: 'Multi-party Workflows', sub: 'Sequential & parallel signing' },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="card flex items-center gap-3" style={{ padding: '18px 20px' }}>
              <div style={{ width: 38, height: 38, background: 'var(--brand-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={19} style={{ color: 'var(--brand)' }} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {showRoleSelect && (
        <RoleSelectModal
          mode={authMode}
          onConfirm={handleRoleConfirm}
          onClose={() => setShowRoleSelect(false)}
        />
      )}

      {showMfa && <MfaModal onSuccess={handleMfaSuccess} onClose={() => setShowMfa(false)} />}
      {showVerify && <VerificationModal onSuccess={handleVerified} onClose={() => setShowVerify(false)} />}
    </div>
  )
}
