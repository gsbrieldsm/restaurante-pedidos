'use client'

import { useState, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Users, Search, Phone, TableProperties, Clock, Loader2, Trophy, ShoppingBag, X, ChevronRight, Receipt } from 'lucide-react'
import { PainelHero } from '@/components/admin/PainelHero'

interface Sessao {
  id: string
  cliente_nome: string
  cliente_whatsapp: string | null
  aberta_em: string
  fechada_em: string | null
  ativa: boolean
  mesas: { numero: number } | null
}

interface ClienteAgregado {
  chave: string
  cliente_nome: string
  cliente_whatsapp: string | null
  total_consumido: number
  total_pedidos: number
  ultimo_pedido_em: string
}

interface PedidoHistorico {
  id: string
  criado_em: string
  total: number
  status_geral: string
  mesa_numero: number
  observacao_geral: string | null
  pedido_itens: {
    id: string
    item_nome: string
    quantidade: number
    item_preco: number
    status: string
    estacao: string
    observacao: string | null
  }[]
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatarDataCurta(iso: string) {
  const d = new Date(iso)
  const hoje = new Date()
  const diff = Math.floor((hoje.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Ontem'
  if (diff < 7) return `${diff} dias atrás`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatarReal(v: number) {
  return `R$ ${v.toFixed(2).replace('.', ',')}`
}

function formatarCelular(raw: string | null) {
  if (!raw) return null
  const n = raw.replace(/\D/g, '')
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
  return raw
}

const MEDALHA = ['🥇', '🥈', '🥉']

const COR_POSICAO: Record<number, string> = {
  0: 'border-yellow-300 bg-yellow-50',
  1: 'border-slate-300 bg-slate-50',
  2: 'border-orange-200 bg-orange-50',
}

export default function ClientesPage() {
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [clientes, setClientes] = useState<ClienteAgregado[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'ativos' | 'com_celular'>('todos')
  const [aba, setAba] = useState<'top' | 'historico'>('top')

  // — Painel histórico —
  const [clientePainel, setClientePainel] = useState<ClienteAgregado | null>(null)
  const [pedidosCliente, setPedidosCliente] = useState<PedidoHistorico[]>([])
  const [loadingPainel, setLoadingPainel] = useState(false)

  useEffect(() => {
    fetch('/api/admin/clientes')
      .then((r) => r.json())
      .then(({ sessoes, clientes }) => {
        setSessoes(sessoes ?? [])
        setClientes(clientes ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  const sessoesFiltradas = useMemo(() => {
    let lista = sessoes
    if (filtro === 'ativos') lista = lista.filter((s) => s.ativa)
    if (filtro === 'com_celular') lista = lista.filter((s) => !!s.cliente_whatsapp)
    if (busca.trim()) {
      const q = busca.toLowerCase()
      lista = lista.filter(
        (s) =>
          s.cliente_nome.toLowerCase().includes(q) ||
          s.cliente_whatsapp?.includes(q) ||
          String(s.mesas?.numero).includes(q)
      )
    }
    return lista
  }, [sessoes, busca, filtro])

  const clientesFiltrados = useMemo(() => {
    if (!busca.trim()) return clientes
    const q = busca.toLowerCase()
    return clientes.filter(
      (c) =>
        c.cliente_nome.toLowerCase().includes(q) ||
        c.cliente_whatsapp?.includes(q)
    )
  }, [clientes, busca])

  async function abrirHistorico(cliente: ClienteAgregado) {
    setClientePainel(cliente)
    setLoadingPainel(true)
    setPedidosCliente([])
    const res = await fetch(`/api/admin/clientes/historico?chave=${encodeURIComponent(cliente.chave)}`)
    const data = await res.json()
    setPedidosCliente(data.pedidos ?? [])
    setLoadingPainel(false)
  }

  const totais = {
    total: sessoes.length,
    ativos: sessoes.filter((s) => s.ativa).length,
    comCelular: sessoes.filter((s) => !!s.cliente_whatsapp).length,
    unicos: clientes.length,
    receitaTotal: clientes.reduce((acc, c) => acc + c.total_consumido, 0),
  }

  const ticketMedioCliente = totais.unicos > 0
    ? formatarReal(totais.receitaTotal / totais.unicos)
    : 'R$ 0,00'
  const pctComCelular = totais.total > 0
    ? Math.round((totais.comCelular / totais.total) * 100)
    : 0

  return (
    <div className="p-6 space-y-6">
      <PainelHero
        secao="CLIENTES"
        titulo="Base de clientes"
        metricaLabel="Receita acumulada"
        metricaValor={formatarReal(totais.receitaTotal)}
        loading={loading}
        kpis={[
          { label: 'Clientes únicos',      value: totais.unicos,         destaque: true },
          { label: 'Acessos totais',       value: totais.total                          },
          { label: 'Comandas ativas agora', value: totais.ativos,         alerta: totais.ativos > 0 },
          { label: 'Ticket médio/cliente', value: ticketMedioCliente                    },
          { label: 'Receita total',        value: formatarReal(totais.receitaTotal), destaque: true },
        ]}
      />

      {/* Abas */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setAba('top')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            aba === 'top' ? 'bg-white shadow-sm text-teal-700' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Trophy className="w-4 h-4" /> Top Clientes
        </button>
        <button
          onClick={() => setAba('historico')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            aba === 'historico' ? 'bg-white shadow-sm text-teal-700' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" /> Histórico de Acessos
        </button>
      </div>

      {/* Busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder={aba === 'top' ? 'Buscar por nome ou celular...' : 'Buscar por nome, celular ou mesa...'}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        {aba === 'historico' && (
          <div className="flex gap-2">
            {([
              { key: 'todos',       label: 'Todos'       },
              { key: 'ativos',      label: 'Ativos'      },
              { key: 'com_celular', label: 'Com celular' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFiltro(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filtro === key
                    ? 'bg-teal-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
        </div>
      ) : aba === 'top' ? (
        /* ─── TOP CLIENTES ─── */
        <div className="space-y-3">
          {clientesFiltrados.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-teal-200" />
              <p className="font-medium">Nenhum cliente com pedido ainda</p>
            </div>
          ) : (
            clientesFiltrados.map((c, idx) => (
              <div
                key={c.chave}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 ${
                  COR_POSICAO[idx] ?? 'border-slate-100 bg-white'
                }`}
              >
                {/* Posição */}
                <div className="w-10 text-center shrink-0">
                  {idx < 3 ? (
                    <span className="text-2xl">{MEDALHA[idx]}</span>
                  ) : (
                    <span className="text-lg font-black text-slate-400">#{idx + 1}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                  <span className="text-teal-700 font-bold text-base">
                    {c.cliente_nome.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 truncate">{c.cliente_nome}</p>
                  {c.cliente_whatsapp ? (
                    <a
                      href={`https://wa.me/55${c.cliente_whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-green-600 hover:underline w-fit"
                    >
                      <Phone className="w-3 h-3" />
                      {formatarCelular(c.cliente_whatsapp)}
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">Sem celular</span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-center">
                    <p className="text-xs text-slate-400 mb-0.5">Pedidos</p>
                    <div className="flex items-center gap-1 justify-center">
                      <ShoppingBag className="w-3.5 h-3.5 text-teal-500" />
                      <span className="font-bold text-slate-700">{c.total_pedidos}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400 mb-0.5">Último pedido</p>
                    <span className="text-xs font-medium text-slate-600">
                      {formatarDataCurta(c.ultimo_pedido_em)}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 mb-0.5">Total consumido</p>
                    <span className="text-lg font-black text-teal-700">
                      {formatarReal(c.total_consumido)}
                    </span>
                  </div>
                  <button
                    onClick={() => abrirHistorico(c)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-teal-100 flex items-center justify-center transition-colors shrink-0"
                    title="Ver pedidos"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-400 hover:text-teal-600" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* ─── HISTÓRICO DE ACESSOS ─── */
        sessoesFiltradas.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-3 text-teal-200" />
            <p className="font-medium">Nenhum acesso encontrado</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <div className="col-span-4">Cliente</div>
              <div className="col-span-3">Celular</div>
              <div className="col-span-2 text-center">Mesa</div>
              <div className="col-span-2">Entrada</div>
              <div className="col-span-1 text-center">Status</div>
            </div>
            <div className="divide-y divide-slate-50">
              {sessoesFiltradas.map((s) => (
                <div key={s.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-slate-50 transition-colors">
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                      <span className="text-teal-700 font-bold text-sm">
                        {s.cliente_nome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-slate-800 text-sm truncate">{s.cliente_nome}</span>
                  </div>
                  <div className="col-span-3">
                    {s.cliente_whatsapp ? (
                      <a
                        href={`https://wa.me/55${s.cliente_whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-green-600 hover:underline"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {formatarCelular(s.cliente_whatsapp)}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </div>
                  <div className="col-span-2 flex justify-center">
                    {s.mesas ? (
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <TableProperties className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold">{s.mesas.numero}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </div>
                  <div className="col-span-2 flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                    {formatarData(s.aberta_em)}
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Badge
                      variant="outline"
                      className={s.ativa
                        ? 'border-green-400 text-green-700 bg-green-50 text-xs'
                        : 'border-slate-300 text-slate-400 text-xs'
                      }
                    >
                      {s.ativa ? 'Ativo' : 'Saiu'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-400">
              {sessoesFiltradas.length} registro{sessoesFiltradas.length !== 1 ? 's' : ''} exibido{sessoesFiltradas.length !== 1 ? 's' : ''}
            </div>
          </div>
        )
      )}
      {/* ── Painel histórico de pedidos ── */}
      {clientePainel && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setClientePainel(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative ml-auto w-full max-w-lg bg-white flex flex-col shadow-2xl h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="shrink-0 flex items-center gap-4 px-6 py-5 border-b border-slate-100"
              style={{ background: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 50%, #1A9B8A 100%)' }}>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <span className="text-white font-black text-xl">
                  {clientePainel.cliente_nome.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-lg leading-tight truncate">{clientePainel.cliente_nome}</p>
                {clientePainel.cliente_whatsapp ? (
                  <a
                    href={`https://wa.me/55${clientePainel.cliente_whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-300 text-sm hover:text-white transition-colors"
                  >
                    {formatarCelular(clientePainel.cliente_whatsapp)}
                  </a>
                ) : (
                  <p className="text-teal-400 text-sm">Sem celular</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-teal-300 text-xs">Total consumido</p>
                <p className="text-white font-black text-lg">{formatarReal(clientePainel.total_consumido)}</p>
                <p className="text-teal-400 text-xs">{clientePainel.total_pedidos} pedido{clientePainel.total_pedidos !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setClientePainel(null)} className="text-white/60 hover:text-white p-1 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista de pedidos */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {loadingPainel ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                </div>
              ) : pedidosCliente.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                  <Receipt className="w-12 h-12 text-slate-200" />
                  <p className="font-medium">Nenhum pedido encontrado</p>
                </div>
              ) : (
                pedidosCliente.map((pedido, idx) => (
                  <div key={pedido.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    {/* Cabeçalho do pedido */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <TableProperties className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm font-semibold text-slate-700">Mesa {pedido.mesa_numero}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-400">{formatarData(pedido.criado_em)}</span>
                      </div>
                      <span className="text-sm font-black text-teal-700">{formatarReal(pedido.total)}</span>
                    </div>

                    {/* Itens */}
                    <div className="divide-y divide-slate-50">
                      {pedido.pedido_itens.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                          <span className="text-base shrink-0">
                            {{ cozinha: '🍳', bar: '🍺', drinks: '🍹', chopeira: '🍻' }[item.estacao] ?? '🍽️'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800">
                              {item.quantidade}× {item.item_nome}
                            </p>
                            {item.observacao && (
                              <p className="text-xs text-orange-600">⚠️ {item.observacao}</p>
                            )}
                          </div>
                          <span className="text-sm text-slate-500 shrink-0">
                            {formatarReal(item.item_preco * item.quantidade)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Observação geral */}
                    {pedido.observacao_geral && (
                      <div className="px-4 py-2 bg-orange-50 border-t border-orange-100">
                        <p className="text-xs text-orange-700">⚠️ {pedido.observacao_geral}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
