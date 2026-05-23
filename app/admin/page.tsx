'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
  XCircle, Loader2, AlertTriangle,
  ConciergeBell, Banknote, QrCode, CreditCard, CheckCircle2, User, Clock,
  Globe, Copy, Check,
} from 'lucide-react'
import type { Pedido, PedidoItem } from '@/lib/supabase/types'

type FormaPagamento = 'dinheiro' | 'pix' | 'debito' | 'credito'

interface Comanda {
  id: string             // sessao_id
  cliente_nome: string
  cliente_whatsapp: string | null
  mesa_id: string
  mesa_numero: number
  criado_em: string
  pedidos_count: number
  itens_ativos: number
  total: number
}

interface MesaStatus {
  id: string
  numero: number
  status: 'livre' | 'ocupada' | 'aguardando_pagamento'
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

const ESTACAO_EMOJI: Record<string, string> = {
  cozinha: '🍳', bar: '🍺', drinks: '🍹', chopeira: '🍻',
}

type PedidoComItens = Pedido & { pedido_itens: PedidoItem[] }

interface Overview {
  mesas_ocupadas: number
  mesas_livres: number
  pedidos_ativos: number
  itens_aguardando: number
  itens_em_preparo: number
  itens_prontos: number
  receita_hoje: number
  pedidos_hoje: number
}

function formatarReal(v: number) {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function diaDaSemana() {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function tempoAberto(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 60) return `${min}min`
  return `${Math.floor(min / 60)}h${min % 60 > 0 ? String(min % 60).padStart(2, '0') : ''}`
}

function CardSubdominio() {
  const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'menue.com.br'
  const [slug, setSlug]         = useState<string | null>(null)
  const [copiado, setCopiado]   = useState(false)

  useEffect(() => {
    // tenant_slug é cookie não-httpOnly, acessível via JS
    const match = document.cookie.match(/(?:^|;\s*)tenant_slug=([^;]+)/)
    if (match) setSlug(decodeURIComponent(match[1]))
  }, [])

  if (!slug) return null

  const url = `https://${slug}.${ROOT}`

  function copiar() {
    navigator.clipboard.writeText(url).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  return (
    <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-2xl px-4 py-3">
      <Globe className="w-5 h-5 text-teal-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-teal-600 font-semibold mb-0.5">Seu restaurante online</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-mono font-bold text-teal-800 hover:underline truncate block"
        >
          {url}
        </a>
      </div>
      <button
        onClick={copiar}
        className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white border border-teal-200 text-teal-700 hover:bg-teal-100 transition-colors"
      >
        {copiado ? <><Check className="w-3.5 h-3.5" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
      </button>
    </div>
  )
}

export default function AdminDashboard() {
  const [comandas, setComandas] = useState<Comanda[]>([])
  const [mesas, setMesas] = useState<MesaStatus[]>([])
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)

  const [comandaSelecionada, setComandaSelecionada] = useState<Comanda | null>(null)
  const [pedidosComanda, setPedidosComanda] = useState<PedidoComItens[]>([])
  const [loadingModal, setLoadingModal] = useState(false)
  const [etapaPagamento, setEtapaPagamento] = useState(false)
  const [formaSelecionada, setFormaSelecionada] = useState<FormaPagamento | null>(null)
  const [fechando, setFechando] = useState(false)

  const buscarTudo = useCallback(async () => {
    const [resComandas, resMesas, resOverview] = await Promise.all([
      fetch('/api/admin/comandas'),
      fetch('/api/admin/mesas'),
      fetch('/api/admin/overview'),
    ])
    const dataComandas = await resComandas.json()
    const dataMesas    = await resMesas.json()
    const dataOverview = await resOverview.json()
    setComandas(dataComandas.comandas || [])
    setMesas(dataMesas.mesas || [])
    setOverview(dataOverview)
    setLoading(false)
  }, [])

  useEffect(() => {
    buscarTudo()
    const supabase = createClient()
    const channel = supabase
      .channel('admin-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, buscarTudo)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessoes_mesa' }, buscarTudo)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_itens' }, buscarTudo)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [buscarTudo])

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

  function fecharComanda() {
    setEtapaPagamento(true)
    setFormaSelecionada(null)
  }

  async function confirmarPagamento() {
    if (!comandaSelecionada || !formaSelecionada) return
    setFechando(true)
    const total = pedidosComanda
      .flatMap((p) => p.pedido_itens)
      .reduce((acc, i) => acc + i.item_preco * i.quantidade, 0)

    try {
      const resp = await fetch('/api/admin/pagamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessao_id: comandaSelecionada.id, forma: formaSelecionada, valor: total }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        alert(`Erro ao registrar pagamento: ${data.error ?? resp.status}`)
        setFechando(false)
        return
      }
    } catch {
      alert('Erro de conexão. Tente novamente.')
      setFechando(false)
      return
    }

    setFechando(false)
    setComandaSelecionada(null)
    setEtapaPagamento(false)
    buscarTudo()
  }

  const kpis = overview ? [
    { label: 'Comandas abertas', value: comandas.length,             alerta: false },
    { label: 'Pedidos ativos',   value: overview.pedidos_ativos,     alerta: overview.pedidos_ativos > 0 },
    { label: 'Aguardando',       value: overview.itens_aguardando,   alerta: overview.itens_aguardando > 0 },
    { label: 'Em preparo',       value: overview.itens_em_preparo,   alerta: false },
    { label: 'Prontos p/ entrega', value: overview.itens_prontos,    alerta: overview.itens_prontos > 0 },
    { label: 'Pedidos hoje',     value: overview.pedidos_hoje,       alerta: false },
  ] : []

  const totalAcoes = overview
    ? overview.pedidos_ativos + overview.itens_aguardando + overview.itens_prontos
    : 0

  const totalComandas = pedidosComanda
    .flatMap((p) => p.pedido_itens)
    .reduce((acc, i) => acc + i.item_preco * i.quantidade, 0)

  return (
    <div className="p-6 space-y-6">

      {/* ── Topo ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest uppercase text-teal-600 mb-1">Visão ao Vivo</p>
          <h1 className="text-base font-bold text-slate-800 capitalize">{diaDaSemana()}</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400 mb-0.5">Receita do dia</p>
          <p className="text-lg md:text-2xl font-black text-teal-600 whitespace-nowrap">
            {overview ? formatarReal(overview.receita_hoje) : '—'}
          </p>
        </div>
      </div>

      {/* ── URL do restaurante ── */}
      <CardSubdominio />

      {/* ── Hero KPIs ── */}
      <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 40%, #1A9B8A 100%)' }}>
        <div className="mb-5">
          <p className="text-xs font-bold tracking-widest uppercase text-teal-400">PAINEL AGORA</p>
          <p className="text-white/70 text-sm mt-0.5">
            {totalAcoes > 0 ? `${totalAcoes} ações precisam de atenção` : 'Tudo tranquilo no momento'}
          </p>
        </div>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-teal-400" /></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {kpis.map(({ label, value, alerta }) => (
              <div key={label} className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <p className="text-3xl font-black leading-none mb-1" style={{ color: alerta && value > 0 ? '#F05A4F' : 'white' }}>
                  {value}
                </p>
                <p className="text-xs text-white/50 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Estações ── */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Estações & Operação</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { nome: 'cozinha',  emoji: '🍳', label: 'Cozinha',  grad: 'linear-gradient(135deg, #0f4d44, #1A9B8A)' },
            { nome: 'bar',      emoji: '🍺', label: 'Bar',      grad: 'linear-gradient(135deg, #0a3d36, #147a6c)' },
            { nome: 'drinks',   emoji: '🍹', label: 'Drinks',   grad: 'linear-gradient(135deg, #3b1f6b, #7c3aed)' },
            { nome: 'chopeira', emoji: '🍻', label: 'Chopeira', grad: 'linear-gradient(135deg, #7c4a00, #d97706)' },
          ].map((e) => (
            <a key={e.nome} href={`/estacao/${e.nome}`} target="_blank"
              className="text-white rounded-xl p-4 flex items-center gap-3 hover:opacity-90 transition-opacity"
              style={{ background: e.grad }}>
              <span className="text-2xl">{e.emoji}</span>
              <span className="font-bold">{e.label}</span>
            </a>
          ))}
          <a href="/garcom" target="_blank"
            className="text-white rounded-xl p-4 flex items-center gap-3 hover:opacity-90 transition-opacity relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #c0392b, #F05A4F)' }}>
            <ConciergeBell className="w-6 h-6 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold leading-tight">Garçom</p>
              {overview && overview.itens_prontos > 0 && (
                <p className="text-white/80 text-xs">{overview.itens_prontos} pronto{overview.itens_prontos > 1 ? 's' : ''}</p>
              )}
            </div>
            {overview && overview.itens_prontos > 0 && (
              <span className="absolute top-2 right-2 bg-white text-red-600 text-xs font-black rounded-full w-5 h-5 flex items-center justify-center">
                {overview.itens_prontos}
              </span>
            )}
          </a>
        </div>
      </div>

      {/* ── Comandas abertas ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Comandas abertas</h2>
          {!loading && (
            <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {comandas.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : comandas.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
            <p className="text-slate-400 font-medium">Nenhuma comanda aberta no momento</p>
            <p className="text-slate-300 text-sm mt-1">Quando um cliente bipar um QR code, a comanda aparece aqui</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {comandas.map((comanda) => (
              <Card
                key={comanda.id}
                onClick={() => abrirComanda(comanda)}
                className={`cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all border-2 ${
                  comanda.itens_ativos > 0 ? 'border-teal-300 bg-teal-50/50' : 'border-slate-200 bg-white'
                }`}
              >
                <CardContent className="p-4">
                  {/* Mesa badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="bg-teal-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                      Mesa {comanda.mesa_numero}
                    </span>
                    {comanda.itens_ativos > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-amber-600 font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        {comanda.itens_ativos}
                      </span>
                    )}
                  </div>

                  {/* Nome */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <p className="font-bold text-slate-800 text-sm truncate">{comanda.cliente_nome}</p>
                  </div>

                  {/* Tempo + total */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                    <Clock className="w-3 h-3" />
                    {tempoAberto(comanda.criado_em)}
                    {comanda.pedidos_count > 0 && (
                      <span className="ml-1">· {comanda.pedidos_count} pedido{comanda.pedidos_count > 1 ? 's' : ''}</span>
                    )}
                  </div>

                  {/* Total */}
                  <p className="text-base font-black text-teal-700">
                    {formatarReal(comanda.total)}
                  </p>

                  <p className="text-xs text-teal-600 font-medium mt-1">Ver detalhes →</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Mesas ocupadas (mini pills) ── */}
      {!loading && mesas.filter((m) => m.status !== 'livre').length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Mesas ocupadas
          </h2>
          <div className="flex flex-wrap gap-2">
            {mesas
              .filter((m) => m.status !== 'livre')
              .sort((a, b) => a.numero - b.numero)
              .map((mesa) => (
                <div
                  key={mesa.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border bg-teal-50 border-teal-300 text-teal-700"
                >
                  <span className="font-bold">{mesa.numero}</span>
                  <span className="text-xs opacity-70">ocupada</span>
                </div>
              ))}
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
                <p className="text-3xl font-black text-teal-700">{formatarReal(totalComandas)}</p>
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
              <div className="flex-1 overflow-y-auto space-y-4 mt-2">
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
                      <span className="text-lg font-black text-teal-700">{formatarReal(totalComandas)}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="pt-3 border-t border-slate-100 mt-2">
                <Button onClick={fecharComanda} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                  <XCircle className="w-4 h-4 mr-2" /> Fechar comanda
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
