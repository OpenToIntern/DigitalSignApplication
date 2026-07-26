import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Clock, CheckCircle, Lock, AlertCircle, Plus,
  Search, ArrowRight
} from 'lucide-react'
import AppLayout from '../components/AppLayout'
import UploadModal from '../components/UploadModal'
import { useApp } from '../context/AppContext'
import type { Document } from '../types'

function StatusBadge({ status }: { status: Document['status'] }) {
  const map: Record<Document['status'], React.ReactNode> = {
    draft:             <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Draft</span>,
    pending_supervisor:<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">Pending Supervisor</span>,
    pending_manager:   <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">Pending Manager</span>,
    signed:            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">Signed</span>,
    locked:            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">Completed</span>,
    rejected:          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-800 border border-red-200">Rejected</span>,
  }
  return <>{map[status]}</>
}

function getSigningProgress(doc: Document) {
  const signatureMarkers = doc.markers ? doc.markers.filter(m => m.type === 'signature') : []
  
  if (signatureMarkers.length > 0) {
    const totalUsers = Array.from(new Set(signatureMarkers.map(m => m.assignedTo.id)))
    const signedUsers = totalUsers.filter(userId => {
      const userMarkers = signatureMarkers.filter(m => m.assignedTo.id === userId)
      return userMarkers.every(m => m.signed)
    })
    return {
      signed: signedUsers.length,
      total: totalUsers.length
    }
  }

  // Fallback to recipients (e.g. for mock data without markers)
  const totalRecipients = doc.recipients ? doc.recipients.length : 0
  if (totalRecipients > 0) {
    let signed = 0
    if (doc.status === 'locked' || doc.status === 'signed') {
      signed = totalRecipients
    } else if (doc.status === 'pending_manager') {
      // Supervisor has signed, Manager has not.
      signed = 1
    }
    return { signed, total: totalRecipients }
  }

  return { signed: 0, total: 0 }
}

export default function Dashboard() {
  const { documents, currentUser, addDocument, refreshDocuments, token } = useApp()
  const [showUpload, setShowUpload] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'signed' | 'pending'>('all')
  const navigate = useNavigate()

  const myDocs = documents.filter(d => d.sender.id === currentUser?.id)

  const filteredDocs = myDocs.filter(d => {
    if (activeTab === 'all') return true
    if (activeTab === 'signed') return d.status === 'locked' || d.status === 'signed'
    if (activeTab === 'pending') return d.status === 'pending_supervisor' || d.status === 'pending_manager'
    return true
  })

  // Compute real stats from actual documents
  const totalDocs = myDocs.length

  const pendingCount = myDocs.filter(
    d => d.status === 'pending_supervisor' || d.status === 'pending_manager'
  ).length

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const completedThisMonth = myDocs.filter(d => {
    if (d.status !== 'locked') return false
    const updated = new Date(d.updatedAt)
    return updated.getMonth() === currentMonth && updated.getFullYear() === currentYear
  }).length

  const lockedDocs = myDocs.filter(d => d.status === 'locked')
  let avgCompletionLabel = '—'
  if (lockedDocs.length > 0) {
    const totalMs = lockedDocs.reduce((sum, d) => {
      const start = new Date(d.uploadedAt).getTime()
      const end = new Date(d.updatedAt).getTime()
      return sum + Math.max(0, end - start)
    }, 0)
    const avgMs = totalMs / lockedDocs.length
    const avgHours = avgMs / (1000 * 60 * 60)
    if (avgHours < 1) {
      avgCompletionLabel = `${Math.round(avgHours * 60)}m`
    } else if (avgHours < 24) {
      avgCompletionLabel = `${avgHours.toFixed(1)}h`
    } else {
      avgCompletionLabel = `${(avgHours / 24).toFixed(1)}d`
    }
  }

  const stats = [
    { label: 'Total Documents', value: String(totalDocs), icon: <FileText size={18} className="text-primary" />, sub: 'documents' },
    { label: 'Pending Signature', value: String(pendingCount), icon: <Clock size={18} className="text-amber-600" />, sub: 'awaiting sign' },
    { label: 'Completed This Month', value: String(completedThisMonth), icon: <CheckCircle size={18} className="text-emerald-600" />, sub: 'locked docs' },
    { label: 'Avg. Completion Time', value: avgCompletionLabel, icon: <Clock size={18} className="text-primary" />, sub: 'turnaround' },
  ]

  const handleUpload = async (file: File) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', 'General')
      formData.append('senderId', currentUser?.id || 'usr-001')

      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const res = await fetch(`${apiBase}/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!res.ok) throw new Error('Upload failed')
      const uploadedDocRaw = await res.json()

      // Refresh documents list
      await refreshDocuments()

      setShowUpload(false)
      navigate(`/documents/${uploadedDocRaw.id}/editor`)
    } catch (err) {
      console.error('Failed to upload document to backend:', err)
      alert('Error uploading file to server. Make sure the backend server is running.')
    }
  }

  return (
    <AppLayout>
      <div className="page-container max-w-6xl mx-auto space-y-6">
        
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-on-surface">
              Welcome back, {currentUser?.name.split(' ')[0]}
            </h1>
            <p className="text-on-surface-variant text-xs mt-0.5">
              You have {myDocs.filter(d => d.status.startsWith('pending')).length} documents awaiting your signature today.
            </p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="btn-primary"
          >
            <Plus size={16} /> New Document
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="stat-card">
              <div className="flex justify-between items-center">
                <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center">
                  {s.icon}
                </div>
              </div>
              <p className="text-2xl font-bold text-on-surface mt-2">{s.value}</p>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Activity Table Card */}
        <div className="glass-card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/60 bg-surface-container-low">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-on-surface uppercase tracking-wider">Recent Activity</span>
              <div className="flex gap-1.5">
                {(['all', 'signed', 'pending'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors capitalize
                      ${activeTab === tab
                        ? 'bg-primary text-white'
                        : 'text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => navigate('/documents')}
              className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
            >
              View all documents <ArrowRight size={13} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header px-6 py-3 text-left">Document Name</th>
                  <th className="table-header px-4 py-3 text-left">Status</th>
                  <th className="table-header px-4 py-3 text-left">Sender</th>
                  <th className="table-header px-4 py-3 text-left">Recipient</th>
                  <th className="table-header px-6 py-3 text-right">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.slice(0, 5).map(doc => (
                  <tr
                    key={doc.id}
                    onClick={() => {
                      if (doc.status === 'locked') {
                        navigate('/complete', { state: { documentName: doc.name, docId: doc.id } })
                      } else {
                        navigate(`/documents/${doc.id}/editor`)
                      }
                    }}
                    className="hover:bg-surface-container-low transition-colors group cursor-pointer"
                  >
                    <td className="table-cell px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                          <FileText size={15} />
                        </div>
                        <div>
                          <p className="font-semibold text-on-surface truncate max-w-[220px] group-hover:text-primary transition-colors">
                            {doc.name}
                          </p>
                          <p className="text-[10px] text-on-surface-variant/70">{doc.category} · {doc.size}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell px-4">
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={doc.status} />
                        {(() => {
                          const { signed, total } = getSigningProgress(doc)
                          if (total > 0) {
                            return (
                              <span className="text-[10px] text-on-surface-variant/60 font-medium">
                                {signed} of {total} signed
                              </span>
                            )
                          }
                          return null
                        })()}
                      </div>
                    </td>
                    <td className="table-cell px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-primary/10 border border-outline-variant flex items-center justify-center text-[10px] font-bold text-primary">
                          {doc.sender.initials}
                        </div>
                        <span className="text-xs text-on-surface-variant font-medium">{doc.sender.name}</span>
                      </div>
                    </td>
                    <td className="table-cell px-4">
                      <div className="flex items-center gap-2">
                        {doc.recipients.length > 0 ? (
                          <>
                            <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-100 border border-outline-variant flex items-center justify-center text-[10px] font-bold text-slate-700">
                              {doc.recipients[0].initials}
                            </div>
                            <span className="text-xs text-on-surface-variant font-medium">
                              {doc.recipients[0].name.split(' ')[0]}
                              {doc.recipients.length > 1 && ` +${doc.recipients.length - 1}`}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-on-surface-variant/40 italic">None</span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell px-6 text-right text-xs text-on-surface-variant/70 font-mono">
                      {new Date(doc.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showUpload && (
        <UploadModal onUpload={handleUpload} onClose={() => setShowUpload(false)} />
      )}
    </AppLayout>
  )
}
