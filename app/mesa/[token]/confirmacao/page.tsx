'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, Clock, ChefHat, Loader2, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Pedido, PedidoItem } from '@/lib/supabase/types'

const STATUS_LABEL: Record<string, string> = {
  aguardando: 'Aguardando',
  em_preparo: 'Em preparo',
  pronto: 'Pronto!',
  entregue: 'Entregue',
}

const STATUS_COLOR: Record<string, string> = {
  aguardando: 'bg-slate-100 text-slate-600',
  em_preparo: 'bg-teal-100 text-teal-700',
  pronto: 'bg-green-100 text-green-700',
  entregue: 'bg-blue-100 text-blue-700',
}

export default function ConfirmacaoPage() {
  const { token } = useParams() as { token: string }
  const router = useRouter()

  const [pedido, setPedido] = useState<Pedido & { pedido_itens: PedidoItem[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(6)

  useEffect(() => {
    const pedidoId = sessionStorage.getItem('ultimo_pedido_id')
    if (!pedidoId) {
      router.push(`/mesa/${token}`)
      return
    }

    fetch(`/api/pedidos/${pedidoId}`)
      .then((r) => r.json())
      .then(({ pedido }) => setPedido(pedido))
      .finally(() => setLoading(false))

    // Redireciona para /conta após 6s — lá o cliente acompanha todos os pedidos
    const tick = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) {
          clearInterval(tick)
          router.push(`/mesa/${token}/conta`)
        }
        return n - 1
      })
    }, 1000)

    return () => clearInterval(tick)
  }, [token, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-teal-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#F0FAFA' }}>
      {/* Header */}
      <div
        className="shadow-lg"
        style={{ background: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 50%, #1A9B8A 100%)' }}
      >
        <div className="px-5 pt-5 pb-6">
          <p className="text-xs font-bold tracking-widest uppercase text-teal-400 mb-1">Meu Menu+</p>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-green-500 rounded-full flex items-center justify-center shrink-0 shadow-lg">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-white font-black text-2xl leading-tight">Pedido Enviado!</h1>
              <p className="text-teal-300 text-sm font-medium">
                Olá, <span className="text-white font-bold">{pedido?.cliente_nome}</span>!
              </p>
            </div>
            <div className="shrink-0 text-right">
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-white font-black text-sm">{countdown}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-sm mx-auto p-4 space-y-4">

        {/* Status geral */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">Status do Pedido</span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                STATUS_COLOR[pedido?.status_geral || 'aguardando']
              }`}
            >
              {STATUS_LABEL[pedido?.status_geral || 'aguardando']}
            </span>
          </div>

          {pedido?.status_geral === 'aguardando' && (
            <div className="flex items-center gap-2 text-sm text-teal-700 bg-teal-50 rounded-lg p-3">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Aguardando a cozinha/bar receber seu pedido...</span>
            </div>
          )}

          {pedido?.status_geral === 'em_preparo' && (
            <div className="flex items-center gap-2 text-sm text-teal-700 bg-teal-50 rounded-lg p-3">
              <ChefHat className="w-4 h-4 shrink-0" />
              <span>Seu pedido está sendo preparado!</span>
            </div>
          )}

          {pedido?.status_geral === 'pronto' && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Pronto! O garçom está a caminho com seu pedido. 🎉</span>
            </div>
          )}
        </div>

        {/* Itens do pedido */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-slate-700 mb-3">Seus itens</h2>
          <div className="space-y-2">
            {pedido?.pedido_itens.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-slate-500">{item.quantidade}x</span>
                  <span className="text-slate-700">{item.item_nome}</span>
                  {item.observacao && (
                    <span className="text-xs text-slate-400">({item.observacao})</span>
                  )}
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    STATUS_COLOR[item.status]
                  }`}
                >
                  {STATUS_LABEL[item.status]}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t flex justify-between font-bold">
            <span>Total</span>
            <span className="text-teal-700">
              R$ {pedido?.total.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>

        <Button
          onClick={() => router.push(`/mesa/${token}/conta`)}
          className="w-full h-12 font-bold text-black"
          style={{ background: '#1A9B8A' }}
        >
          <Receipt className="w-5 h-5 mr-2" /> Ver minha conta
        </Button>

        <Button
          onClick={() => router.push(`/mesa/${token}/cardapio`)}
          variant="outline"
          className="w-full h-12 border-teal-500 text-teal-700 hover:bg-teal-50"
        >
          + Adicionar mais itens
        </Button>
      </div>
    </div>
  )
}
