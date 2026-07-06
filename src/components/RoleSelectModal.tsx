import React, { useState } from 'react'
import { Users, ChevronRight, CheckCircle, AlertCircle, RefreshCw, IdCard } from 'lucide-react'
import { MOCK_USERS, DUKCAPIL_MOCK_DB } from '../constants/mockData'
import type { User } from '../types'

interface RoleSelectModalProps {
  onSuccess: (user: User) => void
  onClose: () => void
  googleEmail: string
  googleName: string
}

type Step = 'role' | 'dukcapil' | 'done'

export default function RoleSelectModal({ onSuccess, onClose, googleEmail, googleName }: RoleSelectModalProps) {
  const [step, setStep] = useState<Step>('role')
  const [selectedRole, setSelectedRole] = useState<'user' | 'supervisor' | 'manager' | null>(null)
  const [nik, setNik] = useState('')
  const [dob, setDob] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const roles = [
    {
      id: 'user' as const,
      label: 'Staff',
      description: 'Upload documents and initiate signing workflows',
      icon: '',
      color: 'primary',
    },
    {
      id: 'supervisor' as const,
      label: 'Supervisor',
      description: 'Review and sign documents as first approver',
      icon: '',
      color: 'indigo',
    },
    {
      id: 'manager' as const,
      label: 'Manager',
      description: 'Final signatory. Signs after Supervisor approval',
      icon: '',
      color: 'emerald',
    },
  ]

  const handleRoleNext = () => {
    if (!selectedRole) return
    setStep('dukcapil')
  }

  const handleDukcapilVerify = async () => {
    setError('')
    if (nik.length !== 16) {
      setError('NIK must be exactly 16 digits.')
      return
    }
    if (!dob) {
      setError('Please enter your date of birth.')
      return
    }
    setLoading(true)
    await new Promise(r => setTimeout(r, 1500))
    setLoading(false)

    const record = DUKCAPIL_MOCK_DB[nik]
    if (!record) {
      setError('NIK not found in the identity database. Please check your NIK and try again.')
      return
    }
    if (record.dob !== dob) {
      setError('Date of birth does not match our records. Please verify your details.')
      return
    }

    // Find or create user
    const existingUser = MOCK_USERS.find(u => u.nik === nik)
    if (existingUser) {
      onSuccess({ ...existingUser, accessRole: selectedRole! })
    } else {
      const newUser: User = {
        id: `u-${Date.now()}`,
        name: googleName || record.name,
        email: googleEmail,
        initials: googleName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
        nik,
        verified: true,
        avatarColor: '#9a3412',
        role: selectedRole === 'manager' ? 'Manager' : selectedRole === 'supervisor' ? 'Supervisor' : 'Staff',
        accessRole: selectedRole!,
      }
      onSuccess(newUser)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-lg bg-white border border-outline-variant p-6 sm:p-8">
        {step === 'role' && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users size={20} className="text-primary" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-bold text-on-surface">Select Your Role</h2>
                <p className="text-sm text-on-surface-variant">Choose your access level in the organization</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {roles.map(role => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left
                    ${selectedRole === role.id
                      ? 'bg-primary/5 border-primary/45 shadow-sm'
                      : 'bg-surface-container-lowest border-outline-variant/60 hover:border-outline-variant hover:bg-surface-container-low'
                    }`}
                >
                  <span className="text-2xl">{role.icon}</span>
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${selectedRole === role.id ? 'text-primary' : 'text-on-surface'}`}>
                      {role.label}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{role.description}</p>
                  </div>
                  {selectedRole === role.id && (
                    <CheckCircle size={18} className="text-primary flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleRoleNext}
                disabled={!selectedRole}
                className="btn-primary flex-1"
              >
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}

        {step === 'dukcapil' && (
          <>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <IdCard size={20} className="text-primary" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-bold text-on-surface">Identity Verification</h2>
                <p className="text-sm text-on-surface-variant">Dukcapil database (mockup PoC)</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-6 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs text-left">
              <AlertCircle size={13} className="flex-shrink-0" />
              This is a PoC mockup. Real Dukcapil API integration is out of scope.
            </div>

            <div className="space-y-4 mb-6 text-left">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">NIK (16 digits)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={16}
                  value={nik}
                  onChange={e => { setNik(e.target.value.replace(/\D/g, '')); setError('') }}
                  placeholder="e.g. 3171234567890001"
                  className="input-field font-mono"
                />
                <p className="text-[10px] text-on-surface-variant mt-1">Hint: try 3171234567890001</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={e => { setDob(e.target.value); setError('') }}
                  className="input-field"
                />
                <p className="text-[10px] text-on-surface-variant mt-1">Hint: 2000-01-15</p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm text-left">
                <AlertCircle size={14} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep('role')} className="btn-secondary flex-1">Back</button>
              <button
                onClick={handleDukcapilVerify}
                disabled={loading}
                className="btn-primary flex-1"
              >
                {loading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <RefreshCw size={14} className="animate-spin" /> Verifying...
                  </span>
                ) : (
                  <span className="flex items-center gap-2 justify-center">
                    <CheckCircle size={14} /> Verify Identity
                  </span>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
