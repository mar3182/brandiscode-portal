'use client'

import { useRef, useEffect, useState } from 'react'
import SignaturePad from 'signature_pad'
import { Eraser, Check } from 'lucide-react'

interface SignatureCanvasProps {
  onSave: (dataUrl: string) => void
  disabled?: boolean
}

export default function SignatureCanvas({ onSave, disabled }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePad | null>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    canvas.width = canvas.offsetWidth * ratio
    canvas.height = canvas.offsetHeight * ratio
    canvas.getContext('2d')?.scale(ratio, ratio)

    padRef.current = new SignaturePad(canvas, {
      penColor: '#D4A843',
      backgroundColor: 'rgba(0, 0, 0, 0)',
      minWidth: 1.5,
      maxWidth: 3,
    })

    padRef.current.addEventListener('endStroke', () => {
      setIsEmpty(padRef.current?.isEmpty() ?? true)
    })

    if (disabled) {
      padRef.current.off()
    }

    return () => {
      padRef.current?.off()
    }
  }, [disabled])

  const handleClear = () => {
    padRef.current?.clear()
    setIsEmpty(true)
  }

  const handleSave = () => {
    if (padRef.current && !padRef.current.isEmpty()) {
      onSave(padRef.current.toDataURL('image/png'))
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-white/50">Zet hieronder je handtekening:</p>
      <canvas
        ref={canvasRef}
        className="signature-canvas w-full h-40"
      />
      <div className="flex gap-3">
        <button
          onClick={handleClear}
          disabled={disabled || isEmpty}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 text-sm transition-all disabled:opacity-30"
        >
          <Eraser className="w-4 h-4" />
          Wissen
        </button>
        <button
          onClick={handleSave}
          disabled={disabled || isEmpty}
          className="flex items-center gap-2 px-6 py-2 rounded-lg bg-brand-gold text-brand-dark font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-30"
        >
          <Check className="w-4 h-4" />
          Ondertekenen
        </button>
      </div>
    </div>
  )
}
