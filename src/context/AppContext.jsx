import { createContext, useContext, useState, useCallback } from 'react'

const AppContext = createContext(null)

// accessRole drives dashboard/permission routing: 'user' | 'manager' | 'supervisor'
export const MOCK_USERS = [
  { id: 'u1', name: 'Ricky Takahindangen', email: 'ricky@company.com', initials: 'RT', nik: '3201234567890001', verified: true, avatarColor: '#9B3A1A', role: 'Developer', accessRole: 'user' },
  { id: 'u2', name: 'Sarah Jenkins', email: 'sarah@company.com', initials: 'SJ', nik: '3201234567890002', verified: true, avatarColor: '#2A6496', role: 'Project Manager', accessRole: 'manager' },
  { id: 'u3', name: 'Michael Kim', email: 'michael@company.com', initials: 'MK', nik: '3201234567890003', verified: true, avatarColor: '#27723A', role: 'Legal Counsel', accessRole: 'supervisor' },
  { id: 'u4', name: 'David Chen', email: 'david@company.com', initials: 'DC', nik: '3201234567890004', verified: true, avatarColor: '#6B3A9B', role: 'CFO', accessRole: 'manager' },
]

export const ACCESS_ROLES = [
  {
    id: 'user',
    label: 'User',
    desc: 'Upload, sign, and track your own documents.',
  },
  {
    id: 'manager',
    label: 'Manager',
    desc: 'Oversee team documents, assign signatories, monitor team progress.',
  },
  {
    id: 'supervisor',
    label: 'Supervisor',
    desc: 'Organization-wide oversight, compliance audit, and approval authority.',
  },
]

const MOCK_DOCS = [
  {
    id: 'doc-001',
    name: 'Service_Agreement_v4.pdf',
    category: 'Legal',
    size: '1.2 MB',
    status: 'pending',
    sender: MOCK_USERS[1],
    recipients: [MOCK_USERS[0], MOCK_USERS[2]],
    uploadedAt: new Date(Date.now() - 2 * 3600000),
    lastActivity: '2 hours ago',
    hash: 'sha256:a3f8d2c1e4b5f67890abcdef1234567890abcdef1234567890abcdef12345678',
    auditLog: [
      { event: 'upload', user: MOCK_USERS[1], timestamp: new Date(Date.now() - 2 * 3600000), ip: '192.168.1.10' },
      { event: 'view', user: MOCK_USERS[0], timestamp: new Date(Date.now() - 1.5 * 3600000), ip: '192.168.1.22' },
    ],
    markers: [
      { id: 'm1', x: 15, y: 78, type: 'signature', assignedTo: MOCK_USERS[0], signed: false },
      { id: 'm2', x: 55, y: 78, type: 'signature', assignedTo: MOCK_USERS[2], signed: false },
    ],
    pages: 3,
    locked: false,
  },
  {
    id: 'doc-002',
    name: 'Employee_Onboarding_Pack.pdf',
    category: 'HR',
    size: '4.8 MB',
    status: 'signed',
    sender: MOCK_USERS[1],
    recipients: [MOCK_USERS[3]],
    uploadedAt: new Date(Date.now() - 26 * 3600000),
    lastActivity: 'Yesterday, 4:15 PM',
    hash: 'sha256:b7e9f3c2d5a6e78901bcdef2345678901bcdef2345678901bcdef234567890ab',
    auditLog: [
      { event: 'upload', user: MOCK_USERS[1], timestamp: new Date(Date.now() - 30 * 3600000), ip: '192.168.1.10' },
      { event: 'view', user: MOCK_USERS[3], timestamp: new Date(Date.now() - 28 * 3600000), ip: '10.0.0.15' },
      { event: 'sign', user: MOCK_USERS[3], timestamp: new Date(Date.now() - 26 * 3600000), ip: '10.0.0.15', metadata: { certId: 'X509-u4-2026', algorithm: 'SHA-256/RSA' } },
      { event: 'lock', user: MOCK_USERS[3], timestamp: new Date(Date.now() - 26 * 3600000), ip: '10.0.0.15' },
      { event: 'download', user: MOCK_USERS[1], timestamp: new Date(Date.now() - 25 * 3600000), ip: '192.168.1.10' },
    ],
    markers: [
      { id: 'm3', x: 15, y: 80, type: 'signature', assignedTo: MOCK_USERS[3], signed: true, signedAt: new Date(Date.now() - 26 * 3600000) },
    ],
    pages: 5,
    locked: true,
  },
  {
    id: 'doc-003',
    name: 'NDA_Contractor_2026.pdf',
    category: 'Legal',
    size: '0.8 MB',
    status: 'pending',
    sender: MOCK_USERS[0],
    recipients: [MOCK_USERS[2], MOCK_USERS[3]],
    uploadedAt: new Date(Date.now() - 5 * 3600000),
    lastActivity: '5 hours ago',
    hash: 'sha256:c9e1a4b3f6d2e89012cdef3456789012cdef3456789012cdef345678901234bc',
    auditLog: [
      { event: 'upload', user: MOCK_USERS[0], timestamp: new Date(Date.now() - 5 * 3600000), ip: '192.168.1.22' },
    ],
    markers: [
      { id: 'm4', x: 20, y: 72, type: 'signature', assignedTo: MOCK_USERS[2], signed: false },
      { id: 'm5', x: 55, y: 72, type: 'signature', assignedTo: MOCK_USERS[3], signed: false },
    ],
    pages: 2,
    locked: false,
  },
  {
    id: 'doc-004',
    name: 'Partnership_Agreement_v2.pdf',
    category: 'Business',
    size: '2.1 MB',
    status: 'draft',
    sender: MOCK_USERS[0],
    recipients: [],
    uploadedAt: new Date(Date.now() - 10 * 3600000),
    lastActivity: '10 hours ago',
    hash: 'sha256:d2f4b5c7e8a1f90123def4567890123def4567890123def4567890123456def0',
    auditLog: [
      { event: 'upload', user: MOCK_USERS[0], timestamp: new Date(Date.now() - 10 * 3600000), ip: '192.168.1.22' },
    ],
    markers: [],
    pages: 4,
    locked: false,
  },
  {
    id: 'doc-005',
    name: 'Vendor_Contract_Q2_2026.pdf',
    category: 'Procurement',
    size: '3.4 MB',
    status: 'signed',
    sender: MOCK_USERS[2],
    recipients: [MOCK_USERS[0], MOCK_USERS[1]],
    uploadedAt: new Date(Date.now() - 72 * 3600000),
    lastActivity: '3 days ago',
    hash: 'sha256:e3a5c6d8f9b2a01234ef5678901234ef5678901234ef5678901234567890ef12',
    auditLog: [
      { event: 'upload', user: MOCK_USERS[2], timestamp: new Date(Date.now() - 72 * 3600000), ip: '10.0.0.18' },
      { event: 'sign', user: MOCK_USERS[0], timestamp: new Date(Date.now() - 70 * 3600000), ip: '192.168.1.22', metadata: { certId: 'X509-u1-2026', algorithm: 'SHA-256/RSA' } },
      { event: 'sign', user: MOCK_USERS[1], timestamp: new Date(Date.now() - 68 * 3600000), ip: '192.168.1.10', metadata: { certId: 'X509-u2-2026', algorithm: 'SHA-256/RSA' } },
      { event: 'lock', user: MOCK_USERS[1], timestamp: new Date(Date.now() - 68 * 3600000), ip: '192.168.1.10' },
      { event: 'download', user: MOCK_USERS[0], timestamp: new Date(Date.now() - 67 * 3600000), ip: '192.168.1.22' },
    ],
    markers: [
      { id: 'm6', x: 15, y: 75, type: 'signature', assignedTo: MOCK_USERS[0], signed: true, signedAt: new Date(Date.now() - 70 * 3600000) },
      { id: 'm7', x: 55, y: 75, type: 'signature', assignedTo: MOCK_USERS[1], signed: true, signedAt: new Date(Date.now() - 68 * 3600000) },
    ],
    pages: 6,
    locked: true,
  },
]

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isVerified, setIsVerified] = useState(false)
  const [documents, setDocuments] = useState(MOCK_DOCS)
  const [toast, setToast] = useState(null)
  const [mfaStep, setMfaStep] = useState(false)
  // Session timer: NFR-006 (30 min inactivity) — tracked but not auto-logout in PoC
  const [sessionStart] = useState(Date.now())

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type, id: Date.now() })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const login = useCallback((userData, accessRoleOverride) => {
    const finalUser = accessRoleOverride ? { ...userData, accessRole: accessRoleOverride } : userData
    setUser(finalUser)
    setMfaStep(true)
  }, [])

  const dashboardPathFor = useCallback((accessRole) => {
    if (accessRole === 'supervisor') return '/supervisor'
    if (accessRole === 'manager') return '/manager'
    return '/dashboard'
  }, [])

  const completeMfa = useCallback(() => {
    setMfaStep(false)
  }, [])

  const completeVerification = useCallback(() => {
    setIsVerified(true)
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setIsVerified(false)
    setMfaStep(false)
  }, [])

  const addDocument = useCallback((doc) => {
    setDocuments(prev => [doc, ...prev])
  }, [])

  const updateDocument = useCallback((id, updates) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d))
  }, [])

  const signDocument = useCallback((docId, markerId, signatureData, currentUser) => {
    const signingUser = currentUser || user
    setDocuments(prev => prev.map(doc => {
      if (doc.id !== docId) return doc
      const newMarkers = doc.markers.map(m =>
        m.id === markerId
          ? {
              ...m,
              signed: true,
              signedAt: new Date(),
              signature: signatureData,
              metadata: {
                signerId: signingUser?.id,
                signerEmail: signingUser?.email,
                timestamp: new Date().toISOString(),
                ip: '192.168.1.' + Math.floor(Math.random() * 200 + 10),
                certId: `X509-${signingUser?.id}-2026`,
                algorithm: 'SHA-256/RSA',
                baselineHash: doc.hash,
              }
            }
          : m
      )
      const allSigned = newMarkers.every(m => m.signed)
      const newLog = [
        ...doc.auditLog,
        {
          event: 'sign',
          user: signingUser,
          timestamp: new Date(),
          ip: '192.168.1.' + Math.floor(Math.random() * 200 + 10),
          metadata: {
            certId: `X509-${signingUser?.id}-2026`,
            algorithm: 'SHA-256/RSA',
            baselineHash: doc.hash,
          }
        },
        ...(allSigned ? [{
          event: 'lock',
          user: signingUser,
          timestamp: new Date(),
          ip: '192.168.1.' + Math.floor(Math.random() * 200 + 10),
        }] : [])
      ]
      return {
        ...doc,
        markers: newMarkers,
        status: allSigned ? 'signed' : 'pending',
        locked: allSigned,
        auditLog: newLog,
        lastActivity: 'Just now',
      }
    }))
  }, [user])

  const logAuditEvent = useCallback((docId, event, extra = {}) => {
    setDocuments(prev => prev.map(doc => {
      if (doc.id !== docId) return doc
      return {
        ...doc,
        auditLog: [...doc.auditLog, {
          event,
          user,
          timestamp: new Date(),
          ip: '192.168.1.' + Math.floor(Math.random() * 200 + 10),
          ...extra,
        }]
      }
    }))
  }, [user])

  const stats = {
    total: documents.length,
    pending: documents.filter(d => d.status === 'pending').length,
    signed: documents.filter(d => d.status === 'signed').length,
    draft: documents.filter(d => d.status === 'draft').length,
    awaitingMe: documents.filter(d =>
      d.status === 'pending' &&
      d.markers.some(m => !m.signed && m.assignedTo?.id === user?.id)
    ).length,
  }

  // Org-wide stats used by manager/supervisor dashboards
  const orgStats = {
    total: documents.length,
    pending: documents.filter(d => d.status === 'pending').length,
    signed: documents.filter(d => d.status === 'signed').length,
    draft: documents.filter(d => d.status === 'draft').length,
    activeUsers: MOCK_USERS.length,
    avgCompletionHrs: 4.2,
    flagged: documents.filter(d => d.status === 'pending' && d.auditLog.length <= 1).length,
  }

  return (
    <AppContext.Provider value={{
      user, setUser, login, logout,
      isVerified, setIsVerified, completeVerification,
      mfaStep, setMfaStep, completeMfa,
      documents, addDocument, updateDocument, signDocument, logAuditEvent,
      stats, orgStats, showToast, toast,
      mockUsers: MOCK_USERS,
      dashboardPathFor,
      sessionStart,
    }}>
      {children}
      {toast && (
        <div className="toast" key={toast.id} style={{ background: toast.type === 'error' ? '#C0392B' : 'var(--text-1)' }}>
          <span style={{ fontSize: 16 }}>{toast.type === 'success' ? '✓' : '✗'}</span>
          {toast.msg}
        </div>
      )}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
