'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, Legend,
} from 'recharts'
import { Clock, TrendingUp, AlertTriangle, ShoppingCart, DollarSign, Package, Search, X } from 'lucide-react'
import { PainelHero } from '@/components/admin/PainelHero'

/* ─── tipos ─────────────────────────────────────────────── */
interface EstatisticaTempo {
  item_nome: string
  estacao: string
  total_preparados: number
  tempo_medio: number
  tempo_estimado: number
  desvio: number
}

interface EstatisticaVenda {
  item_nome: string
  estacao: string
  quantidade: number
  receita: number
}

interface EstatisticaMargem {
  item_nome: string
  estacao: string
  preco: number
  custo: number
  margem_pct: number
  margem_rs: number
  quantidade: number
  receita_total: number
  lucro_total: number
}

/* ─── helpers ─────────────────────────────────────────────── */
function formatarReal(v: number) {
  return `R$ ${v.toFixed(2).replace('.', ',')}`
}

const ESTACAO_EMOJI: Record<string, string> = {
  cozinha: '🍳', bar: '🍺', drinks: '🍹', chopeira: '🍻',
}

const PERIODO_LABELS: Record<string, string> = {
  hoje: 'hoje',
  semana: 'últimos 7 dias',
  mes: 'últimos 30 dias',
}

type Periodo = 'hoje' | 'semana' | 'mes'
type Aba = 'tempo' | 'vendas' | 'margem'

/* ─── cor da margem ─────────────────────────────────────────── */
function corMargem(pct: number) {
  if (pct >= 60) return '#16a34a'  // verde
  if (pct >= 35) return '#d97706'  // amarelo
  return '#dc2626'                  // vermelho
}

/* ─── componente ─────────────────────────────────────────────── */
export default function PerformancePage() {
  const [periodo, setPeriodo] = useState<Periodo>('hoje')
  const [abaAtiva, setAbaAtiva] = useState<Aba>('tempo')
  const [loading, setLoading] = useState(true)
  const [buscaVendas, setBuscaVendas] = useState('')

  const [statsTempo, setStatsTempo] = useState<EstatisticaTempo[]>([])
  const [statsVendas, setStatsVendas] = useState<EstatisticaVenda[]>([])
  const [statsMargem, setStatsMargem] = useState<EstatisticaMargem[]>([])
  const [estatisticasEstacao, setEstatisticasEstacao] = useState<{ estacao: string; media: number; total: number }[]>([])

  useEffect(() => {
    async function buscar() {
      setLoading(true)
      const supabase = createClient()

      const inicio = new Date()
      if (periodo === 'hoje') inicio.setHours(0, 0, 0, 0)
      else if (periodo === 'semana') inicio.setDate(inicio.getDate() - 7)
      else inicio.setDate(inicio.getDate() - 30)

      /* ── 1. Dados de tempo ───────────────────────────────── */
      const { data: rawTempo } = await supabase
        .from('pedido_itens')
        .select('item_nome, estacao, tempo_real_minutos, tempo_preparo_estimado')
        .not('tempo_real_minutos', 'is', null)
        .gte('criado_em', inicio.toISOString())

      const dadosTempo = (rawTempo ?? []) as Array<{
        item_nome: string; estacao: string
        tempo_real_minutos: number; tempo_preparo_estimado: number
      }>

      const agrupTempo: Record<string, { tempos: number[]; estimado: number; estacao: string }> = {}
      dadosTempo.forEach((d) => {
        if (!agrupTempo[d.item_nome])
          agrupTempo[d.item_nome] = { tempos: [], estimado: d.tempo_preparo_estimado, estacao: d.estacao }
        agrupTempo[d.item_nome].tempos.push(d.tempo_real_minutos)
      })

      const tempoResult: EstatisticaTempo[] = Object.entries(agrupTempo).map(([nome, v]) => {
        const media = v.tempos.reduce((a, b) => a + b, 0) / v.tempos.length
        return {
          item_nome: nome, estacao: v.estacao,
          total_preparados: v.tempos.length,
          tempo_medio: Math.round(media * 10) / 10,
          tempo_estimado: v.estimado,
          desvio: Math.round((media - v.estimado) * 10) / 10,
        }
      }).sort((a, b) => b.desvio - a.desvio)
      setStatsTempo(tempoResult)

      const porEstacao: Record<string, number[]> = {}
      dadosTempo.forEach((d) => {
        if (!porEstacao[d.estacao]) porEstacao[d.estacao] = []
        porEstacao[d.estacao].push(d.tempo_real_minutos)
      })
      setEstatisticasEstacao(
        Object.entries(porEstacao).map(([estacao, tempos]) => ({
          estacao,
          media: Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length * 10) / 10,
          total: tempos.length,
        }))
      )

      /* ── 2. Dados de vendas ─────────────────────────────── */
      const { data: rawVendas } = await supabase
        .from('pedido_itens')
        .select('item_nome, estacao, quantidade, item_preco')
        .gte('criado_em', inicio.toISOString())
        .neq('status', 'cancelado')

      const dadosVendas = (rawVendas ?? []) as Array<{
        item_nome: string; estacao: string; quantidade: number; item_preco: number
      }>

      const agrupVendas: Record<string, EstatisticaVenda> = {}
      dadosVendas.forEach((d) => {
        if (!agrupVendas[d.item_nome])
          agrupVendas[d.item_nome] = { item_nome: d.item_nome, estacao: d.estacao, quantidade: 0, receita: 0 }
        agrupVendas[d.item_nome].quantidade += d.quantidade
        agrupVendas[d.item_nome].receita += d.item_preco * d.quantidade
      })
      setStatsVendas(
        Object.values(agrupVendas).sort((a, b) => b.quantidade - a.quantidade)
      )

      /* ── 3. Dados de margem ─────────────────────────────── */
      const { data: rawCardapio } = await supabase
        .from('cardapio_itens')
        .select('nome, preco, custo, estacao')

      const custoMap: Record<string, { preco: number; custo: number; estacao: string }> = {}
      ;(rawCardapio ?? []).forEach((c: { nome: string; preco: number; custo: number; estacao: string }) => {
        custoMap[c.nome] = { preco: c.preco, custo: c.custo ?? 0, estacao: c.estacao }
      })

      const agrupMargem: Record<string, { qtd: number; receita: number }> = {}
      dadosVendas.forEach((d) => {
        if (!agrupMargem[d.item_nome])
          agrupMargem[d.item_nome] = { qtd: 0, receita: 0 }
        agrupMargem[d.item_nome].qtd += d.quantidade
        agrupMargem[d.item_nome].receita += d.item_preco * d.quantidade
      })

      const margemResult: EstatisticaMargem[] = Object.entries(agrupMargem).map(([nome, v]) => {
        const info = custoMap[nome]
        const preco = info?.preco ?? (v.receita / v.qtd)
        const custo = info?.custo ?? 0
        const margem_rs = preco - custo
        const margem_pct = preco > 0 ? Math.round((margem_rs / preco) * 100) : 0
        return {
          item_nome: nome,
          estacao: info?.estacao ?? '',
          preco, custo,
          margem_pct, margem_rs,
          quantidade: v.qtd,
          receita_total: v.receita,
          lucro_total: Math.round(margem_rs * v.qtd * 100) / 100,
        }
      }).sort((a, b) => b.lucro_total - a.lucro_total)
      setStatsMargem(margemResult)

      setLoading(false)
    }

    buscar()
  }, [periodo])

  /* ─── KPIs por aba ─────────────────────────────────────── */
  const totalVendidos   = statsVendas.reduce((a, s) => a + s.quantidade, 0)
  const receitaTotal    = statsVendas.reduce((a, s) => a + s.receita, 0)
  const custoTotal      = statsMargem.reduce((a, s) => a + s.custo * s.quantidade, 0)
  const lucroTotal      = statsMargem.reduce((a, s) => a + s.lucro_total, 0)
  const margemMedia     = receitaTotal > 0 ? Math.round((lucroTotal / receitaTotal) * 100) : 0
  const totalPreparados = statsTempo.reduce((a, s) => a + s.total_preparados, 0)
  const atrasados       = statsTempo.filter((s) => s.desvio > 0)
  const pontual         = statsTempo.filter((s) => s.desvio <= 0)
  const taxaPontualidade = totalPreparados > 0
    ? Math.round((pontual.reduce((a, s) => a + s.total_preparados, 0) / totalPreparados) * 100)
    : 100
  const maisVendido = statsVendas[0]

  const heroConfig = {
    tempo: {
      secao: 'TEMPO DE PREPARO',
      metricaLabel: 'Pontualidade',
      metricaValor: `${taxaPontualidade}%`,
      metricaDestaque: taxaPontualidade >= 80,
      kpis: [
        { label: 'Pontualidade',  value: `${taxaPontualidade}%`, destaque: taxaPontualidade >= 80, alerta: taxaPontualidade < 80 },
        { label: 'Atrasados',     value: atrasados.reduce((a, s) => a + s.total_preparados, 0), alerta: atrasados.length > 0 },
        { label: 'No prazo',      value: pontual.reduce((a, s) => a + s.total_preparados, 0), destaque: true },
        ...estatisticasEstacao.map((e) => ({
          label: e.estacao.charAt(0).toUpperCase() + e.estacao.slice(1),
          value: `${e.media}min`,
          sublabel: `${e.total} prep.`,
        })),
      ],
    },
    vendas: {
      secao: 'MAIS VENDIDOS',
      metricaLabel: 'Itens vendidos',
      metricaValor: String(totalVendidos),
      metricaDestaque: true,
      kpis: [
        { label: 'Itens vendidos',  value: totalVendidos },
        { label: 'Receita total',   value: formatarReal(receitaTotal), destaque: true },
        { label: 'Mais vendido',    value: maisVendido?.item_nome ?? '—', sublabel: maisVendido ? `${maisVendido.quantidade} un.` : undefined },
        { label: 'Ticket médio',    value: totalVendidos > 0 ? formatarReal(receitaTotal / totalVendidos) : '—' },
      ],
    },
    margem: {
      secao: 'CUSTO & MARGEM',
      metricaLabel: 'Margem média',
      metricaValor: `${margemMedia}%`,
      metricaDestaque: margemMedia >= 40,
      kpis: [
        { label: 'Receita total',  value: formatarReal(receitaTotal), destaque: true },
        { label: 'Custo total',    value: custoTotal > 0 ? formatarReal(custoTotal) : '—', alerta: custoTotal > 0 },
        { label: 'Lucro estimado', value: lucroTotal > 0 ? formatarReal(lucroTotal) : '—', destaque: lucroTotal > 0 },
        { label: 'Margem média',   value: `${margemMedia}%`, destaque: margemMedia >= 40, alerta: margemMedia > 0 && margemMedia < 30 },
      ],
    },
  }

  const hero = heroConfig[abaAtiva]

  const ABAS: { key: Aba; label: string; labelMobile: string; icon: React.ElementType }[] = [
    { key: 'tempo',  label: 'Tempo de Preparo', labelMobile: 'Tempo',   icon: Clock        },
    { key: 'vendas', label: 'Mais Vendidos',     labelMobile: 'Vendidos', icon: ShoppingCart },
    { key: 'margem', label: 'Custo & Margem',    labelMobile: 'Margem',  icon: DollarSign   },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Hero contextual por aba */}
      <PainelHero
        secao={hero.secao}
        titulo={`Resultado — ${PERIODO_LABELS[periodo]}`}
        metricaLabel={hero.metricaLabel}
        metricaValor={hero.metricaValor}
        metricaDestaque={hero.metricaDestaque}
        loading={loading}
        kpis={hero.kpis}
      />

      {/* Seletor de período */}
      <div className="flex items-center gap-3">
        {(['hoje', 'semana', 'mes'] as Periodo[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              periodo === p
                ? 'bg-teal-600 text-white shadow'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-teal-400'
            }`}
          >
            {p === 'hoje' ? 'Hoje' : p === 'semana' ? '7 dias' : '30 dias'}
          </button>
        ))}
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {ABAS.map(({ key, label, labelMobile, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setAbaAtiva(key)}
            className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              abaAtiva === key
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden md:inline">{label}</span>
            <span className="md:hidden">{labelMobile}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          ABA 1 — TEMPO DE PREPARO
      ══════════════════════════════════════════════════════ */}
      {abaAtiva === 'tempo' && (
        <div className="space-y-4">
          {statsTempo.length > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-teal-600" />
                    Tempo Real vs. Estimado por Item
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={statsTempo.slice(0, 15)} margin={{ left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="item_nome" tick={{ fontSize: 11 }}
                        tickFormatter={(v) => v.length > 12 ? v.slice(0, 12) + '…' : v} />
                      <YAxis tick={{ fontSize: 11 }} unit="min" />
                      <Tooltip formatter={(v, name) => [`${v}min`, name === 'tempo_medio' ? 'Real' : 'Estimado']} />
                      <Legend formatter={(v) => v === 'tempo_estimado' ? 'Estimado' : 'Real'} />
                      <Bar dataKey="tempo_estimado" fill="#e2e8f0" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="tempo_medio"    fill="#f97316" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {atrasados.length > 0 && (
                <Card className="border-red-100">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2 text-red-600">
                      <AlertTriangle className="w-4 h-4" /> Itens com Atraso Consistente
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {atrasados.map((item) => (
                        <div key={item.item_nome} className="flex items-center justify-between p-3 bg-red-50 rounded-lg text-sm">
                          <div>
                            <span className="font-medium text-slate-800">{item.item_nome}</span>
                            <span className="text-xs text-slate-500 ml-2">{ESTACAO_EMOJI[item.estacao]} {item.estacao}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-slate-500">Est: {item.tempo_estimado}min</span>
                            <span className="font-bold text-slate-700">Real: {item.tempo_medio}min</span>
                            <span className="font-bold text-red-600">+{item.desvio}min</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {pontual.length > 0 && (
                <Card className="border-green-100">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2 text-green-600">
                      <Clock className="w-4 h-4" /> Itens Dentro do Prazo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {pontual.map((item) => (
                        <div key={item.item_nome} className="flex items-center justify-between p-3 bg-green-50 rounded-lg text-sm">
                          <div>
                            <span className="font-medium text-slate-800">{item.item_nome}</span>
                            <span className="text-xs text-slate-500 ml-2">{ESTACAO_EMOJI[item.estacao]} {item.estacao}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-slate-500">Est: {item.tempo_estimado}min</span>
                            <span className="font-bold text-green-700">Real: {item.tempo_medio}min</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : !loading && (
            <div className="text-center py-12 text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Nenhum dado de tempo disponível para este período.</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          ABA 2 — MAIS VENDIDOS
      ══════════════════════════════════════════════════════ */}
      {abaAtiva === 'vendas' && (
        <div className="space-y-4">
          {statsVendas.length > 0 ? (
            <>
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="w-full pl-9 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all"
                  placeholder="Pesquisar produto..."
                  value={buscaVendas}
                  onChange={(e) => setBuscaVendas(e.target.value)}
                />
                {buscaVendas && (
                  <button
                    onClick={() => setBuscaVendas('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Card de detalhe quando há busca com resultado único */}
              {(() => {
                const filtrados = statsVendas.filter((i) =>
                  i.item_nome.toLowerCase().includes(buscaVendas.toLowerCase())
                )
                const detalhe = buscaVendas && filtrados.length === 1 ? filtrados[0] : null
                const listaFinal = filtrados

                return (
                  <>
                    {/* Card detalhado do item pesquisado */}
                    {detalhe && (
                      <div
                        className="rounded-2xl p-5 text-white space-y-4"
                        style={{ background: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 40%, #1A9B8A 100%)' }}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-teal-300 text-xs font-bold uppercase tracking-widest mb-1">
                              {ESTACAO_EMOJI[detalhe.estacao]} {detalhe.estacao}
                            </p>
                            <h2 className="text-xl font-black">{detalhe.item_nome}</h2>
                          </div>
                          <span className="text-2xl">
                            {statsVendas.findIndex((i) => i.item_nome === detalhe.item_nome) === 0 ? '🥇'
                              : statsVendas.findIndex((i) => i.item_nome === detalhe.item_nome) === 1 ? '🥈'
                              : statsVendas.findIndex((i) => i.item_nome === detalhe.item_nome) === 2 ? '🥉' : ''}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-white/10 rounded-xl p-3 text-center">
                            <p className="text-2xl font-black text-teal-300">{detalhe.quantidade}</p>
                            <p className="text-xs text-white/60 mt-0.5">Unidades vendidas</p>
                          </div>
                          <div className="bg-white/10 rounded-xl p-3 text-center">
                            <p className="text-2xl font-black text-white">{formatarReal(detalhe.receita)}</p>
                            <p className="text-xs text-white/60 mt-0.5">Receita total</p>
                          </div>
                          <div className="bg-white/10 rounded-xl p-3 text-center">
                            <p className="text-2xl font-black text-white">{formatarReal(detalhe.receita / detalhe.quantidade)}</p>
                            <p className="text-xs text-white/60 mt-0.5">Ticket médio</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-white/50 pt-1">
                          <span>
                            Posição no ranking:{' '}
                            <strong className="text-white">
                              #{statsVendas.findIndex((i) => i.item_nome === detalhe.item_nome) + 1}
                            </strong>{' '}
                            de {statsVendas.length} produtos
                          </span>
                          <span>
                            Participação:{' '}
                            <strong className="text-teal-300">
                              {Math.round((detalhe.quantidade / totalVendidos) * 100)}%
                            </strong>{' '}
                            das vendas
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Gráfico — só exibe sem busca ou com múltiplos resultados */}
                    {!buscaVendas && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4 text-teal-600" />
                            Quantidade Vendida por Item
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={statsVendas.slice(0, 15)} layout="vertical" margin={{ left: 10, right: 30 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 11 }} />
                              <YAxis type="category" dataKey="item_nome" tick={{ fontSize: 11 }} width={120}
                                tickFormatter={(v) => v.length > 16 ? v.slice(0, 16) + '…' : v} />
                              <Tooltip formatter={(v, name) => [
                                name === 'quantidade' ? `${v} un.` : formatarReal(Number(v)),
                                name === 'quantidade' ? 'Vendidos' : 'Receita',
                              ]} />
                              <Bar dataKey="quantidade" radius={[0, 4, 4, 0]}>
                                {statsVendas.slice(0, 15).map((_, i) => (
                                  <Cell key={i} fill={i === 0 ? '#F05A4F' : i === 1 ? '#1A9B8A' : i === 2 ? '#f97316' : '#94a3b8'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}

                    {/* Ranking / lista filtrada */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center justify-between">
                          <span>{buscaVendas ? `${listaFinal.length} resultado${listaFinal.length !== 1 ? 's' : ''}` : 'Ranking de Vendas'}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        {listaFinal.length === 0 ? (
                          <div className="py-10 text-center text-slate-400 text-sm">
                            Nenhum produto encontrado para &quot;{buscaVendas}&quot;
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-50">
                            {listaFinal.map((item) => {
                              const posicaoOriginal = statsVendas.findIndex((i) => i.item_nome === item.item_nome)
                              return (
                                <div
                                  key={item.item_nome}
                                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                                  onClick={() => setBuscaVendas(item.item_nome)}
                                >
                                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                    posicaoOriginal === 0 ? 'bg-yellow-100 text-yellow-700' :
                                    posicaoOriginal === 1 ? 'bg-slate-100 text-slate-600' :
                                    posicaoOriginal === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'
                                  }`}>
                                    {posicaoOriginal === 0 ? '🥇' : posicaoOriginal === 1 ? '🥈' : posicaoOriginal === 2 ? '🥉' : posicaoOriginal + 1}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-slate-800 truncate">{item.item_nome}</p>
                                    <p className="text-xs text-slate-400">{ESTACAO_EMOJI[item.estacao]} {item.estacao}</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="font-bold text-sm text-slate-800">{item.quantidade} un.</p>
                                    <p className="text-xs text-teal-600 font-medium">{formatarReal(item.receita)}</p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )
              })()}
            </>
          ) : !loading && (
            <div className="text-center py-12 text-slate-400">
              <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Nenhuma venda registrada para este período.</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          ABA 3 — CUSTO & MARGEM
      ══════════════════════════════════════════════════════ */}
      {abaAtiva === 'margem' && (
        <div className="space-y-4">
          {statsMargem.length > 0 ? (
            <>
              {/* Gráfico margem % por item */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-teal-600" />
                    Margem de Lucro por Item (%)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={statsMargem.slice(0, 15)}
                      layout="vertical"
                      margin={{ left: 10, right: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                      <YAxis type="category" dataKey="item_nome" tick={{ fontSize: 11 }} width={120}
                        tickFormatter={(v) => v.length > 16 ? v.slice(0, 16) + '…' : v} />
                      <Tooltip
                        formatter={(v) => [`${v}%`, 'Margem']}
                        labelFormatter={(l) => {
                          const item = statsMargem.find((i) => i.item_nome === l)
                          return item ? `${l} — Custo: ${formatarReal(item.custo)} / Venda: ${formatarReal(item.preco)}` : l
                        }}
                      />
                      <Bar dataKey="margem_pct" radius={[0, 4, 4, 0]}>
                        {statsMargem.slice(0, 15).map((item, i) => (
                          <Cell key={i} fill={corMargem(item.margem_pct)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 justify-end">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-600 inline-block" /> ≥ 60% excelente</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-600 inline-block" /> 35-59% ok</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-600 inline-block" /> &lt; 35% atenção</span>
                  </div>
                </CardContent>
              </Card>

              {/* Tabela detalhada */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="w-4 h-4 text-teal-600" />
                    Análise Detalhada — ordenado por lucro total
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {/* ── Desktop: tabela 7 colunas ── */}
                  <div className="hidden md:block">
                    <div className="grid grid-cols-7 gap-2 px-5 py-2 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wide border-b">
                      <div className="col-span-2">Produto</div>
                      <div className="text-right">Venda</div>
                      <div className="text-right">Custo</div>
                      <div className="text-right">Margem</div>
                      <div className="text-right">Qtd</div>
                      <div className="text-right">Lucro Total</div>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {statsMargem.map((item) => (
                        <div key={item.item_nome} className="grid grid-cols-7 gap-2 px-5 py-3 hover:bg-slate-50 transition-colors items-center">
                          <div className="col-span-2 min-w-0">
                            <p className="font-medium text-sm text-slate-800 truncate">{item.item_nome}</p>
                            <p className="text-xs text-slate-400">{ESTACAO_EMOJI[item.estacao]} {item.estacao}</p>
                          </div>
                          <div className="text-right text-sm text-slate-600">{formatarReal(item.preco)}</div>
                          <div className="text-right text-sm text-slate-600">
                            {item.custo > 0 ? formatarReal(item.custo) : <span className="text-slate-300 text-xs">—</span>}
                          </div>
                          <div className="text-right">
                            <span
                              className="text-sm font-bold px-2 py-0.5 rounded-full"
                              style={{
                                color: corMargem(item.margem_pct),
                                background: corMargem(item.margem_pct) + '18',
                              }}
                            >
                              {item.custo > 0 ? `${item.margem_pct}%` : <span className="text-slate-300 text-xs font-normal">sem custo</span>}
                            </span>
                          </div>
                          <div className="text-right text-sm text-slate-600">{item.quantidade}</div>
                          <div className="text-right">
                            <span className="text-sm font-bold" style={{ color: corMargem(item.margem_pct) }}>
                              {item.custo > 0 ? formatarReal(item.lucro_total) : <span className="text-slate-300 text-xs font-normal">—</span>}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Mobile: cards ── */}
                  <div className="md:hidden divide-y divide-slate-100">
                    {statsMargem.map((item) => (
                      <div key={item.item_nome} className="px-4 py-3">
                        {/* Nome + estação + badge margem */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-slate-800 leading-tight">{item.item_nome}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{ESTACAO_EMOJI[item.estacao]} {item.estacao}</p>
                          </div>
                          <span
                            className="shrink-0 text-sm font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                            style={{
                              color: corMargem(item.margem_pct),
                              background: corMargem(item.margem_pct) + '18',
                            }}
                          >
                            {item.custo > 0 ? `${item.margem_pct}%` : 'sem custo'}
                          </span>
                        </div>
                        {/* Grid 2×2 de métricas */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-slate-50 rounded-lg px-3 py-2">
                            <p className="text-xs text-slate-400 font-medium">Preço venda</p>
                            <p className="text-sm font-bold text-slate-700">{formatarReal(item.preco)}</p>
                          </div>
                          <div className="bg-slate-50 rounded-lg px-3 py-2">
                            <p className="text-xs text-slate-400 font-medium">Custo unit.</p>
                            <p className="text-sm font-bold text-slate-700">
                              {item.custo > 0 ? formatarReal(item.custo) : <span className="text-slate-300">—</span>}
                            </p>
                          </div>
                          <div className="bg-slate-50 rounded-lg px-3 py-2">
                            <p className="text-xs text-slate-400 font-medium">Qtd vendida</p>
                            <p className="text-sm font-bold text-slate-700">{item.quantidade} un.</p>
                          </div>
                          <div className="bg-slate-50 rounded-lg px-3 py-2">
                            <p className="text-xs text-slate-400 font-medium">Lucro total</p>
                            <p className="text-sm font-bold" style={{ color: item.custo > 0 ? corMargem(item.margem_pct) : undefined }}>
                              {item.custo > 0 ? formatarReal(item.lucro_total) : <span className="text-slate-300">—</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Aviso sobre custo não configurado */}
              {statsMargem.some((i) => i.custo === 0) && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                  <p>
                    Alguns produtos ainda não têm custo cadastrado. Para ver a margem real,
                    adicione o <strong>custo unitário</strong> em <strong>Cardápio → editar item</strong>.
                  </p>
                </div>
              )}
            </>
          ) : !loading && (
            <div className="text-center py-12 text-slate-400">
              <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Nenhuma venda registrada para este período.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
