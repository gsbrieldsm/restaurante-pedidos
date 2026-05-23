'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Loader2, UtensilsCrossed, Clock, Bell, QrCode, ConciergeBell, X, Banknote, CreditCard, User, Receipt, TableProperties, ClipboardList, Phone, Search, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import type { Pedido, PedidoItem } from '@/lib/supabase/types'

const ESTACAO_LABEL: Record<string, string> = {
  cozinha: '🍳 Cozinha',
  bar: '🍺 Bar',
  drinks: '🍹 Drinks',
  chopeira: '🍻 Chopeira',
}

const ESTACAO_EMOJI: Record<string, string> = {
  cozinha: '🍳', bar: '🍺', drinks: '🍹', chopeira: '🍻',
}

type FormaPagamento = 'dinheiro' | 'pix' | 'debito' | 'credito'
type PedidoComItens = Pedido & { pedido_itens: PedidoItem[] }

interface Comanda {
  id: string
  cliente_nome: string
  cliente_whatsapp: string | null
  mesa_id: string
  mesa_numero: number
  criado_em: string
  pedidos_count: number
  itens_ativos: number
  total: number
}

const FORMAS: { key: FormaPagamento; label: string; icon: React.ElementType; cor: string }[] = [
  { key: 'dinheiro', label: 'Dinheiro', icon: Banknote,   cor: 'border-green-400 bg-green-50 text-green-700'    },
  { key: 'pix',      label: 'Pix',      icon: QrCode,     cor: 'border-teal-400 bg-teal-50 text-teal-700'       },
  { key: 'debito',   label: 'Débito',   icon: CreditCard, cor: 'border-blue-400 bg-blue-50 text-blue-700'       },
  { key: 'credito',  label: 'Crédito',  icon: CreditCard, cor: 'border-purple-400 bg-purple-50 text-purple-700' },
]

const STATUS_ITEM_CONFIG: Record<string, { label: string; cor: string }> = {
  aguardando: { label: 'Aguardando', cor: 'bg-slate-100 text-slate-600' },
  em_preparo: { label: 'Em preparo', cor: 'bg-teal-100 text-teal-700'  },
  pronto:     { label: 'Pronto',     cor: 'bg-green-100 text-green-700' },
  entregue:   { label: 'Entregue',   cor: 'bg-blue-100 text-blue-700'  },
  cancelado:  { label: 'Cancelado',  cor: 'bg-red-100 text-red-600'    },
}

function formatarReal(v: number) {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function tempoAberto(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 60) return `${min}min`
  return `${Math.floor(min / 60)}h${min % 60 > 0 ? String(min % 60).padStart(2, '0') : ''}`
}

interface ItemPronto {
  id: string
  pedido_id: string
  item_nome: string
  quantidade: number
  observacao: string | null
  estacao: string
  pronto_em: string | null
  pedidos: { mesa_numero: number; cliente_nome: string; mesa_id: string }
}

interface GrupoMesa {
  mesa_numero: number
  cliente_nome: string
  itens: ItemPronto[]
}

interface Chamada {
  id: string
  mesa_numero: number
  cliente_nome: string
  motivo: 'conta' | 'pix_pago' | 'ajuda'
  criado_em: string
}

const MOTIVO_CONFIG = {
  conta:     { label: 'Quer pagar a conta',    bg: 'bg-orange-500',  icon: ConciergeBell },
  pix_pago:  { label: 'Pagou via Pix — confirmar', bg: 'bg-teal-600', icon: QrCode        },
  ajuda:     { label: 'Precisa de ajuda',       bg: 'bg-blue-500',   icon: Bell          },
}

function tempoEspera(iso: string | null) {
  if (!iso) return ''
  const seg = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seg < 60) return `${seg}s`
  return `${Math.floor(seg / 60)}min`
}

export default function GarcomPage() {
  // Título da aba do browser
  useEffect(() => { document.title = '🛎️ Garçom — Menuê+' }, [])

  const [grupos, setGrupos] = useState<GrupoMesa[]>([])
  const [chamadas, setChamadas] = useState<Chamada[]>([])
  const [loading, setLoading] = useState(true)
  const [entregando, setEntregando] = useState<Set<string>>(new Set())
  const [dispensando, setDispensando] = useState<Set<string>>(new Set())
  const [tick, setTick] = useState(0)

  // — Busca por mesa —
  const [buscaMesa, setBuscaMesa] = useState('')

  // — Comandas expandidas —
  const [comandasExpandidas, setComandasExpandidas] = useState(false)

  // — Tirar pedido —
  const [modalTirarPedido, setModalTirarPedido] = useState(false)
  const [tpMesa, setTpMesa] = useState('')
  const [tpNome, setTpNome] = useState('')
  const [tpWhatsapp, setTpWhatsapp] = useState('')
  const [tpLoading, setTpLoading] = useState(false)
  const [tpErro, setTpErro] = useState('')

  // — Comandas —
  const [comandas, setComandas] = useState<Comanda[]>([])
  const [comandaSelecionada, setComandaSelecionada] = useState<Comanda | null>(null)
  const [pedidosComanda, setPedidosComanda] = useState<PedidoComItens[]>([])
  const [loadingModal, setLoadingModal] = useState(false)
  const [etapaPagamento, setEtapaPagamento] = useState(false)
  const [formaSelecionada, setFormaSelecionada] = useState<FormaPagamento | null>(null)
  const [fechando, setFechando] = useState(false)

  const audioCtx = useRef<AudioContext | null>(null)
  const prevItemIds = useRef<Set<string>>(new Set())
  const prevChamadaIds = useRef<Set<string>>(new Set())

  function tocarBip(freq: number, duracao: number, vezes = 1) {
    try {
      const ctx = audioCtx.current ?? new AudioContext()
      audioCtx.current = ctx
      for (let i = 0; i < vezes; i++) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        const t = ctx.currentTime + i * (duracao + 0.05)
        gain.gain.setValueAtTime(0.3, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + duracao)
        osc.start(t)
        osc.stop(t + duracao)
      }
    } catch {}
  }

  async function tirarPedido() {
    if (!tpMesa || !tpNome.trim()) {
      setTpErro('Informe o número da mesa e o nome do cliente.')
      return
    }
    setTpErro('')
    setTpLoading(true)
    const resp = await fetch('/api/garcom/pedido', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mesa_numero: Number(tpMesa),
        cliente_nome: tpNome.trim(),
        cliente_whatsapp: tpWhatsapp.trim() || undefined,
      }),
    })
    const data = await resp.json()
    setTpLoading(false)
    if (!resp.ok) {
      setTpErro(data.error || 'Erro ao abrir comanda')
      return
    }
    setModalTirarPedido(false)
    setTpMesa('')
    setTpNome('')
    setTpWhatsapp('')
    setTpErro('')
    window.open(`/mesa/${data.token}/cardapio?sessao=${data.sessao_id}`, '_blank')
  }

  const carregarComandas = useCallback(async () => {
    const res = await fetch('/api/admin/comandas')
    const { comandas: data } = await res.json() as { comandas: Comanda[] }
    setComandas(data ?? [])
  }, [])

  async function abrirComanda(comanda: Comanda) {
    setComandaSelecionada(comanda)
    setEtapaPagamento(false)
    setFormaSelecionada(null)
    setLoadingModal(true)
    const resp = await fetch(`/api/admin/mesas/${comanda.id}?por=sessao`)
    const data = await resp.json()
    setPedidosComanda(data.pedidos || [])
    setLoadingModal(false)
  }

  async function confirmarPagamento() {
    if (!comandaSelecionada || !formaSelecionada) return
    setFechando(true)
    const total = pedidosComanda
      .flatMap((p) => p.pedido_itens)
      .reduce((acc, i) => acc + i.item_preco * i.quantidade, 0)
    const resp = await fetch('/api/admin/pagamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessao_id: comandaSelecionada.id, forma: formaSelecionada, valor: total }),
    })
    setFechando(false)
    if (resp.ok) {
      setComandaSelecionada(null)
      setEtapaPagamento(false)
      carregarComandas()
    }
  }

  const totalComanda = pedidosComanda
    .flatMap((p) => p.pedido_itens)
    .reduce((acc, i) => acc + i.item_preco * i.quantidade, 0)

  const carregarItens = useCallback(async () => {
    const res = await fetch('/api/garcom')
    const { itens } = await res.json() as { itens: ItemPronto[] }
    if (!itens) return

    const novosIds = new Set(itens.map((i) => i.id))
    if (itens.some((i) => !prevItemIds.current.has(i.id)) && prevItemIds.current.size > 0) {
      tocarBip(880, 0.3, 1)
    }
    prevItemIds.current = novosIds

    const mapa = new Map<number, GrupoMesa>()
    for (const item of itens) {
      const n = item.pedidos.mesa_numero
      if (!mapa.has(n)) mapa.set(n, { mesa_numero: n, cliente_nome: item.pedidos.cliente_nome, itens: [] })
      mapa.get(n)!.itens.push(item)
    }
    setGrupos(Array.from(mapa.values()).sort((a, b) => a.mesa_numero - b.mesa_numero))
    setLoading(false)
  }, [])

  const carregarChamadas = useCallback(async () => {
    const res = await fetch('/api/admin/chamadas')
    const { chamadas: data } = await res.json() as { chamadas: Chamada[] }
    if (!data) return

    const novasIds = new Set(data.map((c) => c.id))
    if (data.some((c) => !prevChamadaIds.current.has(c.id)) && prevChamadaIds.current.size > 0) {
      tocarBip(660, 0.2, 3) // 3 bips rápidos para chamadas
    }
    prevChamadaIds.current = novasIds
    setChamadas(data)
  }, [])

  const carregarTudo = useCallback(async () => {
    await Promise.all([carregarItens(), carregarChamadas(), carregarComandas()])
  }, [carregarItens, carregarChamadas, carregarComandas])

  useEffect(() => {
    carregarTudo()

    const supabase = createClient()
    const channel = supabase
      .channel('garcom-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_itens' }, carregarItens)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamadas_garcom' }, carregarChamadas)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessoes_mesa' }, carregarComandas)
      .subscribe()

    // Polling de segurança: garante que chamadas e itens aparecem mesmo se o realtime falhar
    const timerChamadas = setInterval(carregarChamadas, 4000)
    const timerItens    = setInterval(carregarItens,    8000)
    const timerTick     = setInterval(() => setTick((t) => t + 1), 10000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(timerChamadas)
      clearInterval(timerItens)
      clearInterval(timerTick)
    }
  }, [carregarTudo, carregarItens, carregarChamadas])

  async function dispensarChamada(id: string) {
    setDispensando((prev) => new Set(prev).add(id))
    await fetch('/api/admin/chamadas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setDispensando((prev) => { const n = new Set(prev); n.delete(id); return n })
    carregarChamadas()
  }

  async function marcarEntregue(item: ItemPronto) {
    setEntregando((prev) => new Set(prev).add(item.id))
    await fetch(`/api/pedidos/${item.pedido_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: item.id, status: 'entregue' }),
    })
    setEntregando((prev) => { const n = new Set(prev); n.delete(item.id); return n })
    carregarItens()
  }

  async function entregarMesa(grupo: GrupoMesa) {
    await Promise.all(grupo.itens.map(marcarEntregue))
  }

  const totalProntos = grupos.reduce((acc, g) => acc + g.itens.length, 0)

  const busca = buscaMesa.trim()
  const comandasFiltradas = busca
    ? comandas.filter((c) => String(c.mesa_numero).includes(busca) || c.cliente_nome.toLowerCase().includes(busca.toLowerCase()))
    : comandas
  const chamadasFiltradas = busca
    ? chamadas.filter((c) => String(c.mesa_numero).includes(busca) || c.cliente_nome.toLowerCase().includes(busca.toLowerCase()))
    : chamadas
  const gruposFiltrados = busca
    ? grupos.filter((g) => String(g.mesa_numero).includes(busca) || g.cliente_nome.toLowerCase().includes(busca.toLowerCase()))
    : grupos

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0FAFA' }}>
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#F0FAFA' }}>

      {/* Header */}
      <div className="sticky top-0 z-10 shadow-sm" style={{ background: '#1A9B8A' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="font-black tracking-widest text-xs uppercase text-teal-300">Menuê+</p>
            <h1 className="text-white font-bold text-lg leading-tight">Painel do Garçom</h1>
          </div>
          <div className="flex items-center gap-2">
            {chamadas.length > 0 && (
              <span className="bg-orange-500 text-white font-bold text-sm rounded-full px-3 py-1 animate-pulse">
                {chamadas.length} chamada{chamadas.length > 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={() => { setTpErro(''); setModalTirarPedido(true) }}
              className="flex items-center gap-1.5 bg-white text-teal-700 text-sm font-black px-4 py-2 rounded-xl shadow-sm hover:bg-teal-50 transition-colors"
            >
              <ClipboardList className="w-4 h-4" />
              Iniciar Comanda
            </button>
          </div>
        </div>

        {/* Busca por mesa */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-300 pointer-events-none" />
            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Buscar mesa..."
              value={buscaMesa}
              onChange={(e) => setBuscaMesa(e.target.value)}
              className="w-full bg-white/15 placeholder-teal-300 text-white rounded-xl py-2.5 pl-9 pr-9 text-sm outline-none focus:bg-white/25 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            {buscaMesa && (
              <button
                onClick={() => setBuscaMesa('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">

        {/* ── Chamadas dos clientes ── */}
        {chamadasFiltradas.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Chamadas de clientes
            </p>
            {chamadasFiltradas.map((chamada) => {
              const cfg = MOTIVO_CONFIG[chamada.motivo] ?? MOTIVO_CONFIG.conta
              const Icon = cfg.icon
              const isDispensando = dispensando.has(chamada.id)
              return (
                <div
                  key={chamada.id}
                  className={`${cfg.bg} rounded-2xl p-4 flex items-center gap-4 text-white shadow-md`}
                >
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">Mesa {chamada.mesa_numero} — {chamada.cliente_nome}</p>
                    <p className="text-white/80 text-xs">{cfg.label}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-white/60 text-xs">{tempoEspera(chamada.criado_em)}</span>
                    <button
                      onClick={() => dispensarChamada(chamada.id)}
                      disabled={isDispensando}
                      className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                    >
                      {isDispensando
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <X className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Itens prontos para entrega ── */}
        {gruposFiltrados.length > 0 && (
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Prontos para entrega
          </p>
        )}

        {gruposFiltrados.length === 0 && chamadasFiltradas.length === 0 && comandasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-24 gap-3 text-slate-400">
            <UtensilsCrossed className="w-14 h-14 text-teal-200" />
            {busca ? (
              <>
                <p className="text-lg font-medium">Mesa não encontrada</p>
                <p className="text-sm text-center">Nenhum resultado para <strong className="text-slate-600">Mesa {busca}</strong>.</p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium">Tudo tranquilo por aqui</p>
                <p className="text-sm text-center">Itens prontos e chamadas de clientes aparecem aqui.</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {gruposFiltrados.flatMap((grupo) =>
              grupo.itens.map((item) => {
                const isEntregando = entregando.has(item.id)
                const espera = tempoEspera(item.pronto_em)
                return (
                  <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-col gap-2">
                    {/* Infos */}
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-lg">{ESTACAO_EMOJI[item.estacao]}</span>
                        <span className="text-xs font-black text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">Mesa {grupo.mesa_numero}</span>
                      </div>
                      <p className="font-black text-slate-800 text-sm leading-tight">
                        {item.quantidade}× {item.item_nome}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{grupo.cliente_nome}</p>
                      {espera && (
                        <span className="flex items-center gap-0.5 text-xs text-slate-400 mt-0.5">
                          <Clock className="w-3 h-3" />{espera}
                        </span>
                      )}
                      {item.observacao && (
                        <p className="text-xs text-orange-700 bg-orange-50 rounded px-1.5 py-0.5 mt-1 leading-tight">⚠️ {item.observacao}</p>
                      )}
                    </div>
                    {/* Botão */}
                    <button
                      onClick={() => marcarEntregue(item)}
                      disabled={isEntregando}
                      className="w-full h-9 rounded-xl text-xs font-black text-white flex items-center justify-center disabled:opacity-50"
                      style={{ background: '#F05A4F' }}
                    >
                      {isEntregando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Entregar'}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── Comandas abertas (colapsável) ── */}
        {comandasFiltradas.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setComandasExpandidas((v) => !v)}
              className="w-full flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-4 py-3 hover:border-teal-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-bold text-slate-700">Comandas abertas</span>
                <span className="bg-teal-100 text-teal-700 text-xs font-black px-2 py-0.5 rounded-full">
                  {comandasFiltradas.length}{busca ? ` de ${comandas.length}` : ''}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${comandasExpandidas ? 'rotate-180' : ''}`}
              />
            </button>

            {comandasExpandidas && (
              <div className="grid grid-cols-2 gap-2">
                {comandasFiltradas.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => abrirComanda(c)}
                    className="bg-white rounded-2xl p-4 border border-slate-100 text-left hover:border-teal-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                        <span className="text-teal-700 font-bold text-xs">{c.cliente_nome.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="font-bold text-slate-800 text-sm truncate">{c.cliente_nome}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                      <TableProperties className="w-3 h-3" />
                      <span>Mesa {c.mesa_numero}</span>
                      <span className="mx-1">·</span>
                      <Clock className="w-3 h-3" />
                      <span>{tempoAberto(c.criado_em)}</span>
                    </div>
                    <p className="text-teal-700 font-black text-base">{formatarReal(c.total)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
      {/* ── Modal tirar pedido ── */}
      {modalTirarPedido && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setModalTirarPedido(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative bg-white rounded-t-3xl flex flex-col w-full"
            style={{ maxHeight: '90vh', paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Alça */}
            <div className="shrink-0 flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>

            {/* Cabeçalho */}
            <div className="shrink-0 flex items-center justify-between px-5 pt-2 pb-4 border-b border-slate-100">
              <div>
                <p className="font-black text-slate-800 text-lg">Tirar pedido</p>
                <p className="text-xs text-slate-400 mt-0.5">Abra uma comanda para o cliente</p>
              </div>
              <button
                onClick={() => setModalTirarPedido(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Campos */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 min-h-0">
              {/* Mesa */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Número da mesa <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <TableProperties className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Ex: 5"
                    value={tpMesa}
                    onChange={(e) => setTpMesa(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 text-base outline-none focus:border-teal-400 transition-colors"
                  />
                </div>
              </div>

              {/* Nome */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Nome do cliente <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Ex: João Silva"
                    value={tpNome}
                    onChange={(e) => setTpNome(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 text-base outline-none focus:border-teal-400 transition-colors"
                  />
                </div>
              </div>

              {/* WhatsApp (opcional) */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  WhatsApp <span className="text-slate-400 font-normal text-xs">(opcional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="Ex: 47999998888"
                    value={tpWhatsapp}
                    onChange={(e) => setTpWhatsapp(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 text-base outline-none focus:border-teal-400 transition-colors"
                  />
                </div>
              </div>

              {tpErro && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                  {tpErro}
                </p>
              )}
            </div>

            {/* Botão */}
            <div className="shrink-0 px-5 pt-3 pb-2 border-t border-slate-100 bg-white">
              <button
                type="button"
                onClick={tirarPedido}
                disabled={tpLoading}
                className="w-full flex items-center justify-center gap-2 font-bold text-base text-white rounded-2xl disabled:opacity-50 transition-opacity"
                style={{ background: '#1A9B8A', height: '52px' }}
              >
                {tpLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Abrindo comanda...</>
                ) : (
                  <><ClipboardList className="w-4 h-4" /> Abrir cardápio</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal comanda ── */}
      <Dialog open={!!comandaSelecionada} onOpenChange={(open) => { if (!open) { setComandaSelecionada(null); setEtapaPagamento(false) } }}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-teal-600" />
                <span className="text-xl font-black text-slate-800">{comandaSelecionada?.cliente_nome}</span>
              </div>
              <span className="bg-teal-100 text-teal-700 text-sm font-bold px-2.5 py-0.5 rounded-full">
                Mesa {comandaSelecionada?.mesa_numero}
              </span>
              <span className="text-xs text-slate-400 ml-auto">
                {comandaSelecionada && tempoAberto(comandaSelecionada.criado_em)} aberta
              </span>
            </DialogTitle>
          </DialogHeader>

          {etapaPagamento ? (
            <div className="space-y-5 mt-2">
              <div className="text-center pb-2 border-b border-slate-100">
                <p className="text-xs text-slate-400 mb-1">Total da comanda</p>
                <p className="text-3xl font-black text-teal-700">{formatarReal(totalComanda)}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-3">Como vai pagar?</p>
                <div className="grid grid-cols-2 gap-3">
                  {FORMAS.map(({ key, label, icon: Icon, cor }) => (
                    <button key={key} onClick={() => setFormaSelecionada(key)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        formaSelecionada === key ? cor : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}>
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className="font-semibold text-sm">{label}</span>
                      {formaSelecionada === key && <CheckCircle2 className="w-4 h-4 ml-auto shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setEtapaPagamento(false)}>Voltar</Button>
                <Button onClick={confirmarPagamento} disabled={!formaSelecionada || fechando} className="flex-1 bg-teal-600 hover:bg-teal-700">
                  {fechando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Confirmar e fechar
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-4 mt-2 min-h-0">
                {loadingModal ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>
                ) : pedidosComanda.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">Nenhum pedido ainda nesta comanda.</p>
                ) : (
                  pedidosComanda.map((pedido, idx) => {
                    const subtotal = pedido.pedido_itens.reduce((acc, i) => acc + i.item_preco * i.quantidade, 0)
                    return (
                      <div key={pedido.id} className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                          <span className="text-sm font-semibold text-slate-700">Pedido #{idx + 1}</span>
                          <span className="text-xs text-slate-400">
                            {new Date(pedido.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="divide-y divide-slate-50">
                          {pedido.pedido_itens.map((item) => {
                            const cfg = STATUS_ITEM_CONFIG[item.status] ?? STATUS_ITEM_CONFIG.aguardando
                            return (
                              <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                                <span className="text-base">{ESTACAO_EMOJI[item.estacao]}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-800 truncate">
                                    {item.quantidade}× {item.item_nome}
                                  </p>
                                  {item.observacao && (
                                    <p className="text-xs text-orange-600 truncate">⚠️ {item.observacao}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-xs text-slate-500">
                                    R$ {(item.item_preco * item.quantidade).toFixed(2).replace('.', ',')}
                                  </span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.cor}`}>
                                    {cfg.label}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        <div className="flex justify-between items-center px-4 py-2.5 bg-slate-50 border-t border-slate-200">
                          <span className="text-xs text-slate-500">Subtotal</span>
                          <span className="text-sm font-bold text-teal-700">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                        </div>
                      </div>
                    )
                  })
                )}
                {pedidosComanda.length > 1 && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center px-1">
                      <span className="font-bold text-slate-700">Total da comanda</span>
                      <span className="text-lg font-black text-teal-700">{formatarReal(totalComanda)}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="pt-3 border-t border-slate-100 mt-2 shrink-0">
                <Button onClick={() => setEtapaPagamento(true)} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                  <Receipt className="w-4 h-4 mr-2" /> Fechar comanda
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
