'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

interface Props {
  iniciadoEm: string | null
  criadoEm: string
  tempoEstimado: number
  status: string
}

function formatarTempo(segundos: number) {
  const min = Math.floor(segundos / 60)
  const seg = segundos % 60
  return `${min}:${seg.toString().padStart(2, '0')}`
}

export function CronometroItem({ iniciadoEm, criadoEm, tempoEstimado, status }: Props) {
  const [segundos, setSegundos] = useState(0)

  useEffect(() => {
    const base = iniciadoEm || criadoEm
    const calcular = () => {
      const diff = Math.floor((Date.now() - new Date(base).getTime()) / 1000)
      setSegundos(Math.max(0, diff))
    }

    calcular()
    if (status === 'aguardando' || status === 'em_preparo') {
      const interval = setInterval(calcular, 1000)
      return () => clearInterval(interval)
    }
  }, [iniciadoEm, criadoEm, status])

  const minutos = segundos / 60
  const atrasado = minutos > tempoEstimado
  const quaseAtrasado = minutos > tempoEstimado * 0.75

  const cor = atrasado
    ? 'text-red-600'
    : quaseAtrasado
    ? 'text-orange-500'
    : 'text-green-600'

  return (
    <div className={`flex items-center gap-1 font-mono font-bold text-sm ${cor}`}>
      <Clock className="w-3.5 h-3.5" />
      {formatarTempo(segundos)}
      {atrasado && <span className="text-xs font-sans font-normal ml-1">ATRASADO</span>}
    </div>
  )
}
