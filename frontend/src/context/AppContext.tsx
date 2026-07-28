import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { User, Document, AppState } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function normalizeUser(user: any): User {
  const name = user?.name || user?.email?.split('@')[0] || 'Signer'
  const initials = user?.initials || name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join('') || 'S'

  return {
    id: user?.id || `temp-${user?.email || Date.now()}`,
    name,
    email: user?.email || '',
    initials,
    nik: user?.nik || '',
    verified: user?.verified ?? true,
    avatarColor: user?.avatarColor || '#9a3412',
    role: user?.role || (user?.accessRole === 'manager' ? 'Manager' : user?.accessRole === 'supervisor' ? 'Supervisor' : 'Signatory'),
    accessRole: user?.accessRole || 'supervisor',
    external: user?.external,
  }
}

interface AppContextValue extends AppState {
  token: string | null;
  setToken: (t: string | null) => void;
  documents: Document[];
  loading: boolean;
  refreshDocuments: () => Promise<void>;
  setCurrentUser: (user: User | null) => void;
  setIsAuthenticated: (v: boolean) => void;
  setMfaVerified: (v: boolean) => void;
  setDukcapilVerified: (v: boolean) => void;
  addDocument: (doc: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => Promise<Document | undefined>;
  logout: () => void;
  // Exposes the most recent failed updateDocument error so callers can surface it
  lastUpdateError: string | null;
  clearLastUpdateError: () => void;
}

const AppContext = createContext<AppContextValue | null>(null)

function mapApiDocToFrontendDoc(doc: any): Document {
  let downloadUrl = doc.fileUrl || '';
  if (downloadUrl.startsWith('/')) {
    try {
      const backendOrigin = new URL(API_BASE_URL, window.location.origin).origin;
      downloadUrl = `${backendOrigin}${downloadUrl}`;
    } catch (e) {
      console.error('Failed to construct backend origin for file download:', e);
    }
  }

  return {
    id: doc.id,
    name: doc.name,
    category: doc.category,
    size: doc.size,
    status: doc.status,
    sender: normalizeUser(doc.sender),
    recipients: doc.signatories
      ? doc.signatories
        .sort((a: any, b: any) => a.order - b.order)
        .map((s: any) => normalizeUser(s.user))
      : (doc.recipients || []).map(normalizeUser),
    uploadedAt: doc.uploadedAt,
    updatedAt: doc.updatedAt,
    baselineHash: doc.baselineHash,
    pageCount: doc.pageCount,
    downloadUrl: downloadUrl,
    markers: (doc.markers || []).map((m: any) => ({
      id: m.id,
      x: m.x,
      y: m.y,
      width: m.width,
      height: m.height,
      page: m.page,
      type: m.type,
      assignedTo: normalizeUser(m.assignedTo),
      signed: m.signed,
      signedAt: m.signedAt,
      signature: m.signature || undefined,
      metadata: m.metadata || undefined
    })),
    auditLog: (doc.auditLogs || []).map((l: any) => ({
      id: l.id,
      event: l.event,
      user: l.user ? normalizeUser(l.user) : null,
      userId: l.userId || null,
      timestamp: l.timestamp,
      ip: l.ip,
      documentId: l.documentId,
      documentName: l.documentName,
      metadata: l.metadata || undefined
    })),
    rejectionComment: doc.rejectionComment
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  // Initialize state from localStorage so page refreshes/HMR don't wipe active sessions
  const savedToken = localStorage.getItem('signhere_token')
  const savedUserRaw = localStorage.getItem('signhere_user')
  const initialUser = savedUserRaw ? JSON.parse(savedUserRaw) : null

  const [currentUser, setCurrentUserState] = useState<User | null>(initialUser)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!(savedToken && initialUser))
  const [mfaVerified, setMfaVerified] = useState<boolean>(!!(savedToken && initialUser))
  const [dukcapilVerified, setDukcapilVerified] = useState<boolean>(!!(savedToken && initialUser))
  const [token, setTokenState] = useState<string | null>(savedToken)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdateError, setLastUpdateError] = useState<string | null>(null)
  const clearLastUpdateError = () => setLastUpdateError(null)

  const setToken = (t: string | null) => {
    if (t) {
      localStorage.setItem('signhere_token', t)
    } else {
      localStorage.removeItem('signhere_token')
    }
    setTokenState(t)
  }

  const setCurrentUser = (u: User | null) => {
    if (u) {
      localStorage.setItem('signhere_user', JSON.stringify(u))
    } else {
      localStorage.removeItem('signhere_user')
    }
    setCurrentUserState(u)
  }

  const logout = () => {
    localStorage.removeItem('signhere_token')
    localStorage.removeItem('signhere_user')
    setTokenState(null)
    setCurrentUserState(null)
    setIsAuthenticated(false)
    setMfaVerified(false)
    setDukcapilVerified(false)
  }

  // Throttled token refresh on active user interactions (click/keydown) — max once per 5 min
  const lastRefreshRef = useRef<number>(Date.now())
  useEffect(() => {
    if (!isAuthenticated || !token) return

    const handleUserActivity = async () => {
      const now = Date.now()
      // Only refresh if at least 5 minutes (300,000 ms) have passed since last refresh
      if (now - lastRefreshRef.current < 300000) return
      lastRefreshRef.current = now

      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.status === 401 || res.status === 403) {
          logout()
          return
        }
        if (res.ok) {
          const data = await res.json()
          setToken(data.token)
        }
      } catch (err) {
        console.error('Error refreshing sliding session JWT:', err)
      }
    }

    window.addEventListener('click', handleUserActivity)
    window.addEventListener('keydown', handleUserActivity)
    return () => {
      window.removeEventListener('click', handleUserActivity)
      window.removeEventListener('keydown', handleUserActivity)
    }
  }, [isAuthenticated, token])

  // Fetch documents from backend API
  const refreshDocuments = async () => {
    if (!token) return
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE_URL}/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!res.ok) throw new Error('Failed to fetch documents')
      const data = await res.json()
      setDocuments(data.map(mapApiDocToFrontendDoc))
    } catch (error) {
      console.error('Error fetching documents from backend:', error)
    } finally {
      setLoading(false)
    }
  }

  // Silent refresh: same fetch but skips setLoading to avoid UI flashes
  // during background polling (won't reset scroll, close dropdowns, etc.)
  const silentRefreshDocuments = async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE_URL}/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!res.ok) throw new Error('Failed to fetch documents')
      const data = await res.json()
      setDocuments(data.map(mapApiDocToFrontendDoc))
    } catch (error) {
      console.error('Error polling documents from backend:', error)
    }
  }

  // App-wide user profile sync: polls /users/profile to keep currentUser.accessRole in sync
  const refreshUserProfile = async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE_URL}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) logout()
        return
      }
      const data = await res.json()
      const updatedUser = normalizeUser(data)
      setCurrentUser(updatedUser)
    } catch (err) {
      console.error('Error refreshing user profile in background:', err)
    }
  }

  useEffect(() => {
    if (isAuthenticated && token) {
      refreshDocuments()
      refreshUserProfile()
      // Poll every 30 seconds (same cadence as notification polling in AppLayout)
      const interval = setInterval(() => {
        silentRefreshDocuments()
        refreshUserProfile()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, token])

  const addDocument = (doc: Document) => {
    // Frontend component adds a document locally first, or we refresh
    setDocuments(prev => [doc, ...prev])
  }

  const updateDocument = async (id: string, updates: Partial<Document>) => {
    try {
      // Map frontend fields back to API fields if necessary
      const payload: any = {};
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.pageCount !== undefined) payload.pageCount = updates.pageCount;
      if (updates.recipients !== undefined) {
        payload.recipients = updates.recipients.map((r, index) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          accessRole: r.accessRole,
          order: index + 1
        }));
      }
      
      if (updates.markers !== undefined) {
        payload.markers = updates.markers.map(m => ({
          id: m.id,
          x: m.x,
          y: m.y,
          width: m.width,
          height: m.height,
          page: m.page,
          type: m.type,
          assignedTo: { id: m.assignedTo.id },
          signed: m.signed,
          signedAt: m.signedAt,
          signature: m.signature,
          metadata: m.metadata
        }));
      }

      if (updates.auditLog !== undefined) {
        payload.auditLog = updates.auditLog.map(l => ({
          id: l.id,
          event: l.event,
          user: l.user ? { id: l.user.id } : null,
          timestamp: l.timestamp,
          ip: l.ip,
          metadata: l.metadata
        }));
      }

      if (updates.rejectionComment !== undefined) {
        payload.rejectionComment = updates.rejectionComment;
      }

      const res = await fetch(`${API_BASE_URL}/documents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        // Extract real backend error message so callers can surface it
        let backendMsg = `Server error (${res.status})`
        try {
          const errJson = await res.json()
          if (errJson?.error) backendMsg = errJson.error
        } catch { /* ignore json parse failure */ }
        setLastUpdateError(backendMsg)
        throw new Error(backendMsg)
      }

      const updatedDocRaw = await res.json()
      const updatedDoc = mapApiDocToFrontendDoc(updatedDocRaw)

      setLastUpdateError(null)
      setDocuments(prev => prev.map(d => d.id === id ? updatedDoc : d))
      return updatedDoc
    } catch (error: any) {
      console.error('Error updating document on backend:', error.message || error)
      // Do NOT apply failed updates locally — keep last known-good server state.
      // lastUpdateError is already set above if it was a backend HTTP error.
      // Re-throw so calling code can show a UI error.
      throw error
    }
  }

  return (
    <AppContext.Provider value={{
      currentUser,
      isAuthenticated,
      mfaVerified,
      dukcapilVerified,
      token,
      setToken,
      documents,
      loading,
      refreshDocuments,
      setCurrentUser,
      setIsAuthenticated,
      setMfaVerified,
      setDukcapilVerified,
      addDocument,
      updateDocument,
      logout,
      lastUpdateError,
      clearLastUpdateError,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

// Convenience hooks
export function useCurrentUser() {
  return useApp().currentUser
}

export function useDocuments() {
  const { documents } = useApp()
  return documents
}
