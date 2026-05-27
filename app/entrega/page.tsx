'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Truck, CheckCircle2, Loader2, Phone, MapPin,
  Banknote, QrCode, CreditCard, RefreshCw,
  Clock, Package, Volume2, VolumeX, ExternalLink,
} from 'lucide-react'
import { criarBeep, desbloquearAudio } from '@/lib/audio'

/* ─── tipos ─────────────────────────────────────────────────── */
interface PedidoItem {
  id:        string
  item_nome: string
  quantidade: number
  observacao: string | null
  estacao:   string
  status:    string
  item_preco: number
}

interface Pedido {
  id:        string
  total:     number
  criado_em: string
  pedido_itens: PedidoItem[]
}

interface Sessao {
  id:                       string
  cliente_nome:             string
  aberta_em:                string
  delivery_nome:            string
  delivery_telefone:        string
  delivery_endereco:        string
  delivery_numero:          string | null
  delivery_complemento:     string | null
  delivery_bairro:          string | null
  delivery_cidade:          string | null
  delivery_uf:              string | null
  delivery_cep:             string | null
  delivery_taxa:            number
  delivery_distancia_km:    number | null
  delivery_forma_pagamento: string
  delivery_status:          string
  pedidos:                  Pedido[]
}

const FORMA_LABEL: Record<string, { label: string; icon: React.ElementType }> = {
  dinheiro: { label: 'Dinheiro',  icon: Banknote   },
  pix:      { label: 'Pix',      icon: QrCode      },
  debito:   { label: 'Débito',   icon: CreditCard  },
  credito:  { label: 'Crédito',  icon: CreditCard  },
}

const STATUS_COR: Record<string, string> = {
  aguardando:   'bg-amber-50 border-amber-200',
  saiu_entrega: 'bg-purple-50 border-purple-200',
}

function fmt(n: number) { return `R$ ${n.toFixed(2).replace('.', ',')}` }
function tempoAberto(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 60) return `${min}min`
  return `${Math.floor(min / 60)}h${min % 60 > 0 ? String(min % 60).padStart(2, '0') : ''}`
}

/* ═══════════════════════════════════════════════════════════════ */
export default function EntregaPage() {
  useEffect(() => { document.title = '🚚 Entrega — Menuê+' }, [])

  const [sessoes,  setSessoes]  = useState<Sessao[]>([])
  const [loading,  setLoading]  = useState(true)
  const [tick,     setTick]     = useState(0)
  const [atualizando, setAtualizando] = useState<Set<string>>(new Set())
  const [somAtivo, setSomAtivo] = useState(false)

  const prevIds    = useRef<Set<string>>(new Set())
  const audioRef   = useRef<HTMLAudioElement | null>(null)

  function tocarSom() {
    if (!somAtivo) return
    const a = audioRef.current
    if (!a) return
    a.currentTime = 0
    a.play().catch(() => {})
  }

  async function ativarSom() {
    try {
      if (!audioRef.current) {
        const beep = criarBeep(660, 0.35)
        if (beep) audioRef.current = beep
      }
      if (audioRef.current) {
        await desbloquearAudio(audioRef.current)
        audioRef.current.play().catch(() => {})
      }
      setSomAtivo(true)
    } catch { /* ignora */ }
  }

  /* ── carregar sessões ────────────────────────────────────────── */
  const carregar = useCallback(async () => {
    try {
      const res  = await fetch('/api/entrega')
      const data = await res.json()
      const lista = data.sessoes as Sessao[] ?? []

      const novosIds = new Set(lista.map((s) => s.id))
      if (lista.some((s) => !prevIds.current.has(s.id)) && prevIds.current.size > 0) {
        tocarSom()
      }
      prevIds.current = novosIds

      setSessoes(lista)
    } catch { /* ignora */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // Polling a cada 12s
  useEffect(() => {
    const t = setInterval(() => { setTick((n) => n + 1); carregar() }, 12_000)
    return () => clearInterval(t)
  }, [carregar])

  // Relógio a cada minuto
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  /* ── ações ───────────────────────────────────────────────────── */
  async function acao(sessaoId: string, tipo: 'saiu_entrega' | 'entregue') {
    setAtualizando((prev) => new Set([...prev, sessaoId]))
    try {
      const res = await fetch('/api/entrega', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sessao_id: sessaoId, acao: tipo }),
      })
      if (res.ok) {
        if (tipo === 'entregue') {
          setSessoes((prev) => prev.filter((s) => s.id !== sessaoId))
        } else {
          setSessoes((prev) =>
            prev.map((s) => s.id === sessaoId ? { ...s, delivery_status: tipo } : s)
          )
        }
      }
    } finally {
      setAtualizando((prev) => { const s = new Set(prev); s.delete(sessaoId); return s })
    }
  }

  /* ── render ──────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <audio ref={audioRef} />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-black text-sm text-white leading-tight">Painel Entrega</p>
            <p className="text-slate-400 text-[11px]">Menuê+</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={carregar}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={ativarSom}
            className={`p-2 rounded-lg transition-colors ${somAtivo ? 'bg-teal-700' : 'bg-slate-800 hover:bg-slate-700'}`}
          >
            {somAtivo
              ? <Volume2 className="w-4 h-4 text-white" />
              : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
          </div>
        )}

        {!loading && sessoes.length === 0 && (
          <div className="text-center py-20">
            <Package className="w-16 h-16 mx-auto mb-4 text-slate-700" />
            <p className="text-slate-400 font-semibold">Nenhum pedido pronto para entrega</p>
            <p className="text-slate-600 text-sm mt-1">Os pedidos aparecem aqui quando a cozinha finalizar</p>
          </div>
        )}

        {sessoes.map((sessao) => {
          const todosItens = sessao.pedidos.flatMap((p) => p.pedido_itens)
          const itensProntos = todosItens.filter((i) => i.status === 'pronto')
          const subtotal = sessao.pedidos.reduce((a, p) => a + p.total, 0)
          const total    = subtotal + sessao.delivery_taxa

          const forma     = FORMA_LABEL[sessao.delivery_forma_pagamento] ?? { label: sessao.delivery_forma_pagamento, icon: Banknote }
          const FormaIcon = forma.icon
          const estaSaindo = sessao.delivery_status === 'saiu_entrega'
          const atualizandoEsta = atualizando.has(sessao.id)

          const enderecoFormatado = [
            sessao.delivery_endereco,
            sessao.delivery_numero,
            sessao.delivery_complemento,
          ].filter(Boolean).join(', ')

          const cidadeFormatada = [sessao.delivery_bairro, sessao.delivery_cidade].filter(Boolean).join(' — ')

          return (
            <div
              key={sessao.id}
              className={`rounded-2xl border overflow-hidden ${STATUS_COR[sessao.delivery_status] || 'bg-slate-800 border-slate-700'}`}
            >
              {/* Cabeçalho do card */}
              <div className={`px-4 py-3 flex items-start justify-between gap-3 ${
                sessao.delivery_status === 'saiu_entrega'
                  ? 'bg-purple-600'
                  : 'bg-teal-600'
              }`}>
                <div>
                  <p className="font-black text-white text-lg leading-tight">{sessao.delivery_nome}</p>
                  <p className="text-white/70 text-xs flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {tempoAberto(sessao.aberta_em)} em espera
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white font-black text-lg">{fmt(total)}</p>
                  <div className="flex items-center gap-1 justify-end mt-0.5">
                    <FormaIcon className="w-3 h-3 text-white/70" />
                    <span className="text-white/70 text-xs">{forma.label}</span>
                  </div>
                </div>
              </div>

              {/* Corpo */}
              <div className="bg-white p-4 space-y-4">

                {/* Endereço */}
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{enderecoFormatado}</p>
                    {cidadeFormatada && <p className="text-xs text-slate-500">{cidadeFormatada}</p>}
                    {sessao.delivery_distancia_km && (
                      <p className="text-xs text-slate-400">{sessao.delivery_distancia_km} km do restaurante</p>
                    )}
                  </div>
                </div>

                {/* Contato */}
                <div className="flex items-center gap-3">
                  <a
                    href={`tel:${sessao.delivery_telefone}`}
                    className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-800 font-medium"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {sessao.delivery_telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
                  </a>
                  <a
                    href={`https://wa.me/55${sessao.delivery_telefone}`}
                    target="_blank"
                    className="text-xs text-green-600 hover:underline flex items-center gap-0.5"
                  >
                    WhatsApp <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Itens prontos */}
                <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                    {itensProntos.length} iten(s) pronto(s)
                  </p>
                  {itensProntos.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-slate-700">
                        {item.quantidade}× {item.item_nome}
                        {item.observacao && (
                          <span className="text-slate-400"> · {item.observacao}</span>
                        )}
                      </span>
                      <span className="text-slate-500 ml-2 shrink-0">
                        {fmt(item.item_preco * item.quantidade)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-slate-200 mt-2 pt-2 space-y-0.5">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Subtotal</span>
                      <span>{fmt(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Taxa de entrega</span>
                      <span>{fmt(sessao.delivery_taxa)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-800 text-sm pt-1 border-t border-slate-200 mt-1">
                      <span>Total</span>
                      <span>{fmt(total)}</span>
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-2 pt-1">
                  {!estaSaindo && (
                    <button
                      onClick={() => acao(sessao.id, 'saiu_entrega')}
                      disabled={atualizandoEsta}
                      className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      {atualizandoEsta
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Truck className="w-4 h-4" />}
                      Saiu para entrega
                    </button>
                  )}
                  <button
                    onClick={() => acao(sessao.id, 'entregue')}
                    disabled={atualizandoEsta}
                    className="flex-1 flex items-center justify-center gap-2 bg-teal-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-teal-700 transition-colors disabled:opacity-50"
                  >
                    {atualizandoEsta
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <CheckCircle2 className="w-4 h-4" />}
                    {estaSaindo ? 'Confirmar entrega' : 'Marcar entregue'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}

      </div>
    </div>
  )
}
