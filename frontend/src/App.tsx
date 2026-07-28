import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useApp } from './context/AppContext'

import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import SupervisorDashboard from './pages/SupervisorDashboard'
import ManagerDashboard from './pages/ManagerDashboard'
import DocumentsPage from './pages/DocumentsPage'
import DocumentEditor from './pages/DocumentEditor'
import DocumentComplete from './pages/DocumentComplete'
import VerifyPage from './pages/VerifyPage'
import AuditLogPage from './pages/AuditLogPage'
import SettingsPage from './pages/SettingsPage'
import AuthCallback from './pages/AuthCallback'
import OtpVerification from './pages/OtpVerification'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: Array<'user' | 'supervisor' | 'manager'>
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, currentUser } = useApp()

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/" replace />
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.accessRole)) {
    // If not allowed, redirect to role's dashboard
    const defaultRoutes: Record<string, string> = {
      user: '/dashboard',
      supervisor: '/supervisor',
      manager: '/manager',
    }
    return <Navigate to={defaultRoutes[currentUser.accessRole] || '/'} replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/verify-otp" element={<OtpVerification />} />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/queue"
        element={
          <ProtectedRoute>
            <SupervisorDashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/supervisor"
        element={
          <ProtectedRoute>
            <SupervisorDashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/manager"
        element={
          <ProtectedRoute>
            <ManagerDashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <DocumentsPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/documents/:id/editor"
        element={
          <ProtectedRoute>
            <DocumentEditor />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/complete"
        element={
          <ProtectedRoute>
            <DocumentComplete />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/verify"
        element={
          <ProtectedRoute>
            <VerifyPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/audit"
        element={
          <ProtectedRoute>
            <AuditLogPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
