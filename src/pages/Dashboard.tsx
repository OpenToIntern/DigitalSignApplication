import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Clock, CheckCircle, Lock, AlertCircle, Plus,
  Search, ArrowRight, Sparkles, UserPlus
} from 'lucide-react'
import AppLayout from '../components/AppLayout'
import UploadModal from '../components/UploadModal'
import { useApp } from '../context/AppContext'
import type { Document } from '../types'
import { SUPERVISOR_USER, MANAGER_USER } from '../constants/mockData'

function StatusBadge({ status }: { status: Document['status'] }) {
  const map: Record<Document['status'], React.ReactNode> = {
    draft:             <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Draft</span>,
    pending_supervisor:<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">Pending</span>,
    pending_manager:   <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">Pending</span>,
    signed:            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">Signed</span>,
    locked:            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">Completed</span>,
    rejected:          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-800 border border-red-200">Rejected</span>,
  }
  return <>{map[status]}</>
}

export default function Dashboard() {
  const { documents, currentUser, addDocument } = useApp()
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

  const stats = [
    { label: 'Total Documents', value: '1,284', icon: <FileText size={18} className="text-primary" />, trend: '+12%', sub: 'documents' },
    { label: 'Pending Signature', value: '42', icon: <Clock size={18} className="text-amber-600" />, sub: 'awaiting sign' },
    { label: 'Completed This Month', value: '156', icon: <CheckCircle size={18} className="text-emerald-600" />, sub: 'locked docs' },
    { label: 'Avg. Completion Time', value: '4.2h', icon: <Clock size={18} className="text-primary" />, sub: 'turnaround' },
  ]

  const handleUpload = (file: File) => {
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      name: file.name,
      category: 'General',
      size: `${(file.size / 1024).toFixed(0)} KB`,
      status: 'draft',
      sender: currentUser!,
      recipients: [SUPERVISOR_USER, MANAGER_USER],
      uploadedAt: new Date(),
      updatedAt: new Date(),
      baselineHash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      pageCount: 1,
      markers: [],
      auditLog: [],
    }
    addDocument(newDoc)
    setShowUpload(false)
    navigate(`/documents/${newDoc.id}/editor`)
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
                {s.trend && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary-container text-on-primary-container">
                    {s.trend}
                  </span>
                )}
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
                      <StatusBadge status={doc.status} />
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

        {/* Lower Banner Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6 flex items-start gap-4 hover:border-primary/40 transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-display font-bold text-on-surface">Automate with Templates</h3>
              <p className="text-xs text-on-surface-variant mt-1 mb-3">
                Save time on repetitive contracts by creating reusable templates for your entire team.
              </p>
              <button className="text-xs font-bold text-primary flex items-center gap-1 group">
                Create your first template <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          <div className="glass-card p-6 flex items-start gap-4 hover:border-primary/40 transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="font-display font-bold text-on-surface">Invite your Team</h3>
              <p className="text-xs text-on-surface-variant mt-1 mb-3">
                Collaborate securely with shared folders, role-based access, and detailed audit trails.
              </p>
              <button className="text-xs font-bold text-primary flex items-center gap-1 group">
                Manage members <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showUpload && (
        <UploadModal onUpload={handleUpload} onClose={() => setShowUpload(false)} />
      )}
    </AppLayout>
  )
}
