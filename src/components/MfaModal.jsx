import { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { X, Mail, Shield } from 'lucide-react'

export default function MfaModal({ onSuccess, onClose }) {
  const { user } = useApp()
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [sending, setSending] = useState(true)
  const [timeLeft, setTimeLeft] = useState(300)
  const [sent, setSent] = useState(false)
  const refs = useRef([])

  useEffect(() => {
    const t = setTimeout(() => { setSending(false); setSent(true) }, 1200)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!timeLeft) return
    const t = setInterval(() => setTimeLeft(p => p - 1), 1000)
    return () => clearInterval(t)
  }, [timeLeft])

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]
    next[i] = val
    setOtp(next)
    setError('')
    if (val && i < 5) refs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus()
  }

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (paste.length === 6) {
      setOtp(paste.split(''))
      refs.current[5]?.focus()
    }
  }

  const handleVerify = () => {
    const code = otp.join('')
    // Accept any 6-digit code or the demo code 123456
    if (code.length < 6) { setError('Enter the 6-digit code sent to your email'); return }
    // For demo, accept anything or 123456
    onSuccess()
  }

  const maskedEmail = user?.email.replace(/(.{2}).+(@.+)/, '$1***$2')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}><X size={18} /></button>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, background: 'var(--brand-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Shield size={26} style={{ color: 'var(--brand)' }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Two-factor authentication</h2>
          <p style={{ color: 'var(--text-3)', fontSize: 14, lineHeight: 1.6 }}>
            {sending ? 'Sending verification code…' : (
              <>A 6-digit code was sent to <strong style={{ color: 'var(--text-1)' }}>{maskedEmail}</strong>.<br />It expires in {fmt(timeLeft)}.</>
            )}
          </p>
        </div>

        {!sending && (
          <>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 8 }}>
              {otp.map((digit, i) => (
                <input key={i} ref={el => refs.current[i] = el}
                  value={digit}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  maxLength={1}
                  style={{
                    width: 52, height: 58, textAlign: 'center', fontSize: 22, fontWeight: 600,
                    border: `2px solid ${error ? '#E24B4A' : digit ? 'var(--brand)' : 'var(--border)'}`,
                    borderRadius: 10, outline: 'none', background: 'var(--white)',
                    transition: 'border-color 0.15s',
                    color: 'var(--text-1)',
                  }}
                />
              ))}
            </div>
            {error && <p style={{ color: '#E24B4A', fontSize: 13, textAlign: 'center', marginBottom: 8 }}>{error}</p>}

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', fontSize: 12, color: 'var(--text-4)', marginBottom: 6 }}>
                <Mail size={12} /> Demo: enter any 6 digits or use <strong style={{ fontFamily: 'monospace', color: 'var(--text-2)' }}>123456</strong>
              </div>
            </div>

            <button className="btn btn-primary w-full" style={{ justifyContent: 'center', fontSize: 15, padding: '12px 0' }} onClick={handleVerify}>
              Verify and continue
            </button>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--brand)' }}
                onClick={() => { setTimeLeft(300); setOtp(['', '', '', '', '', '']) }}>
                Resend code
              </button>
            </div>
          </>
        )}

        <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--cream)', borderRadius: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)', marginTop: 5, flexShrink: 0 }} />
        </div>
      </div>
    </div>
  )
}