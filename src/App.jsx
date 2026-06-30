import { Routes, Route, Navigate } from 'react-router-dom'
import { useApp } from './context/AppContext'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import ManagerDashboard from './pages/ManagerDashboard'
import SupervisorDashboard from './pages/SupervisorDashboard'
import DocumentsPage from './pages/DocumentsPage'
import DocumentEditor from './pages/DocumentEditor'
import DocumentComplete from './pages/DocumentComplete'
import VerifyPage from './pages/VerifyPage'
import SettingsPage from './pages/SettingsPage'

function ProtectedRoute({ children, allow }) {
  const { user, isVerified, dashboardPathFor } = useApp()
  if (!user || !isVerified) return <Navigate to="/" replace />
  if (allow && !allow.includes(user.accessRole)) {
    return <Navigate to={dashboardPathFor(user.accessRole)} replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<ProtectedRoute allow={['user']}><Dashboard /></ProtectedRoute>} />
      <Route path="/manager" element={<ProtectedRoute allow={['manager']}><ManagerDashboard /></ProtectedRoute>} />
      <Route path="/supervisor" element={<ProtectedRoute allow={['supervisor']}><SupervisorDashboard /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />
      <Route path="/documents/:id" element={<ProtectedRoute><DocumentEditor /></ProtectedRoute>} />
      <Route path="/documents/:id/complete" element={<ProtectedRoute><DocumentComplete /></ProtectedRoute>} />
      <Route path="/verify" element={<ProtectedRoute><VerifyPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
