import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Search, Filter, Plus, Eye, Lock, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import UploadModal from '../components/UploadModal'
import { useApp } from '../context/AppContext'
import type { Document } from '../types'
import { SUPERVISOR_USER, MANAGER_USER } from '../constants/mockData'

function StatusBadge({ status }: { status: Document['status'] }) {
  const map: Record<Document['status'], React.ReactNode> = {
    draft:             <span className="badge-draft">Draft</span>,
    pending_supervisor:<span className="badge-pending">Pending Supervisor</span>,
    pending_manager:   <span className="badge-supervisor">Pending Manager</span>,
    signed:            <span className="badge-signed">Signed</span>,
    locked:            <span className="badge-locked"><Lock size={10} /> Locked</span>,
    rejected:          <span className="badge-rejected">Rejected</span>,
  }
  return <>{map[status]}</>
}

export default function DocumentsPage() {
  const { documents, addDocument, updateDocument, currentUser, refreshDocuments } = useApp()
  const navigate = useNavigate()
  const [showUpload, setShowUpload] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const categories = Array.from(new Set(documents.map(d => d.category)))

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase()) ||
      doc.sender.name.toLowerCase().includes(search.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory

    return matchesSearch && matchesStatus && matchesCategory
  })

  const handleUpload = async (file: File) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', 'General')
      formData.append('senderId', currentUser?.id || 'usr-001')

      const res = await fetch('http://localhost:5000/api/documents/upload', {
        method: 'POST',
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
      <div className="page-container max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="section-title text-2xl flex items-center gap-2">
              <FileText className="text-primary" />
              Documents Repository
            </h1>
            <p className="section-subtitle mt-1">
              Search, filter, and track all documents in the system.
            </p>
          </div>
          {currentUser?.accessRole === 'user' && (
            <button
              onClick={() => setShowUpload(true)}
              className="btn-primary self-start sm:self-auto"
            >
              <Plus size={16} /> New Document
            </button>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="glass-card p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Search document name or sender..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter size={14} className="text-slate-500" />
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="input-field py-2 text-xs"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="pending_supervisor">Pending Supervisor</option>
                <option value="pending_manager">Pending Manager</option>
                <option value="locked">Locked</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="input-field py-2 text-xs w-full sm:w-auto"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Documents Table */}
        <div className="glass-card overflow-hidden">
          {filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <FileText size={48} className="mb-3 opacity-30" />
              <p className="text-sm font-semibold">No documents found</p>
              <p className="text-xs mt-1">Try resetting or modifying your search filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline-variant/60 bg-surface-container-low">
                    <th className="table-header px-5 py-3 text-left">Document Name</th>
                    <th className="table-header px-4 py-3 text-left">Sender</th>
                    <th className="table-header px-4 py-3 text-left hidden sm:table-cell">Category</th>
                    <th className="table-header px-4 py-3 text-left hidden md:table-cell">Size</th>
                    <th className="table-header px-4 py-3 text-left">Status</th>
                    <th className="table-header px-4 py-3 text-left hidden lg:table-cell">Uploaded</th>
                    <th className="table-header px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map(doc => (
                    <tr
                      key={doc.id}
                      className="border-b border-outline-variant/40 hover:bg-surface-container-low/50 transition-colors group"
                    >
                      <td className="table-cell px-5 font-semibold text-on-surface">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <FileText size={14} className="text-primary" />
                          </div>
                          <span className="truncate max-w-[200px] group-hover:text-primary transition-colors">
                            {doc.name}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: doc.sender.avatarColor }}
                          >
                            {doc.sender.initials}
                          </div>
                          <span className="text-xs text-on-surface-variant font-medium">{doc.sender.name}</span>
                        </div>
                      </td>
                      <td className="table-cell px-4 hidden sm:table-cell text-on-surface-variant text-xs">{doc.category}</td>
                      <td className="table-cell px-4 hidden md:table-cell text-on-surface-variant/80 font-mono text-xs">{doc.size}</td>
                      <td className="table-cell px-4">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="table-cell px-4 hidden lg:table-cell text-on-surface-variant/80 text-xs font-mono">
                        {new Date(doc.uploadedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="table-cell px-5 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            if (doc.status === 'locked') {
                              navigate('/complete', { state: { documentName: doc.name, docId: doc.id } })
                            } else {
                              navigate(`/documents/${doc.id}/editor`)
                            }
                          }}
                          className="btn-ghost text-xs py-1 px-2.5"
                        >
                          <Eye size={13} /> {doc.status === 'draft' && currentUser?.accessRole === 'user' ? 'Edit' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showUpload && (
        <UploadModal onUpload={handleUpload} onClose={() => setShowUpload(false)} />
      )}
    </AppLayout>
  )
}
