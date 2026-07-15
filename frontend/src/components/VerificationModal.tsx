import React from 'react'
import { X, ShieldCheck, ShieldX, Hash, User, Clock, Award, AlertTriangle } from 'lucide-react'
import type { VerificationResult } from '../types'

interface VerificationModalProps {
  result: VerificationResult
  onClose: () => void
}

export default function VerificationModal({ result, onClose }: VerificationModalProps) {
  const truncateHash = (h: string) => h.length > 16 ? `${h.slice(0, 8)}...${h.slice(-8)}` : h

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-xl bg-white border border-outline-variant p-0 sm:p-0 max-h-[90vh] flex flex-col">
        {/* Header — fixed */}
        <div className="flex items-center justify-between p-6 sm:p-8 pb-0 sm:pb-0 mb-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center
              ${result.valid ? 'bg-emerald-100' : 'bg-red-100'}`}>
              {result.valid
                ? <ShieldCheck size={20} className="text-emerald-700" />
                : <ShieldX size={20} className="text-red-700" />
              }
            </div>
            <div>
              <h2 className="text-lg font-bold text-on-surface">Verification Result</h2>
              <p className="text-xs text-on-surface-variant truncate max-w-[240px]">{result.documentName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8">
          {/* Verdict banner */}
          <div className={`flex items-center gap-3 p-4 rounded-xl border mb-5
            ${result.valid
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-red-50 border-red-200'
            }`}>
            {result.valid
              ? <ShieldCheck size={22} className="text-emerald-700 flex-shrink-0" />
              : <AlertTriangle size={22} className="text-red-700 flex-shrink-0" />
            }
            <div>
              <p className={`font-bold text-sm ${result.valid ? 'text-emerald-800' : 'text-red-800'}`}>
                {result.valid ? 'Document is AUTHENTIC' : 'Document INTEGRITY COMPROMISED'}
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {result.valid
                  ? 'Hash matches the baseline. No tampering detected.'
                  : 'Computed hash does not match stored baseline. Document may have been tampered with.'
                }
              </p>
            </div>
          </div>

          {/* Hash comparison */}
          <div className="glass-card bg-surface-container-low border border-outline-variant/60 p-4 mb-4">
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-2">
              <Hash size={12} /> Hash Comparison (SHA-256)
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-on-surface-variant w-28 flex-shrink-0">Stored baseline:</span>
                <code className="text-xs font-mono text-on-surface bg-surface-container-lowest border border-outline-variant/40 px-2 py-1 rounded truncate" title={result.storedHash}>
                  {truncateHash(result.storedHash)}
                </code>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-on-surface-variant w-28 flex-shrink-0">Computed now:</span>
                <code className={`text-xs font-mono px-2 py-1 rounded truncate border
                  ${result.valid ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-red-700 bg-red-50 border-red-100'}`} title={result.computedHash}>
                  {truncateHash(result.computedHash)}
                </code>
              </div>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-outline-variant/40">
                {result.valid
                  ? <><ShieldCheck size={13} className="text-emerald-700" /><span className="text-xs text-emerald-700 font-bold">Hashes match ✓</span></>
                  : <><ShieldX size={13} className="text-red-700" /><span className="text-xs text-red-700 font-bold">Hashes do NOT match ✗</span></>
                }
              </div>
            </div>
          </div>

          {/* Signers */}
          <div className="glass-card bg-surface-container-low border border-outline-variant/60 p-4 mb-5">
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-2">
              <User size={12} /> Signature Records
            </p>
            <div className="space-y-3">
              {result.signers.map((signer, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/40">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: signer.user.avatarColor }}
                  >
                    {signer.user.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-on-surface truncate">{signer.user.name}</p>
                      {signer.valid
                        ? <span className="badge-signed text-[10px]"><ShieldCheck size={10} /> Valid</span>
                        : <span className="badge-rejected text-[10px]"><ShieldX size={10} /> Invalid</span>
                      }
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5">{signer.user.role}</p>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-on-surface-variant">
                      <span className="flex items-center gap-1 text-[10px]">
                        <Clock size={10} />
                        {new Date(signer.signedAt).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1 text-[10px]">
                        <Award size={10} />
                        {signer.certId}
                      </span>
                      <span className="text-[10px] font-mono">{signer.ip}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer — fixed */}
        <div className="flex justify-end px-6 sm:px-8 py-4 border-t border-outline-variant/40 flex-shrink-0">
          <button onClick={onClose} className="btn-primary px-6">Close</button>
        </div>
      </div>
    </div>
  )
}
