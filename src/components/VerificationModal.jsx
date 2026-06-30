import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { X, User, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react'

const MOCK_DB = {
  '3201234567890001': { name: 'Ricky Richard Takahindangen', dob: '2004-05-15', address: 'Cikarang, West Java', valid: true },
  '3201234567890002': { name: 'Sarah Jenkins', dob: '1990-03-22', address: 'Jakarta Selatan', valid: true },
  '3201234567890003': { name: 'Michael Kim', dob: '1988-11-10', address: 'Jakarta Pusat', valid: true },
  '1234567890000000': { name: 'Test Invalid', dob: '2000-01-01', address: 'Jakarta', valid: false },
}

export default function VerificationModal({ onSuccess, onClose }) {
  const { user } = useApp()
  const [nik, setNik] = useState(user?.nik || '')
  const [fullName, setFullName] = useState(user?.name || '')
  const [dob, setDob] = useState('')
  const [step, setStep] = useState('form') // form | verifying | success | failed
  const [result, setResult] = useState(null)

  const handleSubmit = () => {
    if (!nik || nik.length !== 16 || !fullName || !dob) return
    setStep('verifying')
    setTimeout(() => {
      const record = MOCK_DB[nik]
      if (record && record.valid) {
        setResult(record)
        setStep('success')
      } else if (record && !record.valid) {
        setStep('failed')
      } else {
        // Auto-pass for demo with user's pre-filled NIK
        setResult({ name: fullName, dob, address: 'Verified via Dukcapil PoC DB', valid: true })
        setStep('success')
      }
    }, 2000)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}><X size={18} /></button>

        {step === 'form' && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, background: 'var(--brand-light)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={22} style={{ color: 'var(--brand)' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700 }}>Identity verification</h2>
                  <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Dukcapil database verification (PoC mockup — FR-002)</p>
                </div>
              </div>
              <div style={{ padding: '10px 14px', background: '#FEF9EE', border: '1px solid #F5E4A0', borderRadius: 8, fontSize: 13, color: '#8B6A00' }}>
                <strong>Demo mode:</strong> NIK <code style={{ fontFamily: 'monospace' }}>{user?.nik}</code> is pre-populated. Enter any DOB to proceed.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-2)' }}>NIK (National ID Number) *</label>
                <input className="input" placeholder="16-digit NIK" value={nik} onChange={e => setNik(e.target.value.replace(/\D/g, '').slice(0, 16))} maxLength={16} style={{ fontFamily: 'monospace', letterSpacing: 1 }} />
                <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4 }}>{nik.length}/16 digits</div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-2)' }}>Full name (as per KTP) *</label>
                <input className="input" placeholder="Full legal name" value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-2)' }}>Date of birth *</label>
                <input className="input" type="date" value={dob} onChange={e => setDob(e.target.value)} />
              </div>
            </div>

            <div style={{ padding: '12px 16px', background: 'var(--cream)', borderRadius: 8, marginBottom: 24 }}>
              <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>
                Your data will be verified against the Dukcapil population registry. In production, this uses the official Dukcapil API endpoint. This PoC uses a local mockup database with equivalent data structure.
              </p>
            </div>

            <button className="btn btn-primary w-full" style={{ justifyContent: 'center', fontSize: 15, padding: '12px 0' }}
              onClick={handleSubmit} disabled={!nik || nik.length !== 16 || !fullName || !dob}>
              Verify identity
            </button>
          </>
        )}

        {step === 'verifying' && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ width: 60, height: 60, background: 'var(--brand-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', animation: 'spin 1.5s linear infinite' }}>
              <CreditCard size={28} style={{ color: 'var(--brand)' }} />
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Verifying your identity…</h3>
            <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Querying Dukcapil database — this takes a moment</p>
          </div>
        )}

        {step === 'success' && result && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, background: 'var(--signed-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle2 size={32} style={{ color: 'var(--signed-text)' }} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Identity verified</h2>
            <p style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 28 }}>Your identity has been confirmed against the Dukcapil database.</p>
            <div className="card" style={{ padding: '20px 24px', textAlign: 'left', marginBottom: 28 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  ['Verified name', result.name],
                  ['Date of birth', result.dob],
                  ['Registered address', result.address],
                  ['Verification status', '✓ Confirmed — Dukcapil PoC DB'],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
            <button className="btn btn-primary w-full" style={{ justifyContent: 'center', fontSize: 15, padding: '12px 0' }} onClick={onSuccess}>
              Continue to SignHere
            </button>
          </div>
        )}

        {step === 'failed' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, background: '#FCF0F0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <AlertCircle size={32} style={{ color: '#E24B4A' }} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Verification failed</h2>
            <p style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 24 }}>The provided data could not be matched in the Dukcapil database.</p>
            <button className="btn btn-secondary w-full" style={{ justifyContent: 'center' }} onClick={() => setStep('form')}>Try again</button>
          </div>
        )}
      </div>
    </div>
  )
}