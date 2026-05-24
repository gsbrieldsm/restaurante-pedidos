'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, Clock, ChefHat, Loader2, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { Pedido, PedidoItem } from '@/lib/supabase/types'
import { hexToRgbParts, headerGradient, corFundoClaro, corFundoMedio } from '@/lib/cor'

const STATUS_LABEL: Record<string, string> = {
  aguardando: 'Aguardando',
  em_preparo: 'Em preparo',
  pronto:     'Pronto!',
  entregue:   'Entregue',
}

const STATUS_COLOR: Record<string, string> = {
  aguardando: 'bg-slate-100 text-slate-600',
  em_preparo: '',
  pronto:     'bg-green-100 text-green-700',
  entregue:   'bg-blue-100 text-blue-700',
}

function tocarSom() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.6)
  } catch {
    // browser sem suporte a Web Audio — silencia sem erro
  }
}

export default function ConfirmacaoPage() {
  const { token } = useParams() as { token: string }
  const router = useRouter()

  const [pedido, setPedido] = useState<Pedido & { pedido_itens: PedidoItem[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(6)
  const [corPrimaria, setCorPrimaria] = useState('#1A9B8A')
  const statusAnterior = useRef<string | null>(null)

  // Carrega cor primária do restaurante via token da mesa
  useEffect(() => {
    fetch(`/api/configuracoes/banner?mesa_token=${token}`)
      .then((r) => r.json())
      .then((d) => { setCorPrimaria(d.branding?.cor_primaria ?? '#1A9B8A') })
      .catch(() => {})
  }, [token])

  useEffect(() => {
    const pedidoId = sessionStorage.getItem('ultimo_pedido_id')
    if (!pedidoId) { router.push(`/mesa/${token}`); return }

    function buscarPedido() {
      fetch(`/api/pedidos/${pedidoId}`)
        .then((r) => r.json())
        .then(({ pedido: p }) => {
          // Toca som se mudou para "pronto"
          if (p && statusAnterior.current && statusAnterior.current !== 'pronto' && p.status_geral === 'pronto') {
            tocarSom()
          }
          statusAnterior.current = p?.status_geral ?? null
          setPedido(p)
        })
        .finally(() => setLoading(false))
    }

    buscarPedido()

    // Realtime: atualiza quando o pedido ou seus itens mudam
    const supabase = createClient()
    const channel = supabase
      .channel(`confirmacao-${pedidoId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, buscarPedido)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_itens' }, buscarPedido)
      .subscribe()

    // Redireciona para /conta após 6s
    const tick = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) { clearInterval(tick); router.push(`/mesa/${token}/conta`) }
        return n - 1
      })
    }, 1000)

    return () => {
      clearInterval(tick)
      supabase.removeChannel(channel)
    }
  }, [token, router])

  const rgb      = hexToRgbParts(corPrimaria)
  const gradient = headerGradient(corPrimaria)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: corFundoClaro(rgb) }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: corPrimaria }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#F0FAFA' }}>
      {/* Header */}
      <div className="shadow-lg" style={{ background: gradient }}>
        <div className="px-5 pt-5 pb-6">
          <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: `rgba(${rgb}, 0.75)` }}>Menuê+</p>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-green-500 rounded-full flex items-center justify-center shrink-0 shadow-lg">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-white font-black text-2xl leading-tight">Pedido Enviado!</h1>
              <p className="text-sm font-medium" style={{ color: `rgba(${rgb}, 0.85)` }}>
                Olá, <span className="text-white font-bold">{pedido?.cliente_nome}</span>!
              </p>
            </div>
            {/* Contador regressivo */}
            <div className="shrink-0 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
              <span className="text-white font-black text-sm">{countdown}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-sm mx-auto p-4 space-y-4">

        {/* Notificação pronto */}
        {pedido?.status_geral === 'pronto' && (
          <div className="flex items-center gap-3 bg-green-50 border-2 border-green-300 rounded-2xl px-4 py-3 animate-pulse">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-bold text-green-800 text-sm">Seu pedido está pronto!</p>
              <p className="text-green-600 text-xs">O garçom está a caminho.</p>
            </div>
          </div>
        )}

        {/* Status geral */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">Status</span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLOR[pedido?.status_geral || 'aguardando']}`}
              style={pedido?.status_geral === 'em_preparo' ? { background: corFundoMedio(rgb), color: corPrimaria } : {}}
            >
              {STATUS_LABEL[pedido?.status_geral || 'aguardando']}
            </span>
          </div>

          {pedido?.status_geral === 'aguardando' && (
            <div className="flex items-center gap-2 text-sm rounded-lg p-3" style={{ color: corPrimaria, background: corFundoClaro(rgb) }}>
              <Clock className="w-4 h-4 shrink-0" />
              <span>Aguardando a cozinha/bar receber seu pedido...</span>
            </div>
          )}
          {pedido?.status_geral === 'em_preparo' && (
            <div className="flex items-center gap-2 text-sm rounded-lg p-3" style={{ color: corPrimaria, background: corFundoClaro(rgb) }}>
              <ChefHat className="w-4 h-4 shrink-0" />
              <span>Seu pedido está sendo preparado!</span>
            </div>
          )}
        </div>

        {/* Itens */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-slate-700 mb-3">Seus itens</h2>
          <div className="space-y-2">
            {pedido?.pedido_itens.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-slate-500">{item.quantidade}x</span>
                  <span className="text-slate-700">{item.item_nome}</span>
                  {item.observacao && <span className="text-xs text-slate-400">({item.observacao})</span>}
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[item.status]}`}
                  style={item.status === 'em_preparo' ? { background: corFundoMedio(rgb), color: corPrimaria } : {}}
                >
                  {STATUS_LABEL[item.status]}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t flex justify-between font-bold">
            <span>Total</span>
            <span style={{ color: corPrimaria }}>R$ {pedido?.total.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        <Button
          onClick={() => router.push(`/mesa/${token}/conta`)}
          className="w-full h-12 font-bold text-black"
          style={{ background: corPrimaria }}
        >
          <Receipt className="w-5 h-5 mr-2" /> Ver minha conta completa
        </Button>

        <Button
          onClick={() => router.push(`/mesa/${token}/cardapio`)}
          variant="outline"
          className="w-full h-12"
          style={{ borderColor: corPrimaria, color: corPrimaria }}
        >
          + Adicionar mais itens
        </Button>
      </div>
    </div>
  )
}
