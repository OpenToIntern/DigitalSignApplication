import React, { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { User, Document, AppState } from '../types'
import { MOCK_USERS, MOCK_DOCUMENTS, CURRENT_USER } from '../constants/mockData'

interface AppContextValue extends AppState {
  documents: Document[]
  setCurrentUser: (user: User | null) => void
  setIsAuthenticated: (v: boolean) => void
  setMfaVerified: (v: boolean) => void
  setDukcapilVerified: (v: boolean) => void
  addDocument: (doc: Document) => void
  updateDocument: (id: string, updates: Partial<Document>) => void
  logout: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(CURRENT_USER)
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [mfaVerified, setMfaVerified] = useState(true)
  const [dukcapilVerified, setDukcapilVerified] = useState(true)
  const [documents, setDocuments] = useState<Document[]>(MOCK_DOCUMENTS)

  const addDocument = (doc: Document) => {
    setDocuments(prev => [doc, ...prev])
  }

  const updateDocument = (id: string, updates: Partial<Document>) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d))
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
