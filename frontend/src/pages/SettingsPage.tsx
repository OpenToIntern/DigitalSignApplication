import React, { useState, useEffect } from 'react'
import { Settings, Shield, User as UserIcon, Lock, CheckCircle, RefreshCw, Key, AlertTriangle, AlertCircle, HelpCircle, Users } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { useApp } from '../context/AppContext'

interface ProfileData {
  id: string
  name: string
  email: string
  accessRole: string
  nik: string | null
  nikVerified: boolean
  hasPrivateKey: boolean
  certificate: {
    issuer: string
    subject: string
    validFrom: string
    validTo: string
    encryptionMethod: string
    pem: string
  } | null
}

export default function SettingsPage() {
  const { token, currentUser } = useApp()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; email: string; accessRole: string }>>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [roleUpdateError, setRoleUpdateError] = useState<string | null>(null)
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    userId: string
    userName: string
    currentRole: string
    newRole: string
  } | null>(null)

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

  const fetchProfile = async () => {
    if (!token) return
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${apiBase}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!res.ok) throw new Error('Failed to fetch user profile details')
      const data = await res.json()
      setProfile(data)
    } catch (err: any) {
      console.error('Error fetching profile:', err)
      setError(err.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllUsers = async () => {
    if (!token || currentUser?.accessRole !== 'manager') return
    try {
      setLoadingUsers(true)
      const res = await fetch(`${apiBase}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch team users')
      const data = await res.json()
      setAllUsers(data)
    } catch (err: any) {
      console.error('Error fetching team users:', err)
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    fetchProfile()
    fetchAllUsers()
  }, [token, currentUser])

  const executeRoleChange = async (userId: string, newRole: string) => {
    if (!token) return
    try {
      setUpdatingUserId(userId)
      setRoleUpdateError(null)
      const res = await fetch(`${apiBase}/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ accessRole: newRole })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update user role.')

      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, accessRole: newRole } : u))
    } catch (err: any) {
      console.error('Error updating user role:', err)
      setRoleUpdateError(err.message || 'Failed to update user role.')
    } finally {
      setUpdatingUserId(null)
      setPendingRoleChange(null)
    }
  }

  const handleRegenerateCert = async () => {
    if (!token) return
    try {
      setRegenerating(true)
      const res = await fetch(`${apiBase}/users/regenerate-cert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!res.ok) throw new Error('Failed to regenerate certificate')
      await fetchProfile() // Reload updated profile
      setShowWarning(false)
      alert('Your cryptographic certificate and RSA keypair have been successfully regenerated.')
    } catch (err: any) {
      console.error('Error regenerating cert:', err)
      alert(err.message || 'Failed to regenerate certificate.')
    } finally {
      setRegenerating(false)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    } catch (e) {
      return dateStr
    }
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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <RefreshCw size={32} className="animate-spin text-primary mb-3" />
            <p className="text-sm font-semibold">Loading profile information...</p>
          </div>
        ) : error ? (
          <div className="glass-card p-8 flex flex-col items-center justify-center text-red-500 max-w-md mx-auto text-center">
            <AlertCircle size={40} className="mb-3 opacity-60" />
            <h3 className="font-semibold mb-1">Error Loading Settings</h3>
            <p className="text-xs opacity-80 mb-4">{error}</p>
            <button onClick={fetchProfile} className="btn-secondary text-xs">Try Again</button>
          </div>
        ) : profile ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* User profile details */}
            <div className="md:col-span-2 space-y-6">
              <div className="glass-card p-6">
                <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-4 flex items-center gap-2">
                  <UserIcon size={15} className="text-primary" /> Personal Identity Details
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-on-surface-variant font-medium mb-1">Full Name</label>
                    <p className="text-xs font-bold text-on-surface bg-surface-container-low px-3.5 py-2.5 rounded-xl border border-outline-variant/40">{profile.name}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-on-surface-variant font-medium mb-1">Email Address</label>
                    <p className="text-xs font-bold text-on-surface font-mono bg-surface-container-low px-3.5 py-2.5 rounded-xl border border-outline-variant/40">{profile.email}</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs text-on-surface-variant font-medium">Dukcapil Verified NIK</label>
                      {profile.nikVerified && profile.nik && (
                        <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold uppercase tracking-wider">
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-on-surface font-mono bg-surface-container-low px-3.5 py-2.5 rounded-xl border border-outline-variant/40">
                      {profile.nikVerified && profile.nik ? profile.nik : <span className="text-on-surface-variant/70 italic font-sans text-xs font-normal">Not Verified</span>}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-on-surface-variant font-medium mb-1">Assigned Access Role</label>
                    <p className="text-xs font-bold text-primary bg-primary/10 px-3.5 py-2.5 rounded-xl border border-primary/20 uppercase tracking-wider">
                      {profile.accessRole}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cert management */}
              <div className="glass-card p-6">
                <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Key size={15} className="text-primary" /> Digital Certificate (X.509 standard)
                </h2>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
                  Digital certificates are used to cryptographically bind your verified identity to signature nodes. For this Proof of Concept (PoC), self-signed certificates are generated.
                </p>

                {profile.certificate ? (
                  <div className="p-4 bg-surface-container-lowest border border-outline-variant/40 rounded-xl space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-on-surface-variant font-medium">Issuer:</span>
                      <span className="text-on-surface font-bold truncate max-w-[280px]" title={profile.certificate.issuer}>
                        {profile.certificate.issuer}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-on-surface-variant font-medium">Valid Until:</span>
                      <span className="text-on-surface font-bold font-mono">
                        {formatDate(profile.certificate.validTo)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-on-surface-variant font-medium">Encryption Method:</span>
                      <span className="text-on-surface font-bold font-mono">
                        {profile.certificate.encryptionMethod}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-surface-container-low border border-dashed border-outline-variant/60 rounded-xl flex flex-col items-center justify-center text-center py-6">
                    <AlertCircle size={24} className="text-on-surface-variant/40 mb-2" />
                    <p className="text-xs text-on-surface font-bold mb-1">No certificate generated yet</p>
                    <p className="text-[11px] text-on-surface-variant max-w-[280px]">
                      One will be automatically created when you first sign a document in the system.
                    </p>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-outline-variant/30 pt-4">
                  <button
                    onClick={() => setShowWarning(true)}
                    disabled={regenerating}
                    className="btn-secondary"
                  >
                    {regenerating ? (
                      <span className="flex items-center gap-1.5">
                        <RefreshCw size={13} className="animate-spin" /> Regenerating...
                      </span>
                    ) : (
                      <span>Regenerate Certificate</span>
                    )}
                  </button>
                  {profile.hasPrivateKey ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-semibold">
                      <CheckCircle size={10} /> Private Key Secured
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-lg border border-outline-variant/40 font-semibold">
                      <HelpCircle size={10} /> No Certificate Yet
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Security panel side */}
            <div className="space-y-6">
              <div className="glass-card p-6">
                <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Shield size={15} className="text-primary" /> App Security
                </h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-on-surface">Email OTP MFA</p>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">Require OTP code at login</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 uppercase">
                      Always Enabled
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-outline-variant/30 pt-3">
                    <div>
                      <p className="text-xs font-bold text-on-surface">Session Lockout</p>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">Sliding 30-min window — renews on activity</p>
                    </div>
                    <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-semibold">30 min idle</span>
                  </div>
                </div>
              </div>

              {/* Team Access Roles Card (Manager Only) */}
              {currentUser?.accessRole === 'manager' && (
                <div className="glass-card p-6">
                  <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Users size={15} className="text-primary" /> Team Access & Roles
                  </h2>
                  <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
                    Assign authorization roles to team members. Role changes apply on their next session.
                  </p>

                  {roleUpdateError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                      <AlertCircle size={14} />
                      <span>{roleUpdateError}</span>
                    </div>
                  )}

                  {loadingUsers ? (
                    <div className="py-6 flex items-center justify-center text-on-surface-variant text-xs gap-2">
                      <RefreshCw size={14} className="animate-spin text-primary" /> Loading team members...
                    </div>
                  ) : (
                    <div className="divide-y divide-outline-variant/30 border border-outline-variant/40 rounded-xl bg-surface-container-lowest overflow-hidden">
                      {allUsers.map(u => {
                        const isSelf = u.id === profile?.id || u.email === currentUser?.email;
                        return (
                          <div key={u.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-surface-container-low transition-colors">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-on-surface truncate">{u.name}</p>
                                {isSelf && (
                                  <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-mono uppercase font-semibold">You</span>
                                )}
                              </div>
                              <p className="text-[11px] text-on-surface-variant font-mono truncate mt-0.5">{u.email}</p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {updatingUserId === u.id && <RefreshCw size={12} className="animate-spin text-primary" />}
                              {isSelf ? (
                                <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 uppercase tracking-wider">
                                  {u.accessRole}
                                </span>
                              ) : (
                                <select
                                  value={u.accessRole}
                                  disabled={updatingUserId === u.id}
                                  onChange={(e) => {
                                    const newRole = e.target.value
                                    if (newRole !== u.accessRole) {
                                      setPendingRoleChange({
                                        userId: u.id,
                                        userName: u.name,
                                        currentRole: u.accessRole,
                                        newRole
                                      })
                                    }
                                  }}
                                  className="text-xs font-semibold bg-white text-on-surface border border-outline-variant px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-primary cursor-pointer disabled:opacity-50"
                                >
                                  <option value="user">Staff (user)</option>
                                  <option value="supervisor">Supervisor</option>
                                  <option value="manager">Manager</option>
                                </select>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Role Change Confirmation Modal */}
      {pendingRoleChange && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md w-full p-6 space-y-4 text-left bg-white border border-outline-variant shadow-xl rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <Users size={20} />
              </div>
              <h3 className="font-display font-bold text-lg text-on-surface">Confirm Access Role Change</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Are you sure you want to change <strong className="text-on-surface font-bold">{pendingRoleChange.userName}</strong>'s role from{' '}
              <span className="capitalize font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">{pendingRoleChange.currentRole}</span> to{' '}
              <span className="capitalize font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">{pendingRoleChange.newRole}</span>?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setPendingRoleChange(null)}
                disabled={updatingUserId !== null}
                className="btn-secondary py-2 px-4 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => executeRoleChange(pendingRoleChange.userId, pendingRoleChange.newRole)}
                disabled={updatingUserId !== null}
                className="btn-primary py-2 px-4 text-xs font-bold gap-2"
              >
                {updatingUserId ? <RefreshCw size={14} className="animate-spin" /> : null}
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning Confirmation Modal */}
      {showWarning && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-4 animate-scale-in text-left">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} />
              </div>
              <h3 className="font-display font-bold text-lg text-on-surface">Confirm Certificate Regeneration</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              <strong>Warning:</strong> Regenerating your certificate will generate a new cryptographic keypair. This will invalidate the validation chain for any past documents you have signed with your old certificate.
            </p>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Are you sure you want to proceed?
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowWarning(false)}
                disabled={regenerating}
                className="btn-ghost text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerateCert}
                disabled={regenerating}
                className="btn-primary bg-amber-600 hover:bg-amber-700 text-xs text-white border-none"
              >
                {regenerating ? 'Regenerating...' : 'Yes, Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
