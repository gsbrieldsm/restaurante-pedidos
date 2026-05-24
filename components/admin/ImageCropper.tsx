'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ZoomIn, ZoomOut, Check, X, Loader2, Move } from 'lucide-react'

interface ImageCropperProps {
  file:         File
  aspectRatio:  number   // largura / altura  (ex: 2.5 para 1200×480)
  outputWidth:  number
  outputHeight: number
  label:        string
  onConfirm:    (blob: Blob) => void
  onCancel:     () => void
}

export default function ImageCropper({
  file, aspectRatio, outputWidth, outputHeight, label, onConfirm, onCancel,
}: ImageCropperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const blobUrlRef   = useRef('')
  const isDragging   = useRef(false)
  const dragStart    = useRef({ mx: 0, my: 0, px: 0, py: 0 })

  const [imgSrc,      setImgSrc]      = useState('')
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })
  const [cropSize,    setCropSize]    = useState({ w: 0, h: 0 })
  const [zoom,        setZoom]        = useState(1)
  const [pos,         setPos]         = useState({ x: 0, y: 0 })
  const [applying,    setApplying]    = useState(false)
  const [grabbing,    setGrabbing]    = useState(false)
  const [ready,       setReady]       = useState(false)  // imagem + container medidos

  // ── Carrega imagem ──────────────────────────────────────────────────────────
  useEffect(() => {
    const url = URL.createObjectURL(file)
    blobUrlRef.current = url
    const img = new Image()
    img.onload = () => {
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
      setImgSrc(url)
    }
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  // ── Mede o container com ResizeObserver ─────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setCropSize({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Escala base (cover) ─────────────────────────────────────────────────────
  const baseScale = naturalSize.w > 0 && cropSize.w > 0
    ? Math.max(cropSize.w / naturalSize.w, cropSize.h / naturalSize.h)
    : 0

  const displayedW = naturalSize.w * baseScale * zoom
  const displayedH = naturalSize.h * baseScale * zoom

  // ── Clamp: imagem sempre cobre a área ──────────────────────────────────────
  const clamp = useCallback((x: number, y: number, dw: number, dh: number) => ({
    x: Math.min(0, Math.max(cropSize.w - dw, x)),
    y: Math.min(0, Math.max(cropSize.h - dh, y)),
  }), [cropSize.w, cropSize.h])

  // ── Posição inicial centralizada (roda quando ambos estão prontos) ──────────
  useEffect(() => {
    if (!naturalSize.w || !cropSize.w || baseScale === 0) return
    const dw = naturalSize.w * baseScale
    const dh = naturalSize.h * baseScale
    setPos(clamp((cropSize.w - dw) / 2, (cropSize.h - dh) / 2, dw, dh))
    setZoom(1)
    setReady(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [naturalSize.w, naturalSize.h, cropSize.w, cropSize.h])

  // ── Mouse drag ─────────────────────────────────────────────────────────────
  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    isDragging.current = true
    setGrabbing(true)
    dragStart.current  = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!isDragging.current) return
      const dx = e.clientX - dragStart.current.mx
      const dy = e.clientY - dragStart.current.my
      setPos(clamp(dragStart.current.px + dx, dragStart.current.py + dy, displayedW, displayedH))
    }
    function onUp() { isDragging.current = false; setGrabbing(false) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [displayedW, displayedH, clamp])

  // ── Touch drag ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let start = { x: 0, y: 0, px: 0, py: 0 }
    function onStart(e: TouchEvent) {
      const t = e.touches[0]
      start = { x: t.clientX, y: t.clientY, px: 0, py: 0 }
      setPos(prev => { start.px = prev.x; start.py = prev.y; return prev })
    }
    function onMove(e: TouchEvent) {
      e.preventDefault()
      const t = e.touches[0]
      setPos(clamp(start.px + t.clientX - start.x, start.py + t.clientY - start.y, displayedW, displayedH))
    }
    el.addEventListener('touchstart', onStart, { passive: true  })
    el.addEventListener('touchmove',  onMove,  { passive: false })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove',  onMove)
    }
  }, [displayedW, displayedH, clamp])

  // ── Zoom (mantém o centro da área fixo) ───────────────────────────────────
  function handleZoom(newZoom: number) {
    const clamped  = Math.min(3, Math.max(1, newZoom))
    if (baseScale === 0) { setZoom(clamped); return }
    const oldScale = baseScale * zoom
    const newScale = baseScale * clamped
    const cx = cropSize.w / 2
    const cy = cropSize.h / 2
    const newX = cx - ((cx - pos.x) / oldScale) * newScale
    const newY = cy - ((cy - pos.y) / oldScale) * newScale
    setZoom(clamped)
    setPos(clamp(newX, newY, naturalSize.w * newScale, naturalSize.h * newScale))
  }

  // ── Confirmar: canvas → blob ───────────────────────────────────────────────
  function handleConfirm() {
    if (!cropSize.w || baseScale === 0) return
    setApplying(true)
    const canvas = document.createElement('canvas')
    canvas.width  = outputWidth
    canvas.height = outputHeight
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      const scale = baseScale * zoom
      ctx.drawImage(img,
        -pos.x / scale, -pos.y / scale,
        cropSize.w / scale, cropSize.h / scale,
        0, 0, outputWidth, outputHeight,
      )
      canvas.toBlob(blob => {
        setApplying(false)
        if (blob) onConfirm(blob)
      }, 'image/jpeg', 0.92)
    }
    img.src = blobUrlRef.current
  }

  const modal = (
    // overflow-y-auto para não cortar o slider em telas menores
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/75 overflow-y-auto p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 rounded-t-2xl">
          <div>
            <p className="font-bold text-slate-800 text-sm">Ajustar imagem</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Área de recorte */}
        <div className="px-5 pt-5 pb-3">

          {/* Container com aspect-ratio fixo */}
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-xl bg-slate-800 select-none w-full"
            style={{
              aspectRatio: String(aspectRatio),
              cursor:      grabbing ? 'grabbing' : 'grab',
              maxHeight:   '55vh',
            }}
            onMouseDown={onMouseDown}
          >
            {/* Loading enquanto imagem/container não estão prontos */}
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-white/50" />
              </div>
            )}

            {/* Imagem posicionada */}
            {ready && imgSrc && displayedW > 0 && (
              <img
                src={imgSrc}
                alt=""
                draggable={false}
                style={{
                  position:      'absolute',
                  left:          pos.x,
                  top:           pos.y,
                  width:         displayedW,
                  height:        displayedH,
                  userSelect:    'none',
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* Grade de terços */}
            {ready && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)
                  `,
                  backgroundSize: '33.33% 33.33%',
                }}
              />
            )}

            {/* Borda */}
            <div className="absolute inset-0 pointer-events-none ring-2 ring-inset ring-white/20 rounded-xl" />
          </div>

          {/* Controles de zoom */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => handleZoom(zoom - 0.1)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors shrink-0 border border-slate-200"
            >
              <ZoomOut className="w-4 h-4 text-slate-600" />
            </button>

            <input
              type="range"
              min={1} max={3} step={0.01}
              value={zoom}
              onChange={e => handleZoom(parseFloat(e.target.value))}
              className="flex-1 h-2 accent-teal-600 cursor-pointer"
            />

            <button
              onClick={() => handleZoom(zoom + 0.1)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors shrink-0 border border-slate-200"
            >
              <ZoomIn className="w-4 h-4 text-slate-600" />
            </button>

            <span className="text-xs font-mono text-slate-500 w-10 text-right shrink-0">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <p className="text-xs text-slate-400 text-center mt-2 flex items-center justify-center gap-1.5">
            <Move className="w-3 h-3" />
            Arraste para reposicionar · slider para zoom
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={applying || !ready}
            className="flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
          >
            {applying
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
              : <><Check className="w-4 h-4" /> Aplicar</>
            }
          </button>
        </div>

      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
