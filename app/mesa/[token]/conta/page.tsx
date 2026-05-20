'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  CheckCircle2, Clock, ChefHat, Loader2,
  ShoppingBag, QrCode, ConciergeBell, Plus,
  Copy, Check, ChevronDown, ChevronUp, ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Pedido, PedidoItem } from '@/lib/supabase/types'

const PIX_KEY = process.env.NEXT_PUBLIC_PIX_KEY ?? '(não configurada)'
const RESTAURANT_NAME = process.env.NEXT_PUBLIC_RESTAURANT_NAME ?? 'Meu Menu+'

const STATUS_CONFIG: Record<string, { label: string; cor: string; icon: React.ElementType }> = {
  aguardando: { label: 'Aguardando',  cor: 'bg-slate-100 text-slate-500',  icon: Clock        },
  em_preparo: { label: 'Preparando', cor: 'bg-teal-100 text-teal-700',    icon: ChefHat      },
  pronto:     { label: 'Pronto!',    cor: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  entregue:   { label: 'Entregue',   cor: 'bg-blue-100 text-blue-600',    icon: CheckCircle2 },
}

type PedidoComItens = Pedido & { pedido_itens: PedidoItem[] }

function formatarReal(v: number) {
  return `R$ ${v.toFixed(2).replace('.', ',')}`
}

export default function ContaPage() {
  const { token } = useParams() as { token: string }
  const router = useRouter()

  const [pedidos, setPedidos] = useState<PedidoComItens[]>([])
  const [clienteNome, setClienteNome] = useState('')
  const [mesaNumero, setMesaNumero] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())

  const [modalPix, setModalPix] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [chamandoGarcom, setChamandoGarcom] = useState(false)
  const [garcomChamado, setGarcomChamado] = useState(false)
  const [garcomPix, setGarcomPix] = useState(false)

  const buscarConta = useCallback(async () => {
    const sessaoId = sessionStorage.getItem('sessao_id')
    if (!sessaoId) { router.push(`/mesa/${token}`); return }

    const res = await fetch(`/api/mesa/${token}/conta?sessao_id=${sessaoId}`)
    if (!res.ok) { router.push(`/mesa/${token}`); return }
    const data = await res.json()
    setPedidos(data.pedidos ?? [])
    setClienteNome(data.cliente_nome ?? '')
    setMesaNumero(data.mesa_numero)
    setLoading(false)

    // Expande o último pedido por padrão
    if (data.pedidos?.length) {
      setExpandidos(new Set([data.pedidos[data.pedidos.length - 1].id]))
    }
  }, [token, router])

  useEffect(() => {
    buscarConta()
    const interval = setInterval(buscarConta, 20000)
    return () => clearInterval(interval)
  }, [buscarConta])

  const totalGeral = pedidos.flatMap((p) => p.pedido_itens)
    .reduce((acc, i) => acc + i.item_preco * i.quantidade, 0)

  const todosEntregues = pedidos.length > 0 &&
    pedidos.every((p) => p.pedido_itens.every((i) => i.status === 'entregue'))

  function toggleExpandido(id: string) {
    setExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function copiarPix() {
    await navigator.clipboard.writeText(PIX_KEY)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  async function chamarGarcom(motivo: 'conta' | 'pix_pago') {
    const sessaoId = sessionStorage.getItem('sessao_id')
    if (!sessaoId) return
    setChamandoGarcom(true)
    await fetch(`/api/mesa/${token}/chamar-garcom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessao_id: sessaoId, motivo }),
    })
    setChamandoGarcom(false)
    if (motivo === 'pix_pago') {
      setGarcomPix(true)
      setModalPix(false)
    } else {
      setGarcomChamado(true)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0FAFA' }}>
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-52" style={{ background: '#F0FAFA' }}>

      {/* Header */}
      <div className="sticky top-0 z-10 shadow-sm" style={{ background: '#1A9B8A' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.push(`/mesa/${token}/cardapio`)} className="text-white/70 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-xs font-bold tracking-widest uppercase text-teal-300">Meu Menu+</p>
            <h1 className="text-white font-bold text-base leading-tight">
              Minha Conta — Mesa {mesaNumero}
            </h1>
          </div>
          <button
            onClick={buscarConta}
            className="text-white/70 hover:text-white p-1"
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">

        {/* Saudação */}
        <p className="text-slate-500 text-sm">
          Olá, <span className="font-semibold text-slate-700">{clienteNome}</span>! Aqui está tudo o que você pediu.
        </p>

        {/* Lista de pedidos */}
        {pedidos.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-teal-200" />
            <p className="font-medium text-slate-600">Nenhum pedido ainda</p>
            <Button
              onClick={() => router.push(`/mesa/${token}/cardapio`)}
              className="mt-4 text-black font-bold"
              style={{ background: '#1A9B8A' }}
            >
              <Plus className="w-4 h-4 mr-2" /> Ver cardápio
            </Button>
          </div>
        ) : (
          pedidos.map((pedido, idx) => {
            const aberto = expandidos.has(pedido.id)
            const subtotal = pedido.pedido_itens.reduce((acc, i) => acc + i.item_preco * i.quantidade, 0)
            const itensEntregues = pedido.pedido_itens.filter((i) => i.status === 'entregue').length
            const total = pedido.pedido_itens.length

            return (
              <div key={pedido.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Cabeçalho do pedido */}
                <button
                  onClick={() => toggleExpandido(pedido.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                      <span className="text-teal-700 font-bold text-sm">#{idx + 1}</span>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-slate-800 text-sm">
                        Pedido {new Date(pedido.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs text-slate-400">{itensEntregues}/{total} entregues</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-teal-700">{formatarReal(subtotal)}</span>
                    {aberto ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {/* Itens expandidos */}
                {aberto && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {pedido.pedido_itens.map((item) => {
                      const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.aguardando
                      const Icon = cfg.icon
                      return (
                        <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800">
                              {item.quantidade}× {item.item_nome}
                            </p>
                            {item.observacao && (
                              <p className="text-xs text-orange-600 mt-0.5">⚠️ {item.observacao}</p>
                            )}
                            <p className="text-xs text-slate-400 mt-0.5">
                              {formatarReal(item.item_preco * item.quantidade)}
                            </p>
                          </div>
                          <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${cfg.cor}`}>
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}

        {/* Total da conta */}
        {pedidos.length > 0 && (
          <div
            className="rounded-2xl p-5 text-white"
            style={{ background: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 40%, #1A9B8A 100%)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-300 text-xs font-bold uppercase tracking-widest mb-1">Total da conta</p>
                <p className="text-3xl font-black">{formatarReal(totalGeral)}</p>
              </div>
              <ShoppingBag className="w-10 h-10 text-white/20" />
            </div>
            {todosEntregues && (
              <p className="text-teal-300 text-xs mt-2">✓ Todos os itens foram entregues</p>
            )}
          </div>
        )}

        {/* Feedback chamada */}
        {garcomChamado && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-800 text-sm">Garçom chamado!</p>
              <p className="text-green-600 text-xs">Alguém chegará em breve para acertar sua conta.</p>
            </div>
          </div>
        )}
        {garcomPix && (
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
            <div>
              <p className="font-semibold text-teal-800 text-sm">Pagamento informado!</p>
              <p className="text-teal-600 text-xs">O garçom verificará o PIX e encerrará sua mesa.</p>
            </div>
          </div>
        )}
      </div>

      {/* Botões fixos na base */}
      {pedidos.length > 0 && !garcomChamado && !garcomPix && (
        <div className="fixed bottom-0 left-0 right-0 p-4 space-y-2 bg-white/80 backdrop-blur border-t border-slate-100">
          <div className="max-w-lg mx-auto space-y-2">
            {/* Pagar via PIX */}
            <Button
              onClick={() => setModalPix(true)}
              className="w-full h-12 text-black font-bold text-base"
              style={{ background: '#1A9B8A' }}
            >
              <QrCode className="w-5 h-5 mr-2" />
              Pagar via Pix — {formatarReal(totalGeral)}
            </Button>

            {/* Chamar garçom */}
            <Button
              onClick={() => chamarGarcom('conta')}
              disabled={chamandoGarcom}
              variant="outline"
              className="w-full h-12 font-bold text-base border-teal-500 text-teal-700 hover:bg-teal-50"
            >
              {chamandoGarcom
                ? <Loader2 className="w-5 h-5 animate-spin mr-2" />
                : <ConciergeBell className="w-5 h-5 mr-2" />}
              Chamar garçom para pagar
            </Button>

            <button
              onClick={() => router.push(`/mesa/${token}/cardapio`)}
              className="w-full text-center text-xs text-slate-400 py-1"
            >
              + Adicionar mais itens
            </button>
          </div>
        </div>
      )}

      {/* Modal PIX */}
      {modalPix && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalPix(false)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm mx-auto p-6 space-y-5">

            {/* Header */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#F0FAFA' }}>
                <QrCode className="w-7 h-7 text-teal-600" />
              </div>
              <h2 className="text-xl font-black text-slate-800">Pagar via Pix</h2>
              <p className="text-slate-500 text-sm mt-1">Copie a chave abaixo e pague pelo seu banco</p>
            </div>

            {/* Valor */}
            <div className="bg-teal-50 rounded-2xl p-4 text-center">
              <p className="text-xs text-teal-600 font-bold uppercase tracking-widest mb-1">Valor a pagar</p>
              <p className="text-3xl font-black text-teal-700">{formatarReal(totalGeral)}</p>
            </div>

            {/* Chave PIX */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Chave Pix</p>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <span className="flex-1 font-mono text-sm text-slate-700 truncate">{PIX_KEY}</span>
                <button
                  onClick={copiarPix}
                  className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                    copiado ? 'bg-green-100 text-green-700' : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                  }`}
                >
                  {copiado ? <><Check className="w-3.5 h-3.5" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
                </button>
              </div>
              <p className="text-xs text-slate-400 text-center">{RESTAURANT_NAME}</p>
            </div>

            {/* Já paguei */}
            <Button
              onClick={() => chamarGarcom('pix_pago')}
              disabled={chamandoGarcom}
              className="w-full h-12 text-black font-bold"
              style={{ background: '#1A9B8A' }}
            >
              {chamandoGarcom
                ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Já paguei — avisar garçom
            </Button>

            <button onClick={() => setModalPix(false)} className="w-full text-center text-sm text-slate-400">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
