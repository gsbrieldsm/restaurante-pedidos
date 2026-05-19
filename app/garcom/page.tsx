'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Loader2, UtensilsCrossed, Clock, Bell, QrCode, ConciergeBell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const ESTACAO_LABEL: Record<string, string> = {
  cozinha: '🍳 Cozinha',
  bar: '🍺 Bar',
  drinks: '🍹 Drinks',
  chopeira: '🍻 Chopeira',
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
  const [grupos, setGrupos] = useState<GrupoMesa[]>([])
  const [chamadas, setChamadas] = useState<Chamada[]>([])
  const [loading, setLoading] = useState(true)
  const [entregando, setEntregando] = useState<Set<string>>(new Set())
  const [dispensando, setDispensando] = useState<Set<string>>(new Set())
  const [tick, setTick] = useState(0)

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
    await Promise.all([carregarItens(), carregarChamadas()])
  }, [carregarItens, carregarChamadas])

  useEffect(() => {
    carregarTudo()

    const supabase = createClient()
    const channel = supabase
      .channel('garcom-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_itens' }, carregarItens)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chamadas_garcom' }, carregarChamadas)
      .subscribe()

    const timer = setInterval(() => setTick((t) => t + 1), 10000)
    return () => { supabase.removeChannel(channel); clearInterval(timer) }
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
            <p className="font-black tracking-widest text-xs uppercase text-teal-300">Meu Menu+</p>
            <h1 className="text-white font-bold text-lg leading-tight">Painel do Garçom</h1>
          </div>
          <div className="flex items-center gap-2">
            {chamadas.length > 0 && (
              <span className="bg-orange-500 text-white font-bold text-sm rounded-full px-3 py-1 animate-pulse">
                {chamadas.length} chamada{chamadas.length > 1 ? 's' : ''}
              </span>
            )}
            {totalProntos > 0 && (
              <span className="bg-white text-teal-700 font-bold text-sm rounded-full px-3 py-1">
                {totalProntos} pronto{totalProntos > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">

        {/* ── Chamadas dos clientes ── */}
        {chamadas.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Chamadas de clientes
            </p>
            {chamadas.map((chamada) => {
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
        {grupos.length > 0 && (
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Prontos para entrega
          </p>
        )}

        {grupos.length === 0 && chamadas.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-24 gap-3 text-slate-400">
            <UtensilsCrossed className="w-14 h-14 text-teal-200" />
            <p className="text-lg font-medium">Tudo tranquilo por aqui</p>
            <p className="text-sm text-center">Itens prontos e chamadas de clientes aparecem aqui.</p>
          </div>
        ) : (
          grupos.map((grupo) => {
            const tudoEntregando = grupo.itens.every((i) => entregando.has(i.id))
            return (
              <div key={grupo.mesa_numero} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100" style={{ background: '#F0FAFA' }}>
                  <div>
                    <span className="font-black text-teal-700 text-lg">Mesa {grupo.mesa_numero}</span>
                    <span className="text-slate-500 text-sm ml-2">— {grupo.cliente_nome}</span>
                  </div>
                  <Button
                    onClick={() => entregarMesa(grupo)}
                    disabled={tudoEntregando}
                    size="sm"
                    className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-8 px-3"
                  >
                    {tudoEntregando
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Entregar tudo</>}
                  </Button>
                </div>

                <div className="divide-y divide-slate-50">
                  {grupo.itens.map((item) => {
                    const isEntregando = entregando.has(item.id)
                    const espera = tempoEspera(item.pronto_em)
                    return (
                      <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">{item.quantidade}× {item.item_nome}</span>
                            <span className="text-xs text-slate-400">{ESTACAO_LABEL[item.estacao]}</span>
                          </div>
                          {item.observacao && (
                            <p className="text-xs text-orange-700 bg-orange-50 rounded px-2 py-0.5 mt-1 inline-block">
                              ⚠️ {item.observacao}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {espera && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Clock className="w-3 h-3" />{espera}
                            </span>
                          )}
                          <Button
                            onClick={() => marcarEntregue(item)}
                            disabled={isEntregando}
                            size="sm"
                            className="h-8 px-3 text-xs font-bold text-white hover:opacity-90"
                            style={{ background: '#F05A4F' }}
                          >
                            {isEntregando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Entregar'}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
