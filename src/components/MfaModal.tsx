import React, { useState, useEffect } from 'react'
import { Shield, ChevronRight, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'

interface MfaModalProps {
  email: string
  onSuccess: () => void
  onClose: () => void
}

export default function MfaModal({ email, onSuccess, onClose }: MfaModalProps) {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''))
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (timeLeft <= 0) return
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const handleInput = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return
    const next = [...otp]
    next[idx] = val.slice(-1)
    setOtp(next)
    setError('')
    if (val && idx < 5) {
      const el = document.getElementById(`otp-${idx + 1}`)
      el?.focus()
    }
  }

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      const el = document.getElementById(`otp-${idx - 1}`)
      el?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const next = Array(6).fill('')
    pasted.split('').forEach((c, i) => { next[i] = c })
    setOtp(next)
  }

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length < 6) {
      setError('Please enter the complete 6-digit code.')
      return
    }
    setLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    setLoading(false)
    if (code === '000000') {
      setError('Invalid OTP. Please try again.')
      return
    }
    onSuccess()
  }

  const handleResend = () => {
    setTimeLeft(300)
    setOtp(Array(6).fill(''))
    setError('')
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md bg-white border border-outline-variant p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield size={20} className="text-primary" />
          </div>
          <div className="text-left">
            <h2 className="text-lg font-bold text-on-surface">Two-Factor Authentication</h2>
            <p className="text-sm text-on-surface-variant">Email OTP Verification</p>
          </div>
        </div>

        <p className="text-sm text-on-surface-variant mb-6 text-left">
          We sent a 6-digit verification code to{' '}
          <span className="text-on-surface font-semibold">{email}</span>.
          Enter it below to continue.
        </p>

        {/* OTP inputs */}
        <div className="flex gap-2 justify-center mb-2" onPaste={handlePaste}>
          {otp.map((digit, idx) => (
            <input
              key={idx}
              id={`otp-${idx}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleInput(idx, e.target.value)}
              onKeyDown={e => handleKeyDown(idx, e)}
              className={`otp-input ${error ? 'border-red-500 ring-1 ring-red-500/30' : ''} bg-surface-container-lowest border-outline-variant`}
              autoFocus={idx === 0}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm text-left">
            <AlertCircle size={14} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Timer */}
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className={`font-mono font-semibold ${timeLeft < 60 ? 'text-red-600' : 'text-on-surface-variant'}`}>
            {timeLeft > 0 ? `Expires in ${formatTime(timeLeft)}` : 'Code expired'}
          </span>
          <button
            onClick={handleResend}
            disabled={timeLeft > 240}
            className="flex items-center gap-1 text-primary hover:underline font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs"
          >
            <RefreshCw size={12} />
            Resend code
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={handleVerify}
            disabled={loading || otp.join('').length < 6}
            className="btn-primary flex-1"
          >
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <RefreshCw size={14} className="animate-spin" /> Verifying...
              </span>
            ) : (
              <span className="flex items-center gap-2 justify-center">
                <CheckCircle size={14} /> Verify
              </span>
            )}
          </button>
        </div>

        <p className="text-xs text-on-surface-variant text-center mt-4">
          Hint: Enter any 6 digits (except 000000) to proceed in this demo.
        </p>
      </div>
    </div>
  )
}
