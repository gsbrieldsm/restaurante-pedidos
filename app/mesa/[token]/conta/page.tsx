'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  CheckCircle2, Clock, ChefHat, Loader2,
  ShoppingBag, QrCode, ConciergeBell, Plus,
  Copy, Check, ChevronDown, ChevronUp, ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { Pedido, PedidoItem } from '@/lib/supabase/types'
import { hexToRgbParts, headerGradient, corFundoClaro, corFundoMedio, corBorda } from '@/lib/cor'

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
    // sem suporte a Web Audio
  }
}

const RESTAURANT_NAME = process.env.NEXT_PUBLIC_RESTAURANT_NAME ?? 'Menuê+'

const STATUS_CONFIG: Record<string, { label: string; cor: string; icon: React.ElementType }> = {
  aguardando: { label: 'Aguardando',  cor: 'bg-slate-100 text-slate-500',  icon: Clock        },
  em_preparo: { label: 'Preparando', cor: '',                              icon: ChefHat      },
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
  const [itemPronto, setItemPronto] = useState(false)

  const [modalPix, setModalPix] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [chamandoGarcom, setChamandoGarcom] = useState(false)
  const [garcomChamado, setGarcomChamado] = useState(false)
  const [garcomPix, setGarcomPix] = useState(false)
  const [pixChave, setPixChave] = useState<string | null>(null)
  const [corPrimaria, setCorPrimaria] = useState('#1A9B8A')
  const [saldoHabilitado, setSaldoHabilitado] = useState(false)
  const [saldoCliente, setSaldoCliente] = useState<{
    id: string; nome: string | null; telefone: string; saldo_disponivel: number
  } | null>(null)

  // IDs de itens que já sabemos que estão "pronto" — para detectar novos
  const prontosSabidos = useRef<Set<string>>(new Set())

  // Carrega chave PIX, cor primária e saldo do restaurante
  useEffect(() => {
    fetch(`/api/configuracoes/banner?mesa_token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        setPixChave(d.branding?.pix_chave ?? null)
        setCorPrimaria(d.branding?.cor_primaria ?? '#1A9B8A')

        const habilitado = d.branding?.saldo_habilitado ?? false
        setSaldoHabilitado(habilitado)

        if (habilitado) {
          try {
            const salvo = localStorage.getItem(`menue_saldo_${token}`)
            if (salvo) {
              const parsed = JSON.parse(salvo)
              setSaldoCliente(parsed)
              // Revalida saldo atual no servidor
              fetch(`/api/pub/saldo?cliente_id=${parsed.id}`)
                .then(r => r.json())
                .then(sd => { if (sd.cliente) setSaldoCliente(sd.cliente) })
                .catch(() => {})
            }
          } catch {}
        }
      })
      .catch(() => {})
  }, [token])

  const buscarConta = useCallback(async () => {
    const sessaoId = sessionStorage.getItem('sessao_id')
    if (!sessaoId) { router.push(`/mesa/${token}`); return }

    const res = await fetch(`/api/mesa/${token}/conta?sessao_id=${sessaoId}`)
    if (!res.ok) { router.push(`/mesa/${token}`); return }
    const data = await res.json()

    const pedidosNovos: PedidoComItens[] = data.pedidos ?? []

    // Detecta itens que acabaram de ficar "pronto"
    let novoPronto = false
    for (const p of pedidosNovos) {
      for (const item of p.pedido_itens) {
        if (item.status === 'pronto' && !prontosSabidos.current.has(item.id)) {
          novoPronto = true
        }
        if (item.status === 'pronto' || item.status === 'entregue') {
          prontosSabidos.current.add(item.id)
        }
      }
    }

    if (novoPronto && !loading) {
      tocarSom()
      setItemPronto(true)
      setTimeout(() => setItemPronto(false), 5000)
    }

    setPedidos(pedidosNovos)
    setClienteNome(data.cliente_nome ?? '')
    setMesaNumero(data.mesa_numero)
    setLoading(false)

    if (data.pedidos?.length && loading) {
      setExpandidos(new Set([data.pedidos[data.pedidos.length - 1].id]))
    }
  }, [token, router, loading])

  useEffect(() => {
    const sessaoId = sessionStorage.getItem('sessao_id')
    if (!sessaoId) return

    buscarConta()

    // Realtime: atualiza instantaneamente quando pedidos ou itens mudam
    const supabase = createClient()
    const channel = supabase
      .channel(`conta-${sessaoId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, buscarConta)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_itens' }, buscarConta)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

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
    await navigator.clipboard.writeText(pixChave ?? '')
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

  const rgb      = hexToRgbParts(corPrimaria)
  const gradient = headerGradient(corPrimaria)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0FAFA' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: corPrimaria }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-52" style={{ background: '#F0FAFA' }}>

      {/* Header */}
      <div
        className="sticky top-0 z-10 shadow-lg"
        style={{ background: gradient }}
      >
        <div className="flex items-center gap-3 px-4 pt-3 pb-4">
          <button
            onClick={() => router.push(`/mesa/${token}/cardapio`)}
            className="text-white/60 hover:text-white p-1 -ml-1 shrink-0"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold tracking-widest uppercase leading-none" style={{ color: `rgba(${rgb}, 0.75)` }}>Menuê+</p>
            <h1 className="text-white font-black text-2xl leading-tight">
              Mesa {mesaNumero}
            </h1>
            <p className="text-sm font-medium" style={{ color: `rgba(${rgb}, 0.85)` }}>Minha conta · {clienteNome}</p>
          </div>
          <button
            onClick={buscarConta}
            title="Atualizar"
            className="text-white/50 hover:text-white p-1 shrink-0 transition-colors"
          >
            <CheckCircle2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">

        {/* Toast: item pronto */}
        {itemPronto && (
          <div className="flex items-center gap-3 bg-green-50 border-2 border-green-300 rounded-2xl px-4 py-3 animate-pulse">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-bold text-green-800 text-sm">Um item está pronto!</p>
              <p className="text-green-600 text-xs">O garçom está a caminho com seu pedido.</p>
            </div>
          </div>
        )}

        {/* Saudação */}
        <p className="text-slate-500 text-sm">
          Olá, <span className="font-semibold text-slate-700">{clienteNome}</span>! Aqui está tudo o que você pediu.
        </p>

        {/* Card de saldo pré-pago */}
        {saldoHabilitado && saldoCliente && (
          <div
            className="rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 shadow-sm"
            style={{ background: `linear-gradient(135deg, #0a2420, #1A9B8A)` }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0 text-xl">
                💳
              </div>
              <div className="min-w-0">
                <p className="text-white/70 text-xs font-semibold leading-none mb-1">
                  Saldo pré-pago
                </p>
                <p className="text-white text-sm font-bold leading-none truncate">
                  {saldoCliente.nome
                    ? `${saldoCliente.nome.split(' ')[0]} · ${saldoCliente.telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}`
                    : saldoCliente.telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
                  }
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-white/60 text-[10px] leading-tight mb-0.5">saldo restante</p>
              <p className="text-white font-black text-xl leading-none">
                {formatarReal(saldoCliente.saldo_disponivel)}
              </p>
            </div>
          </div>
        )}

        {/* Lista de pedidos */}
        {pedidos.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3" style={{ color: `rgba(${rgb}, 0.35)` }} />
            <p className="font-medium text-slate-600">Nenhum pedido ainda</p>
            <Button
              onClick={() => router.push(`/mesa/${token}/cardapio`)}
              className="mt-4 text-black font-bold"
              style={{ background: corPrimaria }}
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
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: corFundoMedio(rgb) }}>
                      <span className="font-bold text-sm" style={{ color: corPrimaria }}>#{idx + 1}</span>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-slate-800 text-sm">
                        Pedido {new Date(pedido.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs text-slate-400">{itensEntregues}/{total} entregues</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold" style={{ color: corPrimaria }}>{formatarReal(subtotal)}</span>
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
                          <span
                            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${cfg.cor}`}
                            style={item.status === 'em_preparo' ? { background: corFundoMedio(rgb), color: corPrimaria } : {}}
                          >
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
            style={{ background: gradient }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: `rgba(${rgb}, 0.75)` }}>Total da conta</p>
                <p className="text-3xl font-black text-white">{formatarReal(totalGeral)}</p>
              </div>
              {saldoHabilitado && saldoCliente
                ? <span className="text-3xl">💳</span>
                : <ShoppingBag className="w-10 h-10 text-white/20" />
              }
            </div>
            {saldoHabilitado && saldoCliente && (
              <div className="mt-3 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                <CheckCircle2 className="w-4 h-4 text-green-300 shrink-0" />
                <p className="text-xs font-semibold text-white/90">
                  Pago via saldo pré-pago · restam {formatarReal(saldoCliente.saldo_disponivel)}
                </p>
              </div>
            )}
            {todosEntregues && (
              <p className="text-xs mt-2" style={{ color: `rgba(${rgb}, 0.75)` }}>✓ Todos os itens foram entregues</p>
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
        {/* Saldo: botão para chamar garçom encerrar mesa */}
        {saldoHabilitado && saldoCliente && pedidos.length > 0 && !garcomChamado && (
          <div className="space-y-2">
            <button
              onClick={() => chamarGarcom('conta')}
              disabled={chamandoGarcom}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 font-semibold text-sm transition-colors"
              style={{ borderColor: corPrimaria, color: corPrimaria }}
            >
              {chamandoGarcom
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <ConciergeBell className="w-4 h-4" />}
              Chamar garçom para encerrar
            </button>
            <button
              onClick={() => router.push(`/mesa/${token}/cardapio`)}
              className="w-full text-center text-xs text-slate-400 py-1"
            >
              + Adicionar mais itens
            </button>
          </div>
        )}

        {garcomPix && (
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: corFundoClaro(rgb), border: `1px solid ${corBorda(rgb)}` }}>
            <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: corPrimaria }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: corPrimaria }}>Pagamento informado!</p>
              <p className="text-xs" style={{ color: corPrimaria }}>O garçom verificará o PIX e encerrará sua mesa.</p>
            </div>
          </div>
        )}
      </div>

      {/* Botões fixos na base */}
      {pedidos.length > 0 && !garcomChamado && !garcomPix && !(saldoHabilitado && saldoCliente) && (
        <div className="fixed bottom-0 left-0 right-0 p-4 space-y-2 bg-white/80 backdrop-blur border-t border-slate-100">
          <div className="max-w-lg mx-auto space-y-2">
            {/* Pagar via PIX — só aparece se o restaurante configurou a chave */}
            {pixChave && (
              <Button
                onClick={() => setModalPix(true)}
                className="w-full h-12 text-black font-bold text-base"
                style={{ background: corPrimaria }}
              >
                <QrCode className="w-5 h-5 mr-2" />
                Pagar via Pix — {formatarReal(totalGeral)}
              </Button>
            )}

            {/* Chamar garçom */}
            <Button
              onClick={() => chamarGarcom('conta')}
              disabled={chamandoGarcom}
              variant="outline"
              className="w-full h-12 font-bold text-base"
              style={{ borderColor: corPrimaria, color: corPrimaria }}
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
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: corFundoClaro(rgb) }}>
                <QrCode className="w-7 h-7" style={{ color: corPrimaria }} />
              </div>
              <h2 className="text-xl font-black text-slate-800">Pagar via Pix</h2>
              <p className="text-slate-500 text-sm mt-1">Copie a chave abaixo e pague pelo seu banco</p>
            </div>

            {/* Valor */}
            <div className="rounded-2xl p-4 text-center" style={{ background: corFundoClaro(rgb) }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: corPrimaria }}>Valor a pagar</p>
              <p className="text-3xl font-black" style={{ color: corPrimaria }}>{formatarReal(totalGeral)}</p>
            </div>

            {/* Chave PIX */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Chave Pix</p>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <span className="flex-1 font-mono text-sm text-slate-700 truncate">{pixChave}</span>
                <button
                  onClick={copiarPix}
                  className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                    copiado ? 'bg-green-100 text-green-700' : ''
                  }`}
                  style={!copiado ? { background: corFundoMedio(rgb), color: corPrimaria } : {}}
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
              style={{ background: corPrimaria }}
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
