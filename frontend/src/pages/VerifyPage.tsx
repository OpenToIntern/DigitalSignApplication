import React, { useState, useRef } from 'react'
import { Upload, FileText, ShieldCheck, ShieldX, Info, RefreshCw } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import VerificationModal from '../components/VerificationModal'
import { useApp } from '../context/AppContext'
import type { VerificationResult } from '../types'

export default function VerifyPage() {
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) validateAndProcess(f)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) validateAndProcess(f)
  }

  const validateAndProcess = (f: File) => {
    if (f.type !== 'application/pdf') {
      setError('Only PDF documents are supported for cryptographic signature verification.')
      setFile(null)
      return
    }
    setError('')
    setFile(f)
    setResult(null)
  }

  const { token } = useApp()

  const triggerVerification = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)

      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const res = await fetch(`${apiBase}/documents/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Verification failed')
      }

      const data = await res.json()
      setResult(data)
    } catch (err: any) {
      console.error('Verification error:', err)
      setError(err.message || 'Error verifying document signature.')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setFile(null)
    setResult(null)
    setError('')
  }

  return (
    <AppLayout>
      <div className="page-container max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="section-title text-2xl flex items-center gap-2">
            <ShieldCheck className="text-primary" />
            Signature Verification Module
          </h1>
          <p className="section-subtitle mt-0.5">
            Upload a signed document to cryptographically verify its signatures and structural integrity.
          </p>
        </div>

        {/* Upload Drop Zone */}
        {!file && (
          <div
            onDragOver={handleDrag}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-6 p-14 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200
              ${dragOver
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : 'border-outline-variant/80 bg-surface-container-lowest hover:border-primary/30 hover:bg-surface-container-low'
              }`}
          >
            <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
              <Upload size={30} className="stroke-[1.5]" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-on-surface text-base">Drag & drop signed PDF here</p>
              <p className="text-xs text-on-surface-variant mt-1">or click to browse local directory</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-on-surface-variant bg-surface-container px-3 py-1.5 rounded-lg border border-outline-variant/40">
              <Info size={13} className="text-primary" />
              Re-hashes document content to verify against stored baseline hashes (FR-014).
            </div>
          </div>
        )}

        {/* File State */}
        {file && !result && (
          <div className="glass-card p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <FileText size={32} />
            </div>
            <h3 className="font-semibold text-on-surface text-base mb-1">{file.name}</h3>
            <p className="text-xs text-on-surface-variant mb-6">File size: {(file.size / (1024 * 1024)).toFixed(2)} MB</p>

            <div className="flex gap-3 w-full max-w-xs justify-center">
              <button onClick={reset} disabled={loading} className="btn-secondary py-3 flex-1 justify-center">
                Cancel
              </button>
              <button onClick={triggerVerification} disabled={loading} className="btn-primary py-3 flex-1 justify-center">
                {loading ? (
                  <span className="flex items-center gap-1.5 justify-center">
                    <RefreshCw size={14} className="animate-spin" /> Verifying...
                  </span>
                ) : (
                  <span>Verify Signatures</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
            <ShieldX size={15} />
            {error}
          </div>
        )}

        {/* Instructions */}
        <div className="p-4 bg-surface-container border border-outline-variant/40 rounded-xl">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">How Verification Works</p>
          <ul className="text-xs text-on-surface-variant/80 space-y-1.5 list-disc list-inside">
            <li>Upload a PDF that was signed and locked through this portal. The server computes a real SHA-256 hash and compares it against the stored cryptographic baseline.</li>
            <li>If the file is unmodified, hashes will match and the result will show <strong>AUTHENTIC</strong>. Any modification — even a single byte — will produce a <strong>MISMATCH</strong>.</li>
            <li>Hover over the displayed hash values to see the full 64-character SHA-256 hex string.</li>
          </ul>
        </div>
      </div>

      {/* Verification Result Modal */}
      {result && (
        <VerificationModal result={result} onClose={reset} />
      )}
    </AppLayout>
  )
}
