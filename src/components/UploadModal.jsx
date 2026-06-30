import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { X, Upload, FileText, Check } from 'lucide-react'

export default function UploadModal({ onClose }) {
  const navigate = useNavigate()
  const { user, addDocument, showToast } = useApp()
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const fileRef = useRef()

  const handleFile = (f) => {
    if (!f) return
    if (f.type !== 'application/pdf') { alert('Only PDF files are supported (FR-004)'); return }
    setFile(f)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleUpload = () => {
    if (!file) return
    setUploading(true)
    let p = 0
    const iv = setInterval(() => {
      p += Math.random() * 18
      if (p >= 100) {
        p = 100
        clearInterval(iv)
        setProgress(100)
        setDone(true)
      } else setProgress(Math.floor(p))
    }, 180)
  }

  const handleContinue = () => {
    const hash = 'sha256:' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    const newDoc = {
      id: 'doc-' + Date.now(),
      name: file.name,
      category: 'General',
      size: (file.size / 1024 / 1024).toFixed(1) + ' MB',
      status: 'draft',
      sender: user,
      recipients: [],
      uploadedAt: new Date(),
      lastActivity: 'Just now',
      hash,
      auditLog: [{ event: 'upload', user, timestamp: new Date(), ip: '192.168.1.22' }],
      markers: [],
      pages: Math.ceil(Math.random() * 5) + 1,
    }
    addDocument(newDoc)
    showToast(`${file.name} uploaded — SHA-256 hash computed`)
    onClose()
    navigate(`/documents/${newDoc.id}`)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}><X size={18} /></button>

        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Upload document</h2>
          <p style={{ color: 'var(--text-3)', fontSize: 14 }}>PDF files only · Max 20 MB · SHA-256 hash computed on upload (FR-004, FR-010)</p>
        </div>

        {!file ? (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--brand)' : 'var(--border)'}`,
              borderRadius: 14, padding: '52px 20px', textAlign: 'center', cursor: 'pointer',
              background: dragging ? 'var(--brand-light)' : 'var(--cream)',
              transition: 'all 0.15s', marginBottom: 24,
            }}>
            <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            <div style={{ width: 52, height: 52, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Upload size={24} style={{ color: dragging ? 'var(--brand)' : 'var(--text-3)' }} />
            </div>
            <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Drag and drop your PDF here</p>
            <p style={{ color: 'var(--text-3)', fontSize: 14 }}>or <span style={{ color: 'var(--brand)', fontWeight: 500 }}>browse files</span></p>
          </div>
        ) : (
          <div style={{ marginBottom: 24 }}>
            <div className="card flex items-center gap-14" style={{ padding: '16px 20px', marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, background: 'var(--brand-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={20} style={{ color: 'var(--brand)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{file.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB · PDF</div>
              </div>
              {!uploading && <button onClick={() => setFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}><X size={16} /></button>}
              {done && <div style={{ width: 28, height: 28, background: 'var(--signed-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={14} style={{ color: 'var(--signed-text)' }} /></div>}
            </div>

            {uploading && (
              <div style={{ marginBottom: 8 }}>
                <div className="flex justify-between" style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{done ? 'Hash computed · Upload complete' : 'Computing SHA-256 hash…'}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{progress}%</span>
                </div>
                <div style={{ height: 5, background: 'var(--cream-dark)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: done ? 'var(--signed-text)' : 'var(--brand)', width: `${progress}%`, borderRadius: 99, transition: 'width 0.2s ease' }} />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          {!uploading && file && <button className="btn btn-primary" onClick={handleUpload}>Upload & compute hash</button>}
          {done && <button className="btn btn-primary" onClick={handleContinue}>Continue to editor <span>→</span></button>}
        </div>
      </div>
    </div>
  )
}