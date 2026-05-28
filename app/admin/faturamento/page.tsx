'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { Banknote, QrCode, CreditCard, Wallet } from 'lucide-react'
import { PainelHero } from '@/components/admin/PainelHero'

const CORES_GRAFICO = ['#1A9B8A', '#F05A4F', '#7c3aed', '#d97706', '#059669', '#0891b2']

const FORMAS_CONFIG = {
  dinheiro: { label: 'Dinheiro', icon: Banknote,   cor: '#16a34a', bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-300' },
  pix:      { label: 'Pix',      icon: QrCode,     cor: '#0d9488', bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-300'  },
  debito:   { label: 'Débito',   icon: CreditCard, cor: '#2563eb', bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-300'  },
  credito:  { label: 'Crédito',  icon: CreditCard, cor: '#7c3aed', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300' },
} as const

type FormaPagamento = keyof typeof FORMAS_CONFIG

interface Pagamento {
  forma: FormaPagamento
  valor: number
  criado_em: string
  mesa_numero: number
  cliente_nome: string
}

export default function FaturamentoPage() {
  const [periodo, setPeriodo] = useState<'hoje' | 'semana' | 'mes'>('hoje')
  const [aba, setAba] = useState<'resumo' | 'pagamentos'>('resumo')
  const [dados, setDados] = useState({
    total: 0, totalPedidos: 0, ticketMedio: 0, totalItens: 0,
  })
  const [porCategoria, setPorCategoria] = useState<any[]>([])
  const [porHora, setPorHora] = useState<any[]>([])
  const [itensMaisVendidos, setItensMaisVendidos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pagamentos,      setPagamentos]      = useState<Pagamento[]>([])
  const [totaisPagamentos, setTotaisPagamentos] = useState<Record<string, number>>({})
  const [totalPagamentos,  setTotalPagamentos]  = useState(0)
  const [recargas,         setRecargas]         = useState<any[]>([])
  const [totalRecargas,    setTotalRecargas]     = useState(0)

  useEffect(() => {
    async function buscar() {
      setLoading(true)
      const supabase = createClient()

      const agora = new Date()
      let dataInicio = new Date()
      if (periodo === 'hoje') dataInicio.setHours(0, 0, 0, 0)
      else if (periodo === 'semana') {
        dataInicio.setDate(agora.getDate() - 7)
        dataInicio.setHours(0, 0, 0, 0)
      } else {
        dataInicio.setDate(1)
        dataInicio.setHours(0, 0, 0, 0)
      }

      // Pedidos
      const { data: pedidosRaw } = await supabase
        .from('pedidos')
        .select('total, criado_em')
        .gte('criado_em', dataInicio.toISOString())
        .neq('status_geral', 'cancelado')
      const pedidos = pedidosRaw as Array<{ total: number; criado_em: string }> | null

      const { data: itensPedidosRaw } = await supabase
        .from('pedido_itens')
        .select('item_nome, quantidade, item_preco, estacao, criado_em')
        .gte('criado_em', dataInicio.toISOString())
        .neq('status', 'cancelado')
      const itensPedidos = itensPedidosRaw as Array<{ item_nome: string; quantidade: number; item_preco: number; estacao: string; criado_em: string }> | null

      if (pedidos) {
        const totalFat = pedidos.reduce((a, p) => a + p.total, 0)
        setDados({
          total: totalFat,
          totalPedidos: pedidos.length,
          ticketMedio: pedidos.length ? totalFat / pedidos.length : 0,
          totalItens: itensPedidos?.reduce((a, i) => a + i.quantidade, 0) || 0,
        })

        // Por hora (só para hoje)
        if (periodo === 'hoje') {
          const porH: Record<number, number> = {}
          pedidos.forEach((p) => {
            const h = new Date(p.criado_em).getHours()
            porH[h] = (porH[h] || 0) + p.total
          })
          const horaData = Array.from({ length: 24 }, (_, h) => ({
            hora: `${h.toString().padStart(2, '0')}h`,
            faturamento: Math.round((porH[h] || 0) * 100) / 100,
          })).filter((_, h) => h >= 10 && h <= 23)
          setPorHora(horaData)
        }
      }

      if (itensPedidos) {
        // Por categoria (estação)
        const porCat: Record<string, number> = {}
        const porItem: Record<string, { nome: string; qtd: number; receita: number }> = {}

        itensPedidos.forEach((i) => {
          const cat = i.estacao
          porCat[cat] = (porCat[cat] || 0) + i.item_preco * i.quantidade
          if (!porItem[i.item_nome]) porItem[i.item_nome] = { nome: i.item_nome, qtd: 0, receita: 0 }
          porItem[i.item_nome].qtd += i.quantidade
          porItem[i.item_nome].receita += i.item_preco * i.quantidade
        })

        setPorCategoria(
          Object.entries(porCat).map(([nome, valor]) => ({
            name: nome.charAt(0).toUpperCase() + nome.slice(1),
            valor: Math.round(valor * 100) / 100,
          }))
        )

        setItensMaisVendidos(
          Object.values(porItem)
            .sort((a, b) => b.qtd - a.qtd)
            .slice(0, 10)
        )
      }

      // Pagamentos por forma + recargas de saldo
      const resPag = await fetch(`/api/admin/pagamentos?periodo=${periodo}`)
      const dataPag = await resPag.json()
      setPagamentos(dataPag.pagamentos ?? [])
      setTotaisPagamentos(dataPag.totais ?? {})
      setTotalPagamentos(dataPag.total_geral ?? 0)
      setRecargas(dataPag.recargas ?? [])
      setTotalRecargas(dataPag.total_recargas ?? 0)

      setLoading(false)
    }

    buscar()
  }, [periodo])

  const formatarReal = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const periodoLabel = periodo === 'hoje' ? 'Hoje' : periodo === 'semana' ? 'Últimos 7 dias' : 'Este mês'

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PainelHero
        secao="FINANCEIRO"
        titulo={periodoLabel}
        metricaLabel="Total do período"
        metricaValor={formatarReal(dados.total)}
        loading={loading}
        kpis={[
          { label: 'Faturamento',   value: formatarReal(dados.total),               destaque: true },
          { label: 'Pedidos',       value: dados.totalPedidos                                      },
          { label: 'Ticket médio',  value: formatarReal(dados.ticketMedio)                         },
          { label: 'Itens vendidos',value: dados.totalItens                                        },
        ]}
      />

      {/* Controles: período + abas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {(['hoje', 'semana', 'mes'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                periodo === p ? 'bg-white shadow text-slate-800' : 'text-slate-500'
              }`}
            >
              {p === 'hoje' ? 'Hoje' : p === 'semana' ? '7 dias' : 'Mês'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          <button onClick={() => setAba('resumo')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${aba === 'resumo' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Resumo</button>
          <button onClick={() => setAba('pagamentos')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${aba === 'pagamentos' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Pagamentos</button>
        </div>
      </div>

      {aba === 'pagamentos' ? (
        /* ── ABA PAGAMENTOS ── */
        <div className="space-y-6">
          {/* Card saldo pré-pago (só aparece se tiver recargas) */}
          {totalRecargas > 0 && (
            <div className="rounded-2xl border-2 border-teal-300 bg-teal-50 p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
                  <Wallet className="w-6 h-6 text-teal-700" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-teal-600 mb-0.5">Saldo pré-pago carregado</p>
                  <p className="text-2xl font-black text-teal-700">{formatarReal(totalRecargas)}</p>
                  <p className="text-xs text-teal-600 mt-0.5">{recargas.length} recarga{recargas.length !== 1 ? 's' : ''} no período</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-teal-500">dinheiro recebido</p>
                <p className="text-xs text-teal-500">antes do consumo</p>
              </div>
            </div>
          )}

          {/* Cards por forma */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(Object.keys(FORMAS_CONFIG) as FormaPagamento[]).map((forma) => {
              const cfg = FORMAS_CONFIG[forma]
              const valor = totaisPagamentos[forma] ?? 0
              const pct = totalPagamentos > 0 ? Math.round((valor / totalPagamentos) * 100) : 0
              return (
                <Card key={forma} className={`border-2 ${cfg.border}`}>
                  <CardContent className="pt-4 pb-4">
                    <div className={`inline-flex p-2 rounded-lg ${cfg.bg} mb-3`}>
                      <cfg.icon className={`w-5 h-5 ${cfg.text}`} />
                    </div>
                    <p className={`text-xl font-black ${cfg.text}`}>{formatarReal(valor)}</p>
                    <p className="text-sm text-slate-500">{cfg.label}</p>
                    <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: cfg.cor }} />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{pct}% do total</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Gráfico pizza formas */}
          {totalPagamentos > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuição por Forma de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={(Object.keys(FORMAS_CONFIG) as FormaPagamento[])
                        .filter((f) => (totaisPagamentos[f] ?? 0) > 0)
                        .map((f) => ({ name: FORMAS_CONFIG[f].label, valor: totaisPagamentos[f] ?? 0, fill: FORMAS_CONFIG[f].cor }))}
                      dataKey="valor"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }: { name?: string; percent?: number }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {(Object.keys(FORMAS_CONFIG) as FormaPagamento[])
                        .filter((f) => (totaisPagamentos[f] ?? 0) > 0)
                        .map((f) => <Cell key={f} fill={FORMAS_CONFIG[f].cor} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatarReal(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Histórico de recargas de saldo */}
          {recargas.length > 0 && (
            <Card className="border-teal-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-teal-600" />
                  Recargas de Saldo Pré-pago
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-slate-50">
                  {recargas.map((r: any) => {
                    const formaEmoji: Record<string, string> = {
                      dinheiro: '💵', pix: '📲', debito: '💳', credito: '💳',
                    }
                    const formaLabel: Record<string, string> = {
                      dinheiro: 'Dinheiro', pix: 'Pix', debito: 'Débito', credito: 'Crédito',
                    }
                    return (
                      <div key={r.id} className="flex items-center gap-3 py-3">
                        <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center shrink-0 text-sm font-black text-teal-700">
                          {r.nome ? r.nome[0].toUpperCase() : '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">
                            {r.nome ?? 'Cliente'}{r.telefone ? ` · ${r.telefone}` : ''}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(r.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            {r.forma_pagamento && (
                              <span className="ml-2 inline-flex items-center gap-0.5">
                                {formaEmoji[r.forma_pagamento] ?? '💳'} {formaLabel[r.forma_pagamento] ?? r.forma_pagamento}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-sm text-teal-700">+{formatarReal(r.valor)}</p>
                          <p className="text-xs text-slate-400">Recarga</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Histórico de pagamentos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de Fechamentos</CardTitle>
            </CardHeader>
            <CardContent>
              {pagamentos.length === 0 ? (
                <p className="text-center text-slate-400 py-6">Nenhum pagamento registrado no período.</p>
              ) : (
                <div className="divide-y divide-slate-50">
                  {pagamentos.map((p, i) => {
                    const cfg = FORMAS_CONFIG[p.forma]
                    return (
                      <div key={i} className="flex items-center gap-3 py-3">
                        <div className={`p-2 rounded-lg ${cfg.bg} shrink-0`}>
                          <cfg.icon className={`w-4 h-4 ${cfg.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">{p.cliente_nome} — Mesa {p.mesa_numero}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(p.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-bold text-sm ${cfg.text}`}>{formatarReal(p.valor)}</p>
                          <p className="text-xs text-slate-400">{cfg.label}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
      /* ── ABA RESUMO ── */
      <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Faturamento por hora */}
        {periodo === 'hoje' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Faturamento por Hora</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={porHora} margin={{ left: -15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="hora" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip formatter={(v) => formatarReal(Number(v))} />
                  <Bar dataKey="faturamento" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Por estação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por Estação</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={porCategoria}
                  dataKey="valor"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {porCategoria.map((_, i) => (
                    <Cell key={i} fill={CORES_GRAFICO[i % CORES_GRAFICO.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatarReal(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Itens mais vendidos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Itens Mais Vendidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {itensMaisVendidos.map((item, i) => (
              <div key={item.nome} className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-400 w-5">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{item.nome}</span>
                    <div className="flex gap-4 text-slate-500">
                      <span>{item.qtd} un.</span>
                      <span className="font-semibold text-slate-700">{formatarReal(item.receita)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full"
                      style={{ width: `${(item.qtd / itensMaisVendidos[0].qtd) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </div>
      )}
    </div>
  )
}
