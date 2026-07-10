import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { User, Document, AppState } from '../types'
import { CURRENT_USER } from '../constants/mockData'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function normalizeUser(user: any): User {
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
  documents: Document[]
  loading: boolean
  refreshDocuments: () => Promise<void>
  setCurrentUser: (user: User | null) => void
  setIsAuthenticated: (v: boolean) => void
  setMfaVerified: (v: boolean) => void
  setDukcapilVerified: (v: boolean) => void
  addDocument: (doc: Document) => void
  updateDocument: (id: string, updates: Partial<Document>) => Promise<void>
  logout: () => void
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
      timestamp: l.timestamp,
      ip: l.ip,
      documentId: l.documentId,
      documentName: l.documentName
    }))
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(CURRENT_USER)
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [mfaVerified, setMfaVerified] = useState(true)
  const [dukcapilVerified, setDukcapilVerified] = useState(true)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch documents from backend API
  const refreshDocuments = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE_URL}/documents`)
      if (!res.ok) throw new Error('Failed to fetch documents')
      const data = await res.json()
      setDocuments(data.map(mapApiDocToFrontendDoc))
    } catch (error) {
      console.error('Error fetching documents from backend:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      refreshDocuments()
    }
  }, [isAuthenticated])

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

      const res = await fetch(`${API_BASE_URL}/documents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Failed to update document on backend')
      const updatedDocRaw = await res.json()
      const updatedDoc = mapApiDocToFrontendDoc(updatedDocRaw)

      setDocuments(prev => prev.map(d => d.id === id ? updatedDoc : d))
    } catch (error) {
      console.error('Error updating document on backend:', error)
      // Fallback local update if backend fails
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d))
    }
  }

  const logout = () => {
    setCurrentUser(null)
    setIsAuthenticated(false)
    setMfaVerified(false)
    setDukcapilVerified(false)
  }

  return (
    <AppContext.Provider value={{
      currentUser,
      isAuthenticated,
      mfaVerified,
      dukcapilVerified,
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
