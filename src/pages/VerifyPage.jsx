import { useState, useRef } from 'react'
import { useApp } from '../context/AppContext'
import AppLayout from '../components/AppLayout'
import { Upload, Shield, CheckCircle2, AlertTriangle, FileText, Search, Hash } from 'lucide-react'

function randomHash() {
  return 'sha256:' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

export default function VerifyPage() {
  const { documents } = useApp()
  const [mode, setMode] = useState('upload') // upload | docid
  const [file, setFile] = useState(null)
  const [docId, setDocId] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState(null)
  const fileRef = useRef()

  const handleFile = (f) => {
    if (!f) return
    setFile(f)
    setResult(null)
  }

  const handleVerify = () => {
    setVerifying(true)
    setResult(null)
    // Simulate re-hash and comparison (FR-014)
    setTimeout(() => {
      if (mode === 'docid') {
        const doc = documents.find(d => d.id === docId || d.name === docId)
        if (!doc) {
          setResult({ valid: false, reason: 'Document not found in SignHere registry' })
        } else {
          // Simulate: doc must be signed to verify
          if (doc.status !== 'signed') {
            setResult({ valid: null, reason: 'Document has not completed the signing workflow', doc })
          } else {
            setResult({ valid: true, doc, recomputedHash: doc.hash })
          }
        }
      } else {
        // File upload: match against known docs by name, else generate
        const matched = file ? documents.find(d => d.name === file.name) : null
        if (matched && matched.status === 'signed') {
          setResult({ valid: true, doc: matched, recomputedHash: matched.hash })
        } else if (matched) {
          setResult({ valid: null, reason: 'Document found but signing not complete', doc: matched })
        } else {
          // Simulate tamper: randomly flag as invalid for demo with unknown docs
          const tampered = Math.random() > 0.7
          const fakeHash = tampered ? randomHash() : (file?.name ? 'sha256:' + file.name.split('').map(c => c.charCodeAt(0).toString(16)).join('').padEnd(64, '0').slice(0, 64) : randomHash())
          setResult({ valid: !tampered, recomputedHash: fakeHash, reason: tampered ? 'Hash mismatch detected — document may have been tampered with' : undefined })
        }
      }
      setVerifying(false)
    }, 2200)
  }

  return (
    <AppLayout>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: 32 }}>
          <div className="flex items-center gap-3" style={{ marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, background: 'var(--brand-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} style={{ color: 'var(--brand)' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px' }}>Signature Verification</h1>
              <p style={{ color: 'var(--text-3)', fontSize: 13 }}>FR-014 · FR-015 · Re-hash and compare against baseline SHA-256</p>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '28px', marginBottom: 24 }}>
          {/* Mode selector */}
          <div className="flex gap-1" style={{ background: 'var(--cream-dark)', borderRadius: 10, padding: 3, marginBottom: 24 }}>
            {[{ id: 'upload', label: 'Upload document' }, { id: 'docid', label: 'Search by document ID' }].map(({ id, label }) => (
              <button key={id} onClick={() => { setMode(id); setResult(null) }} style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                background: mode === id ? 'var(--white)' : 'transparent',
                color: mode === id ? 'var(--text-1)' : 'var(--text-3)',
                boxShadow: mode === id ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s',
              }}>{label}</button>
            ))}
          </div>

          {mode === 'upload' ? (
            <div>
              {!file ? (
                <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', background: 'var(--cream)', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                  <Upload size={28} style={{ color: 'var(--text-4)', margin: '0 auto 12px', display: 'block' }} />
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>Upload a signed PDF to verify</p>
                  <p style={{ fontSize: 13, color: 'var(--text-3)' }}>The system will re-hash the document and compare against the stored baseline</p>
                </div>
              ) : (
                <div className="flex items-center gap-3" style={{ padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--cream)', marginBottom: 8 }}>
                  <FileText size={20} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{file.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{(file.size / 1024).toFixed(1)} KB · PDF</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setResult(null) }} style={{ color: 'var(--text-3)' }}>Remove</button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>Document ID or filename</label>
              <div className="flex gap-2">
                <input className="input" placeholder="e.g. doc-001 or Service_Agreement_v4.pdf" value={docId} onChange={e => setDocId(e.target.value)} style={{ flex: 1 }} />
              </div>
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>Or select from your documents:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {documents.filter(d => d.status === 'signed').map(d => (
                    <button key={d.id} onClick={() => setDocId(d.id)} style={{ padding: '5px 12px', borderRadius: 99, fontSize: 12, border: `1.5px solid ${docId === d.id ? 'var(--brand)' : 'var(--border)'}`, background: docId === d.id ? 'var(--brand-light)' : 'var(--white)', color: docId === d.id ? 'var(--brand)' : 'var(--text-2)', cursor: 'pointer', fontWeight: 500 }}>
                      {d.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <button className="btn btn-primary w-full" style={{ justifyContent: 'center', gap: 8, marginTop: 20, fontSize: 15, padding: '12px 0' }}
            onClick={handleVerify}
            disabled={verifying || (mode === 'upload' && !file) || (mode === 'docid' && !docId)}>
            {verifying ? (
              <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', marginRight: 4 }}>⟳</span> Re-hashing document…</>
            ) : (
              <><Search size={16} /> Verify document</>
            )}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className="card" style={{ padding: '24px', border: `2px solid ${result.valid === true ? 'var(--signed-border)' : result.valid === false ? '#F5C6C6' : 'var(--border)'}`, background: result.valid === true ? 'var(--signed-bg)' : result.valid === false ? '#FCF0F0' : 'var(--cream)' }}>
            <div className="flex items-center gap-3" style={{ marginBottom: 20 }}>
              {result.valid === true ? (
                <CheckCircle2 size={28} style={{ color: 'var(--signed-text)', flexShrink: 0 }} />
              ) : result.valid === false ? (
                <AlertTriangle size={28} style={{ color: '#C0392B', flexShrink: 0 }} />
              ) : (
                <Shield size={28} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
              )}
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: result.valid === true ? 'var(--signed-text)' : result.valid === false ? '#C0392B' : 'var(--text-1)' }}>
                  {result.valid === true ? 'Signature valid — document intact' : result.valid === false ? 'Verification failed' : 'Cannot verify'}
                </h3>
                {result.reason && <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{result.reason}</p>}
              </div>
            </div>

            {/* FR-015: Detailed results */}
            {result.doc && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  ['Document name', result.doc.name],
                  ['Signing status', result.doc.status.charAt(0).toUpperCase() + result.doc.status.slice(1)],
                  ['Signatories', result.doc.markers.filter(m => m.signed).map(m => m.assignedTo?.name).join(', ') || '—'],
                  ['Signatures collected', `${result.doc.markers.filter(m => m.signed).length} / ${result.doc.markers.length}`],
                ].map(([label, val]) => (
                  <div key={label} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.6)', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3, fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{val}</div>
                  </div>
                ))}
              </div>
            )}

            {result.recomputedHash && (
              <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.7)', borderRadius: 8, marginBottom: result.doc ? 12 : 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Hash size={11} /> Re-computed hash
                </div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-2)', wordBreak: 'break-all' }}>{result.recomputedHash}</div>
                {result.doc?.hash && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '10px 0 4px', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Hash size={11} /> Stored baseline hash
                    </div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-2)', wordBreak: 'break-all' }}>{result.doc.hash}</div>
                    <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: result.recomputedHash === result.doc.hash ? 'var(--signed-text)' : '#C0392B' }}>
                      {result.recomputedHash === result.doc.hash ? '✓ Hashes match — document not tampered' : '✗ Hash mismatch — possible tampering detected'}
                    </div>
                  </>
                )}
              </div>
            )}

            {result.doc?.markers?.filter(m => m.signed).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Certificate details (FR-015)</div>
                {result.doc.markers.filter(m => m.signed).map(m => (
                  <div key={m.id} className="flex items-center gap-3" style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.6)', borderRadius: 8, marginBottom: 6 }}>
                    <div style={{ width: 28, height: 28, background: m.assignedTo?.avatarColor, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{m.assignedTo?.initials}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{m.assignedTo?.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Cert: {m.metadata?.certId || `X509-${m.assignedTo?.id}-2026`} · SHA-256/RSA</div>
                    </div>
                    <CheckCircle2 size={14} style={{ color: 'var(--signed-text)', flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </AppLayout>
  )
}
