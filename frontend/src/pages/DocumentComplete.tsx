import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle, Download, Shield, Home, PlusCircle, ArrowLeft, Lock, FileText } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import PDFViewer from '../components/PDFViewer'
import { useApp } from '../context/AppContext'

export default function DocumentComplete() {
  const navigate = useNavigate()
  const location = useLocation()
  const { documents } = useApp()
  const state = location.state as { documentName?: string; docId?: string } | null
  
  // Find the exact document, or default to the most recently completed/locked document
  const doc = documents.find(d => d.id === state?.docId) || documents.find(d => d.status === 'locked')
  const documentName = doc?.name || state?.documentName || 'Standard Enterprise Service Agreement v2.pdf'

  const [pdfDimensions, setPdfDimensions] = useState<{ width: number; height: number } | null>(null)

  const handlePdfLoadSuccess = (info: { pageCount: number; width: number; height: number }) => {
    setPdfDimensions({ width: info.width, height: info.height })
  }

  const renderDocumentMockup = () => {
    if (!doc) return null
    const lowerName = doc.name.toLowerCase()
    if (doc.id === 'doc-002' || lowerName.includes('employment') || lowerName.includes('contract')) {
      return (
        <div className="space-y-4 text-slate-700 text-left h-full">
          <h3 className="text-left font-display font-extrabold text-base text-slate-800 border-b border-primary/20 pb-2">
            Standard Employment Agreement
          </h3>
          <p className="text-[11px] leading-relaxed text-slate-600">
            This Agreement is made as of this 24th day of May, 2024, by and between <span className="font-bold text-slate-800">SignHere Technologies Inc.</span> (the "Company") and the individual identified below (the "Employee").
          </p>
          <p className="text-[11px] leading-relaxed font-bold text-slate-800">
            1. Position and Duties
          </p>
          <p className="text-[11px] leading-relaxed text-slate-600">
            The Employee shall serve in the position of Senior Product Designer. In this capacity, the Employee shall perform such duties and exercise such powers as are typically associated with such position in a high-growth SaaS environment.
          </p>
          <p className="text-[11px] leading-relaxed font-bold text-slate-800">
            2. Compensation
          </p>
          <p className="text-[11px] leading-relaxed text-slate-600">
            The Company shall pay the Employee a base salary of $165,000 per annum, payable in accordance with the Company's standard payroll practices. The Employee is also eligible for performance bonuses as determined by the board.
          </p>

          {/* Final Signatures box lines */}
          <div className="absolute bottom-10 left-10 right-10 grid grid-cols-2 gap-10 pt-4 border-t border-outline-variant/40">
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Employer Signature</p>
              <div className="h-0.5 bg-slate-200 mt-6" />
              <p className="text-[9px] text-slate-400 mt-1">Date</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Employee Signature</p>
              <div className="h-0.5 bg-slate-200 mt-6" />
              <p className="text-[9px] text-slate-400 mt-1">Date Signed</p>
            </div>
          </div>
        </div>
      )
    }

    if (doc.id === 'doc-001' || lowerName.includes('nda') || lowerName.includes('disclosure')) {
      return (
        <div className="space-y-4 text-slate-700 text-left h-full">
          <h3 className="font-display font-extrabold text-base text-slate-800 border-b border-primary/20 pb-2">
            Mutual Non-Disclosure Agreement
          </h3>
          <p className="text-[11px] leading-relaxed text-slate-600">
            This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of the Effective Date, by and between the parties to protect confidential information shared for business purposes.
          </p>
          <p className="text-[11px] leading-relaxed font-bold text-slate-800">
            1. Definition of Confidential Information
          </p>
          <p className="text-[11px] leading-relaxed text-slate-600">
            Confidential Information refers to proprietary data, product maps, customer records, software source code, and key digital signatures.
          </p>
          <p className="text-[11px] leading-relaxed font-bold text-slate-800">
            2. Term and Termination
          </p>
          <p className="text-[11px] leading-relaxed text-slate-600">
            The obligations of confidentiality shall remain in effect for a period of five (5) years from the date of disclosure.
          </p>

          {/* Final Signatures box lines */}
          <div className="absolute bottom-10 left-10 right-10 grid grid-cols-2 gap-10 pt-4 border-t border-outline-variant/40">
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Disclosing Party Signature</p>
              <div className="h-0.5 bg-slate-200 mt-6" />
              <p className="text-[9px] text-slate-400 mt-1">Date</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Receiving Party Signature</p>
              <div className="h-0.5 bg-slate-200 mt-6" />
              <p className="text-[9px] text-slate-400 mt-1">Date Signed</p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-6 text-slate-700 text-left h-full flex flex-col justify-between">
        <div className="border-b border-slate-200 pb-3">
          <h3 className="font-display font-extrabold text-sm text-slate-800 truncate max-w-[420px]">
            {doc.name}
          </h3>
          <p className="text-[9px] text-slate-400 font-mono mt-0.5">
            Original PDF Document · Size: {doc.size} · SHA-256 baseline hash verified
          </p>
        </div>
        
        <div className="flex-1 flex flex-col justify-center items-center py-6 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200/80 p-5 select-none my-2">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2.5">
            <FileText size={20} />
          </div>
          <h4 className="text-xs font-bold text-slate-800 mb-0.5">
            PDF Document Workspace
          </h4>
          <p className="text-[10px] text-slate-500 max-w-sm leading-relaxed">
            This represents your uploaded document page. All signatures placed by the signatories are locked and permanently sealed on this copy.
          </p>
        </div>

        <div className="pt-2 text-[9px] text-slate-400/80 border-t border-slate-100 flex justify-between font-mono">
          <span>Page 1 of {doc.pageCount || 1}</span>
          <span>SignHere Secure Node API v2</span>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="page-container max-w-6xl mx-auto py-10 min-h-[calc(100vh-10rem)] bg-confetti-gradient flex flex-col lg:flex-row gap-8 items-start justify-center">
        
        {/* Success Card (Left Panel) */}
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-md p-8 md:p-10 text-center relative overflow-hidden w-full lg:max-w-md flex-shrink-0">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary"></div>

          <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 text-primary">
            <CheckCircle size={52} className="stroke-[1.5]" />
          </div>

          <h1 className="font-display font-bold text-xl text-on-surface mb-2">
            Document Successfully Signed
          </h1>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto mb-6 leading-relaxed">
            The document has been securely encrypted and copies have been distributed to all signatories.
          </p>

          {/* Document details Bento-grid */}
          <div className="grid grid-cols-1 gap-3 mb-6 text-left">
            {/* Title card */}
            <div className="p-3.5 bg-surface-container-low rounded-lg border border-outline-variant/30">
              <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                Document Title
              </span>
              <span className="text-xs font-semibold text-on-surface line-clamp-2">
                {documentName}
              </span>
            </div>

            {/* ID card */}
            <div className="p-3.5 bg-surface-container-low rounded-lg border border-outline-variant/30">
              <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                Document ID
              </span>
              <span className="text-xs font-mono font-semibold text-on-surface">
                {doc?.id ? `DOC-${doc.id.toUpperCase()}` : 'DOC-88291-SFX-2024'}
              </span>
            </div>

            {/* Signatories list */}
            <div className="p-3.5 bg-surface-container-low rounded-lg border border-outline-variant/30 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">
                  Signatories
                </span>
                <div className="flex -space-x-1.5">
                  <div className="w-7 h-7 rounded-full bg-primary/10 border-2 border-white flex items-center justify-center text-[9px] font-bold text-primary">IK</div>
                  <div className="w-7 h-7 rounded-full bg-indigo-500/10 border-2 border-white flex items-center justify-center text-[9px] font-bold text-indigo-700">JH</div>
                  <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[9px] font-bold text-slate-700">RT</div>
                  <div className="w-7 h-7 rounded-full bg-primary-container border-2 border-white flex items-center justify-center text-[9px] font-bold text-on-primary-container">+1</div>
                </div>
              </div>

              <div className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 rounded-full border border-primary/20">
                <Shield size={10} className="text-primary" />
                <span className="text-[10px] font-bold text-primary">Signed by 4 of 4</span>
              </div>
            </div>
          </div>

          {/* Secure SSL metadata */}
          <div className="flex items-center justify-center gap-2 mb-6 text-on-surface-variant/60">
            <Lock size={12} />
            <span className="text-[8px] font-extrabold uppercase tracking-widest">
              Encrypted & Secure SSL Certificate
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => alert('Downloading signed and secure PDF document with embedded signatures...')}
              className="btn-primary py-2.5 justify-center shadow-sm w-full"
            >
              <Download size={15} /> Download Copy
            </button>
            <button
              onClick={() => navigate('/documents')}
              className="btn-secondary py-2.5 justify-center w-full"
            >
              <PlusCircle size={15} /> Send New Document
            </button>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="mt-5 text-xs font-bold text-primary hover:underline flex items-center gap-1 mx-auto"
          >
            <ArrowLeft size={13} /> Return to Dashboard
          </button>
        </div>

        {/* Visual Signed Document Canvas (Right Panel) */}
        {doc && (
          <div className="flex-1 w-full max-w-2xl flex flex-col bg-surface-container-low border border-outline-variant/60 rounded-xl shadow-md overflow-hidden p-6 self-stretch">
            <h2 className="text-sm font-bold text-on-surface mb-3 flex items-center gap-1.5">
              <Shield size={14} className="text-emerald-600" /> Locked Signed Copy Preview
            </h2>
            
            {/* The Document Page Canvas */}
            <div 
              className="relative bg-white text-slate-900 border border-outline-variant/60 rounded-lg shadow-sm flex flex-col select-none"
              style={{ 
                width: pdfDimensions ? `${pdfDimensions.width}px` : '100%',
                maxWidth: '100%',
                height: pdfDimensions ? `${pdfDimensions.height}px` : '520px',
                minHeight: pdfDimensions ? `${pdfDimensions.height}px` : '520px'
              }}
            >
              <div 
                className="flex-1 relative overflow-hidden bg-white" 
                style={{ 
                  width: '100%',
                  height: '100%',
                  padding: doc.downloadUrl ? '0' : '2.5rem'
                }}
              >
                
                {/* Visual Contract Details */}
                {doc.downloadUrl ? (
                  <PDFViewer 
                    url={doc.downloadUrl} 
                    page={1} 
                    onLoadSuccess={handlePdfLoadSuccess}
                    scale={1.2}
                  />
                ) : (
                  renderDocumentMockup()
                )}

                {/* Overlaid Placed Signatures */}
                {doc.markers?.filter(m => m.page === 1).map(marker => (
                  <div
                    key={marker.id}
                    className="absolute border border-outline-variant/60 rounded-xl bg-surface-container-lowest/95 px-3 py-1.5 flex flex-col justify-center items-center shadow-md select-none pointer-events-none"
                    style={{
                      left: `${marker.x}px`,
                      top: `${marker.y}px`,
                      width: `${marker.width}px`,
                      height: `${marker.height}px`,
                    }}
                  >
                    {marker.signed ? (
                      <div className="flex items-center gap-1.5 w-full">
                        {marker.signature ? (
                          <img src={marker.signature} alt="Sig" className="max-h-8 max-w-[80px] object-contain" />
                        ) : (
                          <span className="text-[10px] font-bold text-stone-800 leading-tight font-mono">
                            {marker.assignedTo.initials}
                          </span>
                        )}
                        <span className="text-[8px] font-mono text-emerald-600 block leading-tight font-extrabold">
                          Signed<br/>✓ Secure
                        </span>
                      </div>
                    ) : (
                      <div className="text-[9px] font-bold text-on-surface-variant flex flex-col items-center">
                        <span>{marker.type.toUpperCase()}</span>
                        <span className="text-[8px] opacity-60 font-medium">({marker.assignedTo.name})</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  )
}
