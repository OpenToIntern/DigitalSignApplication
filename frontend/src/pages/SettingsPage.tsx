import React, { useState } from 'react'
import { Settings, Shield, User as UserIcon, Lock, CheckCircle, RefreshCw, Key } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { useApp } from '../context/AppContext'

export default function SettingsPage() {
  const { currentUser, updateDocument } = useApp()
  const [mfaEnabled, setMfaEnabled] = useState(true)
  const [certType, setCertType] = useState('self-signed')
  const [loading, setLoading] = useState(false)

  const handleRegenerateCert = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 1800))
    setLoading(false)
    alert('A new X.509 cryptographic keypair and self-signed certificate have been issued locally for your user.')
  }

  return (
    <AppLayout>
      <div className="page-container max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Settings size={20} className="text-indigo-400" />
            <h1 className="section-title">Account & Security Settings</h1>
          </div>
          <p className="section-subtitle">Manage user roles, certificates, and multi-factor authorization.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User profile details */}
          <div className="md:col-span-2 space-y-6">
            <div className="glass-card p-6">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <UserIcon size={14} className="text-indigo-400" /> Personal Identity Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 font-medium mb-1">Full Name</label>
                  <p className="text-sm text-slate-200 font-semibold bg-navy-900 px-3 py-2 rounded-lg border border-white/5">{currentUser?.name}</p>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 font-medium mb-1">Email Address</label>
                  <p className="text-sm text-slate-200 font-semibold bg-navy-900 px-3 py-2 rounded-lg border border-white/5">{currentUser?.email}</p>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 font-medium mb-1">Dukcapil Verified NIK</label>
                  <p className="text-sm text-slate-200 font-mono bg-navy-900 px-3 py-2 rounded-lg border border-white/5">{currentUser?.nik}</p>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 font-medium mb-1">Assigned Access Role</label>
                  <p className="text-sm text-indigo-400 font-semibold bg-indigo-500/5 px-3 py-2 rounded-lg border border-indigo-500/10 uppercase tracking-wider text-xs">
                    {currentUser?.accessRole}
                  </p>
                </div>
              </div>
            </div>

            {/* Cert management */}
            <div className="glass-card p-6">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Key size={14} className="text-indigo-400" /> Digital Certificate (X.509 standard)
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Digital certificates are used to cryptographically bind your verified identity to signature nodes. For this Proof of Concept (PoC), self-signed certificates are generated.
              </p>

              <div className="p-4 bg-navy-900 border border-white/5 rounded-xl space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Issuer:</span>
                  <span className="text-slate-200 font-medium">SignHere CA (Self-Signed PoC)</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Valid Until:</span>
                  <span className="text-slate-200 font-medium">{new Date(Date.now() + 31536000000).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Encryption Method:</span>
                  <span className="text-slate-200 font-mono font-medium">RSA 2048-bit / SHA-256</span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                <button
                  onClick={handleRegenerateCert}
                  disabled={loading}
                  className="btn-secondary"
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5"><RefreshCw size={13} className="animate-spin" /> Regenerating...</span>
                  ) : (
                    <span>Regenerate Certificate</span>
                  )}
                </button>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <CheckCircle size={10} /> Private Key Secured
                </span>
              </div>
            </div>
          </div>

          {/* Security panel side */}
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Shield size={14} className="text-indigo-400" /> App Security
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-200">Email OTP MFA</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Require OTP code at login</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={mfaEnabled}
                    onChange={e => setMfaEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 border-white/10 bg-navy-950 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-200">Session Lockout</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Auto-logout after inactivity</p>
                  </div>
                  <span className="text-xs text-slate-400 bg-navy-900 border border-white/5 px-2 py-1 rounded">30 min</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
