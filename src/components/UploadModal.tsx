import React, { useState, useRef } from 'react'
import { X, Upload, FileText, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'

interface UploadModalProps {
  onUpload: (file: File) => void
  onClose: () => void
}

export default function UploadModal({ onUpload, onClose }: UploadModalProps) {
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const MAX_SIZE_MB = 20
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

  const validate = (f: File): string => {
    if (f.type !== 'application/pdf') return 'Only PDF files are accepted.'
    if (f.size > MAX_SIZE_BYTES) return `File size must not exceed ${MAX_SIZE_MB} MB.`
    return ''
  }

  const handleFile = (f: File) => {
    const err = validate(f)
    if (err) { setError(err); setFile(null); return }
    setError('')
    setFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 1500)) // simulate upload
    setLoading(false)
    onUpload(file)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md bg-white border border-outline-variant p-6 sm:p-8 text-left">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Upload size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-on-surface">Upload Document</h2>
              <p className="text-sm text-on-surface-variant font-medium">PDF only · Max {MAX_SIZE_MB} MB</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container">
            <X size={18} />
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-4 p-10 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200
            ${dragOver
              ? 'border-primary bg-primary/5 scale-[1.02]'
              : file
                ? 'border-emerald-500/40 bg-emerald-50/5'
                : 'border-outline-variant/60 bg-surface-container-low hover:border-primary/40 hover:bg-surface-container-low/60'
            }`}
        >
          <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleInputChange} />

          {file ? (
            <>
              <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center">
                <FileText size={28} className="text-emerald-700" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-on-surface text-sm truncate max-w-[280px]">{file.name}</p>
                <p className="text-xs text-on-surface-variant mt-1 font-mono">{formatSize(file.size)}</p>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
                <CheckCircle size={13} /> Ready to upload
              </div>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-xl bg-surface-container flex items-center justify-center">
                <Upload size={28} className="text-on-surface-variant" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-on-surface text-sm">
                  {dragOver ? 'Drop it here!' : 'Drag & drop your PDF'}
                </p>
                <p className="text-xs text-on-surface-variant mt-1">or click to browse files</p>
              </div>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle size={14} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Info note */}
        <div className="flex items-start gap-2 mt-4 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/10 text-primary text-xs font-medium">
          <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
          A SHA-256 baseline hash will be computed from the original document upon upload per FR-010.
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="btn-primary flex-1"
          >
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <RefreshCw size={14} className="animate-spin" /> Uploading...
              </span>
            ) : (
              <span className="flex items-center gap-2 justify-center">
                <Upload size={14} /> Upload
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
