import React, { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle, AlertTriangle, ShieldCheck, ShieldX, Info, RefreshCw } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import VerificationModal from '../components/VerificationModal'
import type { VerificationResult } from '../types'
import { MOCK_USERS } from '../constants/mockData'

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

  const triggerVerification = async () => {
    if (!file) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 2000))
    setLoading(false)

    const isTampered = file.name.toLowerCase().includes('tampered') || file.name.toLowerCase().includes('corrupt')
    
    const storedHash = 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890'
    const computedHash = isTampered 
      ? 'f9e8d7c6b5a43210f9e8d7c6b5a43210f9e8d7c6b5a43210f9e8d7c6b5a43210'
      : storedHash

    setResult({
      valid: !isTampered,
      documentName: file.name,
      storedHash,
      computedHash,
      signers: [
        {
          user: MOCK_USERS[1],
          signedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          certId: 'CERT-SUP-2026-001',
          ip: '192.168.1.102',
          valid: true,
        },
        {
          user: MOCK_USERS[2],
          signedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
          certId: 'CERT-MGR-2026-001',
          ip: '10.0.0.45',
          valid: !isTampered,
        }
      ]
    })
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
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">PoC Testing Instructions</p>
          <ul className="text-xs text-on-surface-variant/80 space-y-1.5 list-disc list-inside">
            <li>Upload any PDF. By default, verification will succeed (hashes match).</li>
            <li>Rename the file to include the word <code className="text-primary font-bold bg-primary/10 px-1 rounded">"tampered"</code> or <code className="text-primary font-bold bg-primary/10 px-1 rounded">"corrupt"</code> to simulate integrity verification failure (FR-014).</li>
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
