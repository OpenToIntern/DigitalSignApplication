import React, { useState, useRef, useEffect } from 'react'
import { X, Pen, Upload, Type, CheckCircle, RefreshCw, Trash2 } from 'lucide-react'
import type { SignatureData } from '../types'
import { SIGNATURE_STYLES } from '../constants/mockData'
import { useApp } from '../context/AppContext'

interface SignatureModalProps {
  onConfirm: (sig: SignatureData) => void
  onClose: () => void
}

type Tab = 'style' | 'draw' | 'upload'

const STYLE_FONTS = [
  'Dancing Script',
  'Pacifico',
  'Great Vibes',
  'Permanent Marker',
]

export default function SignatureModal({ onConfirm, onClose }: SignatureModalProps) {
  const [tab, setTab] = useState<Tab>('style')
  const [selectedStyle, setSelectedStyle] = useState(0)
  const [uploadedImg, setUploadedImg] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const { currentUser } = useApp()

  // Load signature fonts dynamically
  useEffect(() => {
    const link = document.createElement('link')
    link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Pacifico&family=Great+Vibes&family=Permanent+Marker&display=swap'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }, [])

  // Sync canvas pixel dimensions to its CSS-rendered size so drawn coords match
  // what's actually captured in toDataURL(). Without this, a mismatch between
  // the canvas `width` attribute and the displayed width shears/tilts the strokes.
  useEffect(() => {
    if (tab !== 'draw') return
    const canvas = canvasRef.current
    if (!canvas) return

    const syncSize = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const dpr = window.devicePixelRatio || 1
      const targetWidth = Math.round(rect.width * dpr)
      const targetHeight = Math.round(rect.height * dpr)

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        // Save current canvas content to temporary canvas before resizing
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = canvas.width
        tempCanvas.height = canvas.height
        const tempCtx = tempCanvas.getContext('2d')
        if (tempCtx && canvas.width > 0 && canvas.height > 0) {
          tempCtx.drawImage(canvas, 0, 0)
        }

        canvas.width = targetWidth
        canvas.height = targetHeight

        // Restore saved content scaled to the new canvas size
        const ctx = canvas.getContext('2d')
        if (ctx && tempCanvas.width > 0 && tempCanvas.height > 0) {
          ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, targetWidth, targetHeight)
        }
      }
    }

    syncSize()
    const ro = new ResizeObserver(syncSize)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [tab])

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    return {
      x: rect.width > 0 ? ((clientX - rect.left) / rect.width) * canvas.width : 0,
      y: rect.height > 0 ? ((clientY - rect.top) / rect.height) * canvas.height : 0,
    }
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    setIsDrawing(true)
    lastPos.current = getPos(e, canvas)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx || !lastPos.current) return

    e.preventDefault()
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1c1917' // Dark stone/ink signature line
    const rect = canvas.getBoundingClientRect()
    const scale = rect.width > 0 ? canvas.width / rect.width : 1
    ctx.lineWidth = 2.5 * scale
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastPos.current = pos
    setHasDrawn(true)
  }

  const stopDraw = () => {
    setIsDrawing(false)
    lastPos.current = null
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setUploadedImg(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleConfirm = () => {
    if (tab === 'style') {
      const style = SIGNATURE_STYLES[selectedStyle]
      const canvas = document.createElement('canvas')
      canvas.width = 300
      canvas.height = 80
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = 'transparent'
      ctx.font = `48px "${STYLE_FONTS[selectedStyle]}", cursive`
      ctx.fillStyle = '#1c1917' // Generated font uses dark ink color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(currentUser?.name || 'Signature', 150, 40)
      onConfirm({ type: 'style', dataUrl: canvas.toDataURL(), styleName: style.name })
    } else if (tab === 'draw') {
      const dataUrl = canvasRef.current?.toDataURL() || ''
      onConfirm({ type: 'draw', dataUrl })
    } else if (tab === 'upload' && uploadedImg) {
      onConfirm({ type: 'upload', dataUrl: uploadedImg })
    }
  }

  const canConfirm =
    (tab === 'style') ||
    (tab === 'draw' && hasDrawn) ||
    (tab === 'upload' && !!uploadedImg)

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-lg bg-white border border-outline-variant p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-on-surface">Create Your Signature</h2>
            <p className="text-sm text-on-surface-variant">Choose a method below</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-surface-container rounded-xl mb-5">
          {([
            { id: 'style' as Tab, label: 'Choose Style', icon: <Type size={14} /> },
            { id: 'draw' as Tab, label: 'Draw', icon: <Pen size={14} /> },
            { id: 'upload' as Tab, label: 'Upload', icon: <Upload size={14} /> },
          ]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all duration-200
                ${tab === t.id ? 'bg-primary text-on-primary shadow-lg' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Style tab */}
        {tab === 'style' && (
          <div className="space-y-2 mb-5">
            {SIGNATURE_STYLES.map((style, idx) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(idx)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all duration-200 text-left
                  ${selectedStyle === idx
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-outline-variant/60 bg-surface-container-lowest hover:border-outline-variant hover:bg-surface-container-low'
                  }`}
              >
                <span
                  className="text-2xl text-on-surface"
                  style={{ fontFamily: `"${STYLE_FONTS[idx]}", cursive` }}
                >
                  {currentUser?.name || 'Your Name'}
                </span>
                <span className="text-xs text-on-surface-variant font-medium">{style.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Draw tab */}
        {tab === 'draw' && (
          <div className="mb-5">
            <div className="rounded-xl border border-outline-variant bg-surface-container-low overflow-hidden">
              <canvas
                ref={canvasRef}
                width={448}
                height={160}
                className="w-full cursor-crosshair touch-none bg-white"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-on-surface-variant">Draw your signature above using mouse or touch</p>
              <button onClick={clearCanvas} className="text-on-surface-variant hover:text-on-surface text-xs py-1 px-2 flex items-center gap-1">
                <Trash2 size={12} /> Clear
              </button>
            </div>
          </div>
        )}

        {/* Upload tab */}
        {tab === 'upload' && (
          <div className="mb-5">
            <label className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-outline-variant hover:border-primary bg-surface-container-low cursor-pointer transition-colors">
              <Upload size={24} className="text-on-surface-variant" />
              <div className="text-center">
                <p className="text-sm text-on-surface font-medium">Upload signature image</p>
                <p className="text-xs text-on-surface-variant mt-1">PNG, JPG with transparent background recommended</p>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </label>
            {uploadedImg && (
              <div className="mt-3 p-3 rounded-xl border border-outline-variant bg-surface-container-low">
                <img src={uploadedImg} alt="Uploaded signature" className="max-h-20 mx-auto" />
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-outline-variant/60">
          <p className="text-xs text-on-surface-variant max-w-[220px]">
            Visual only. Cryptographic signing is handled separately per FR-009.
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={handleConfirm} disabled={!canConfirm} className="btn-primary">
              <CheckCircle size={14} /> Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
