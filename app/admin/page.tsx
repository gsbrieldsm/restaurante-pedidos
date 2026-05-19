'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
  RefreshCw, XCircle, Loader2, AlertTriangle,
  ConciergeBell, Banknote, QrCode, CreditCard, CheckCircle2
} from 'lucide-react'
import type { ViewMesaStatus, Pedido, PedidoItem } from '@/lib/supabase/types'

type FormaPagamento = 'dinheiro' | 'pix' | 'debito' | 'credito'

const FORMAS: { key: FormaPagamento; label: string; icon: React.ElementType; cor: string }[] = [
  { key: 'dinheiro', label: 'Dinheiro', icon: Banknote,    cor: 'border-green-400 bg-green-50 text-green-700'  },
  { key: 'pix',      label: 'Pix',      icon: QrCode,      cor: 'border-teal-400 bg-teal-50 text-teal-700'    },
  { key: 'debito',   label: 'Débito',   icon: CreditCard,  cor: 'border-blue-400 bg-blue-50 text-blue-700'    },
  { key: 'credito',  label: 'Crédito',  icon: CreditCard,  cor: 'border-purple-400 bg-purple-50 text-purple-700' },
]

const STATUS_MESA_CONFIG = {
  livre:                { label: 'Livre',     cor: 'bg-slate-100 border-slate-200' },
  ocupada:              { label: 'Ocupada',   cor: 'bg-teal-50 border-teal-200'   },
  aguardando_pagamento: { label: 'Pagamento', cor: 'bg-purple-50 border-purple-200' },
} as const

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
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

export default function AdminDashboard() {
  const [mesas, setMesas] = useState<ViewMesaStatus[]>([])
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [fechandoMesa, setFechandoMesa] = useState<string | null>(null)
  const [mesaSelecionada, setMesaSelecionada] = useState<ViewMesaStatus | null>(null)
  const [pedidosMesa, setPedidosMesa] = useState<PedidoComItens[]>([])
  const [loadingModal, setLoadingModal] = useState(false)
  const [etapaPagamento, setEtapaPagamento] = useState(false)
  const [formaSelecionada, setFormaSelecionada] = useState<FormaPagamento | null>(null)
  const [fechando, setFechando] = useState(false)

  const buscarTudo = useCallback(async () => {
    const [resMesas, resOverview] = await Promise.all([
      fetch('/api/admin/mesas'),
      fetch('/api/admin/overview'),
    ])
    const dataMesas = await resMesas.json()
    const dataOverview = await resOverview.json()
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, buscarTudo)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_itens' }, buscarTudo)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [buscarTudo])

  async function abrirMesa(mesa: ViewMesaStatus) {
    if (mesa.status === 'livre') return
    setMesaSelecionada(mesa)
    setEtapaPagamento(false)
    setFormaSelecionada(null)
    setLoadingModal(true)
    const resp = await fetch(`/api/admin/mesas/${mesa.id}`)
    const data = await resp.json()
    setPedidosMesa(data.pedidos || [])
    setLoadingModal(false)
  }

  function fecharMesa() {
    setEtapaPagamento(true)
    setFormaSelecionada(null)
  }

  async function confirmarPagamento() {
    if (!mesaSelecionada || !formaSelecionada) return
    setFechando(true)
    const total = pedidosMesa
      .flatMap((p) => p.pedido_itens)
      .reduce((acc, i) => acc + i.item_preco * i.quantidade, 0)

    try {
      const resp = await fetch('/api/admin/pagamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mesa_id: mesaSelecionada.id, forma: formaSelecionada, valor: total }),
      })

      const data = await resp.json()

      if (!resp.ok) {
        console.error('[confirmarPagamento] erro da API:', data)
        alert(`Erro ao registrar pagamento: ${data.error ?? resp.status}\nTente novamente.`)
        setFechando(false)
        return // mantém o modal aberto para nova tentativa
      }
    } catch (err) {
      console.error('[confirmarPagamento] erro de rede:', err)
      alert('Erro de conexão ao registrar pagamento. Tente novamente.')
      setFechando(false)
      return
    }

    setFechando(false)
    setMesaSelecionada(null)
    setEtapaPagamento(false)
    buscarTudo()
  }

  // KPIs do painel hero — atenção quando > 0
  const kpis = overview ? [
    { label: 'Mesas ocupadas',  value: overview.mesas_ocupadas,  alerta: false },
    { label: 'Pedidos ativos',  value: overview.pedidos_ativos,  alerta: overview.pedidos_ativos > 0 },
    { label: 'Aguardando',      value: overview.itens_aguardando,alerta: overview.itens_aguardando > 0 },
    { label: 'Em preparo',      value: overview.itens_em_preparo,alerta: false },
    { label: 'Prontos p/ entrega', value: overview.itens_prontos,alerta: overview.itens_prontos > 0 },
    { label: 'Pedidos hoje',    value: overview.pedidos_hoje,    alerta: false },
  ] : []

  const totalAcoes = overview
    ? overview.pedidos_ativos + overview.itens_aguardando + overview.itens_prontos
    : 0

  return (
    <div className="p-6 space-y-6">

      {/* ── Topo: data + receita ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest uppercase text-teal-600 mb-1">Visão ao Vivo</p>
          <h1 className="text-2xl font-bold text-slate-800 capitalize">{diaDaSemana()}</h1>
        </div>
        <div className="text-right flex items-start gap-4">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Receita do dia</p>
            <p className="text-2xl font-black text-teal-600">
              {overview ? formatarReal(overview.receita_hoje) : '—'}
            </p>
          </div>
          <Button onClick={buscarTudo} variant="outline" size="sm" className="gap-1.5 mt-1">
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* ── Painel Hero com gradiente ── */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 40%, #1A9B8A 100%)',
        }}
      >
        <div className="mb-5">
          <p className="text-xs font-bold tracking-widest uppercase text-teal-400">PAINEL AGORA</p>
          <p className="text-white/70 text-sm mt-0.5">
            {totalAcoes > 0 ? `${totalAcoes} ações precisam de atenção` : 'Tudo tranquilo no momento'}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {kpis.map(({ label, value, alerta }) => (
              <div
                key={label}
                className="rounded-xl px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <p
                  className="text-3xl font-black leading-none mb-1"
                  style={{ color: alerta && value > 0 ? '#F05A4F' : 'white' }}
                >
                  {value}
                </p>
                <p className="text-xs text-white/50 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Estações + Garçom ── */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Estações & Operação</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { nome: 'cozinha',  emoji: '🍳', label: 'Cozinha',  grad: 'linear-gradient(135deg, #0f4d44, #1A9B8A)' },
            { nome: 'bar',      emoji: '🍺', label: 'Bar',      grad: 'linear-gradient(135deg, #0a3d36, #147a6c)' },
            { nome: 'drinks',   emoji: '🍹', label: 'Drinks',   grad: 'linear-gradient(135deg, #3b1f6b, #7c3aed)' },
            { nome: 'chopeira', emoji: '🍻', label: 'Chopeira', grad: 'linear-gradient(135deg, #7c4a00, #d97706)' },
          ].map((e) => (
            <a
              key={e.nome}
              href={`/estacao/${e.nome}`}
              target="_blank"
              className="text-white rounded-xl p-4 flex items-center gap-3 hover:opacity-90 transition-opacity"
              style={{ background: e.grad }}
            >
              <span className="text-2xl">{e.emoji}</span>
              <span className="font-bold">{e.label}</span>
            </a>
          ))}
          <a
            href="/garcom"
            target="_blank"
            className="text-white rounded-xl p-4 flex items-center gap-3 hover:opacity-90 transition-opacity relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #c0392b, #F05A4F)' }}
          >
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

      {/* ── Grid de mesas ── */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Mesas</h2>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-28 bg-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {mesas.map((mesa) => {
              const config = STATUS_MESA_CONFIG[mesa.status]
              const temPedidoAtivo = (mesa.pedidos_ativos || 0) > 0
              const clicavel = mesa.status !== 'livre'
              return (
                <Card
                  key={mesa.id}
                  onClick={() => abrirMesa(mesa)}
                  className={`${config.cor} border-2 transition-all ${
                    temPedidoAtivo ? 'ring-2 ring-teal-500 ring-offset-1' : ''
                  } ${clicavel ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <span className="text-xl font-black text-slate-700">{mesa.numero}</span>
                      <Badge
                        variant={mesa.status === 'livre' ? 'secondary' : 'default'}
                        className={`text-xs ${mesa.status === 'ocupada' ? 'bg-teal-600' : ''}`}
                      >
                        {config.label}
                      </Badge>
                    </div>
                    {mesa.cliente_nome && (
                      <p className="text-xs font-medium text-slate-600 mt-2 truncate">{mesa.cliente_nome}</p>
                    )}
                    {temPedidoAtivo && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-teal-700">
                        <AlertTriangle className="w-3 h-3" />
                        {mesa.pedidos_ativos} pedido(s) ativo(s)
                      </div>
                    )}
                    {mesa.aberta_em && (
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(mesa.aberta_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    {clicavel && (
                      <p className="text-xs text-teal-600 font-medium mt-2">Ver detalhes →</p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modal detalhes da mesa ── */}
      <Dialog open={!!mesaSelecionada} onOpenChange={(open) => { if (!open) { setMesaSelecionada(null); setEtapaPagamento(false) } }}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-2xl font-black text-teal-700">Mesa {mesaSelecionada?.numero}</span>
              <span className="text-base font-normal text-slate-500">{mesaSelecionada?.cliente_nome}</span>
              {mesaSelecionada?.aberta_em && (
                <span className="text-xs text-slate-400 ml-auto">
                  desde {new Date(mesaSelecionada.aberta_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {etapaPagamento ? (
            /* ── Etapa 2: Forma de pagamento ── */
            <div className="space-y-5 mt-2">
              <div className="text-center pb-2 border-b border-slate-100">
                <p className="text-xs text-slate-400 mb-1">Total a pagar</p>
                <p className="text-3xl font-black text-teal-700">
                  R$ {pedidosMesa.flatMap((p) => p.pedido_itens)
                    .reduce((acc, i) => acc + i.item_preco * i.quantidade, 0)
                    .toFixed(2).replace('.', ',')}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-600 mb-3">Como o cliente vai pagar?</p>
                <div className="grid grid-cols-2 gap-3">
                  {FORMAS.map(({ key, label, icon: Icon, cor }) => (
                    <button
                      key={key}
                      onClick={() => setFormaSelecionada(key)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        formaSelecionada === key
                          ? cor
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className="font-semibold text-sm">{label}</span>
                      {formaSelecionada === key && (
                        <CheckCircle2 className="w-4 h-4 ml-auto shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setEtapaPagamento(false)}>
                  Voltar
                </Button>
                <Button
                  onClick={confirmarPagamento}
                  disabled={!formaSelecionada || fechando}
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                >
                  {fechando
                    ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Confirmar e fechar
                </Button>
              </div>
            </div>
          ) : (
            /* ── Etapa 1: Detalhes dos pedidos ── */
            <>
              <div className="flex-1 overflow-y-auto space-y-4 mt-2">
                {loadingModal ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                  </div>
                ) : pedidosMesa.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">Nenhum pedido ativo nesta mesa.</p>
                ) : (
                  pedidosMesa.map((pedido, idx) => {
                    const total = pedido.pedido_itens.reduce((acc, i) => acc + i.item_preco * i.quantidade, 0)
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
                          <span className="text-sm font-bold text-teal-700">R$ {total.toFixed(2).replace('.', ',')}</span>
                        </div>
                      </div>
                    )
                  })
                )}
                {pedidosMesa.length > 1 && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center px-1">
                      <span className="font-bold text-slate-700">Total da mesa</span>
                      <span className="text-lg font-black text-teal-700">
                        R$ {pedidosMesa.flatMap((p) => p.pedido_itens)
                          .reduce((acc, i) => acc + i.item_preco * i.quantidade, 0)
                          .toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 mt-2">
                <Button onClick={fecharMesa} variant="destructive" className="w-full">
                  <XCircle className="w-4 h-4 mr-2" />
                  Fechar mesa
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
