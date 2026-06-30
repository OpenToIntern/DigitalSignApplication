import { useApp } from '../context/AppContext'
import AppLayout from '../components/AppLayout'
import { Shield, Lock, Clock, Zap, CreditCard, Bell, User, Globe } from 'lucide-react'

function SettingRow({ label, desc, value, badge }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: '16px 0', borderBottom: '1px solid var(--border-light)' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{desc}</div>
      </div>
      <div className="flex items-center gap-2">
        {badge && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'var(--signed-bg)', color: 'var(--signed-text)' }}>{badge}</span>}
        {value && <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{value}</span>}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { user } = useApp()
  return (
    <AppLayout>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 4 }}>Settings</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Security configuration and compliance status for your account</p>
        </div>

        {/* Profile */}
        <div className="card" style={{ padding: '24px', marginBottom: 24 }}>
          <div className="flex items-center gap-3" style={{ marginBottom: 20 }}>
            <User size={16} style={{ color: 'var(--brand)' }} />
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>Profile</h2>
          </div>
          <div className="flex items-center gap-4">
            <div style={{ width: 56, height: 56, background: user?.avatarColor || 'var(--brand)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 700 }}>
              {user?.initials}
            </div>
            <div>
              <div className="flex items-center gap-2" style={{ marginBottom: 2 }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>{user?.name}</span>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'var(--brand-light)', color: 'var(--brand)', textTransform: 'capitalize' }}>{user?.accessRole}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{user?.email}</div>
              <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 2 }}>NIK: {user?.nik} · {user?.role}</div>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="card" style={{ padding: '24px', marginBottom: 24 }}>
          <div className="flex items-center gap-3" style={{ marginBottom: 4 }}>
            <Shield size={16} style={{ color: 'var(--brand)' }} />
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>Security (NFR-004 – NFR-007)</h2>
          </div>
          <SettingRow label="Authentication" desc="OAuth 2.0 via Google — FR-001" badge="Active" />
          <SettingRow label="Multi-factor authentication" desc="Application-level Email OTP, 5-min expiry — FR-003" badge="Enabled" />
          <SettingRow label="Identity verification" desc="Dukcapil database PoC — FR-002" badge="Verified" />
          <SettingRow label="Encryption at rest" desc="AES-256 — NFR-004" badge="Enabled" />
          <SettingRow label="Encryption in transit" desc="TLS 1.3 — NFR-004" badge="Enabled" />
          <SettingRow label="Session timeout" desc="30 minutes inactivity — NFR-006" value="30 min" />
          <SettingRow label="Rate limiting" desc="Max 5 failed attempts → 15-min lockout — NFR-007" value="5 attempts" />
          <SettingRow label="Certificate standard" desc="X.509 self-signed CA (PoC) — NFR-005" value="X.509 / RSA-2048" />
        </div>

        {/* Compliance */}
        <div className="card" style={{ padding: '24px', marginBottom: 24 }}>
          <div className="flex items-center gap-3" style={{ marginBottom: 4 }}>
            <Globe size={16} style={{ color: 'var(--brand)' }} />
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>Compliance (BR-004)</h2>
          </div>
          {[
            ['eIDAS', 'Electronic signature directive — EU', 'Compliant'],
            ['ESIGN Act', 'Electronic signatures in global commerce — US', 'Compliant'],
            ['X.509 / PKCS', 'Cryptographic certificate standards', 'Implemented'],
            ['SHA-256', 'Document hashing baseline — FR-010', 'Implemented'],
          ].map(([label, desc, status]) => (
            <SettingRow key={label} label={label} desc={desc} badge={status} />
          ))}
        </div>

        {/* Notifications */}
        <div className="card" style={{ padding: '24px' }}>
          <div className="flex items-center gap-3" style={{ marginBottom: 4 }}>
            <Bell size={16} style={{ color: 'var(--brand)' }} />
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>Notifications (FR-007, FR-013)</h2>
          </div>
          <SettingRow label="Signature request email" desc="Notified when your signature is required — FR-007" badge="Enabled" />
          <SettingRow label="Completion email" desc="Notified when document is fully signed — FR-013" badge="Enabled" />
          <SettingRow label="In-app notifications" desc="Bell icon alerts in dashboard" badge="Enabled" />
        </div>
      </div>
    </AppLayout>
  )
}
