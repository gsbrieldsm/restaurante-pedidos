'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  QrCode, Printer, Download, BarChart3, Users,
  DollarSign, Clock, TrendingUp, Medal,
} from 'lucide-react'
import type { Mesa } from '@/lib/supabase/types'
import QRCode from 'qrcode'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

/* ─── tipos ──────────────────────────────────────────── */
interface EstatisticaMesa {
  mesa_numero: number
  acessos: number
  receita: number
  minutos_ocupada: number
  taxa_ocupacao: number // % dos 30 dias
}

function formatarReal(v: number) {
  return `R$ ${v.toFixed(2).replace('.', ',')}`
}

function medalha(i: number) {
  return i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`
}

const CORES_BARRA = ['#F05A4F', '#1A9B8A', '#f97316', '#8b5cf6', '#0ea5e9']

/* ─── componente ──────────────────────────────────────── */
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'menue.com.br'
const APP_URL     = process.env.NEXT_PUBLIC_APP_URL     ?? 'https://www.menue.com.br'

function getQrBase(): string {
  if (typeof document === 'undefined') return APP_URL
  const m = document.cookie.match(/(?:^|;\s*)tenant_slug=([^;]+)/)
  const slug = m ? decodeURIComponent(m[1]) : null
  return slug ? `https://${slug}.${ROOT_DOMAIN}` : APP_URL
}

export default function MesasQRPage() {
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [loading, setLoading] = useState(true)
  const [qrSelecionada, setQrSelecionada] = useState<Mesa | null>(null)
  const [qrUrl, setQrUrl] = useState<string>('')
  const [aba, setAba] = useState<'logistica' | 'qrcodes'>('logistica')
  const [stats, setStats] = useState<EstatisticaMesa[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    fetch('/api/admin/mesas')
      .then(r => r.json())
      .then(({ mesas: data }) => { setMesas(data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    async function buscarStats() {
      const res = await fetch('/api/admin/mesas/logistica')
      if (!res.ok) { setLoadingStats(false); return }
      const { stats: resultado } = await res.json()
      setStats(resultado ?? [])
      setLoadingStats(false)
    }
    buscarStats()
  }, [])

  async function abrirQR(mesa: Mesa) {
    setQrSelecionada(mesa)
    const url = `${getQrBase()}/mesa/${mesa.qr_token}`
    const dataUrl = await QRCode.toDataURL(url, {
      width: 400, margin: 2,
      color: { dark: '#1e293b', light: '#ffffff' },
    })
    setQrUrl(dataUrl)
  }

  function baixarQR() {
    if (!qrUrl || !qrSelecionada) return
    const a = document.createElement('a')
    a.href = qrUrl
    a.download = `mesa-${qrSelecionada.numero}-qr.png`
    a.click()
  }

  function imprimirQR() {
    if (!qrUrl || !qrSelecionada) return
    const win = window.open('', '_blank')!
    win.document.write(`
      <html><head><title>Mesa ${qrSelecionada.numero}</title>
      <style>
        @page { size: A4; margin: 0 }
        body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:white}
        .card{text-align:center;padding:32px;border:2px solid #e2e8f0;border-radius:16px;max-width:300px}
        h1{font-size:28px;font-weight:900;margin:0 0 4px;color:#1e293b}
        p{color:#64748b;font-size:14px;margin:0 0 20px}
        img{width:240px;height:240px}
        small{display:block;margin-top:16px;color:#94a3b8;font-size:12px}
      </style></head>
      <body><div class="card">
        <h1>Mesa ${qrSelecionada.numero}</h1>
        <p>Escaneie para fazer seu pedido</p>
        <img src="${qrUrl}" />
        <small>Aponte a câmera do celular para o código</small>
      </div>
      <script>window.onload=()=>{window.print();window.close()}</script></body></html>
    `)
  }

  async function imprimirTodos() {
    if (mesas.length === 0) return

    // Gera todos os QR codes em paralelo
    const qrs = await Promise.all(
      mesas.map(async (mesa) => {
        const url = `${getQrBase()}/mesa/${mesa.qr_token}`
        const dataUrl = await QRCode.toDataURL(url, {
          width: 300, margin: 2,
          color: { dark: '#1e293b', light: '#ffffff' },
        })
        return { numero: mesa.numero, dataUrl }
      })
    )

    const cardsHtml = qrs.map(({ numero, dataUrl }) => `
      <div class="card">
        <h2>${numero}</h2>
        <p>Escaneie para pedir</p>
        <img src="${dataUrl}" />
        <small>Aponte a câmera do celular</small>
      </div>
    `).join('')

    const win = window.open('', '_blank')!
    win.document.write(`
      <html><head><title>QR Codes — Todas as mesas</title>
      <style>
        @page { size: A4; margin: 12mm }
        * { box-sizing: border-box }
        body { font-family: sans-serif; background: white; margin: 0; padding: 0 }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10mm }
        .card {
          text-align: center; padding: 6mm;
          border: 1.5px solid #e2e8f0; border-radius: 8px;
          break-inside: avoid; page-break-inside: avoid;
        }
        h2 { font-size: 22px; font-weight: 900; margin: 0 0 2px; color: #1e293b }
        p  { color: #64748b; font-size: 11px; margin: 0 0 6px }
        img { width: 100%; max-width: 120px; height: auto }
        small { display: block; margin-top: 4px; color: #94a3b8; font-size: 9px }
        .hint { text-align: center; font-size: 10px; color: #94a3b8; margin-bottom: 8mm }
      </style></head>
      <body>
        <p class="hint">Menuê+ · Recorte cada cartão e plastifique para colocar nas mesas</p>
        <div class="grid">${cardsHtml}</div>
        <script>window.onload=()=>{ window.print() }</script>
      </body></html>
    `)
  }

  const STATUS_CONFIG = {
    livre: { label: 'Livre', cor: 'bg-green-100 text-green-700' },
    ocupada: { label: 'Ocupada', cor: 'bg-teal-100 text-orange-700' },
    aguardando_pagamento: { label: 'Pagamento', cor: 'bg-purple-100 text-purple-700' },
  }

  // Rankings
  const topAcessos  = [...stats].sort((a, b) => b.acessos - a.acessos).slice(0, 10)
  const topReceita  = [...stats].sort((a, b) => b.receita - a.receita).slice(0, 10)
  const topOcupacao = [...stats].sort((a, b) => b.taxa_ocupacao - a.taxa_ocupacao).slice(0, 10)

  const totalAcessos = stats.reduce((a, s) => a + s.acessos, 0)
  const totalReceita = stats.reduce((a, s) => a + s.receita, 0)
  const mesaTopFat   = topReceita[0]
  const mesaTopAcesso = topAcessos[0]

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mesas & QR Codes</h1>
          <p className="text-slate-500 text-sm">{mesas.length} mesas cadastradas</p>
        </div>
        {aba === 'qrcodes' && mesas.length > 0 && (
          <Button
            onClick={imprimirTodos}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white shrink-0"
          >
            <Printer className="w-4 h-4" />
            Imprimir todos os QR codes
          </Button>
        )}
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: 'logistica', label: 'Visão Logística', icon: BarChart3 },
          { key: 'qrcodes',   label: 'QR Codes',        icon: QrCode    },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setAba(key as 'logistica' | 'qrcodes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              aba === key ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════
          ABA — VISÃO LOGÍSTICA
      ══════════════════════════════════════════════ */}
      {aba === 'logistica' && (
        <div className="space-y-5">

          {/* Hero KPIs */}
          <div
            className="rounded-2xl p-5 text-white"
            style={{ background: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 40%, #1A9B8A 100%)' }}
          >
            <p className="text-teal-300 text-xs font-bold uppercase tracking-widest mb-3">
              Últimos 30 dias
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total de acessos',   value: totalAcessos,              icon: Users      },
                { label: 'Receita registrada', value: formatarReal(totalReceita), icon: DollarSign },
                { label: 'Mesa + frequentada', value: mesaTopAcesso ? `Mesa ${mesaTopAcesso.mesa_numero}` : '—',
                  sub: mesaTopAcesso ? `${mesaTopAcesso.acessos} acessos` : '', icon: TrendingUp },
                { label: 'Mesa + lucrativa',   value: mesaTopFat ? `Mesa ${mesaTopFat.mesa_numero}` : '—',
                  sub: mesaTopFat ? formatarReal(mesaTopFat.receita) : '', icon: Medal },
              ].map(({ label, value, sub, icon: Icon }) => (
                <div key={label} className="bg-white/10 rounded-xl p-3">
                  <Icon className="w-4 h-4 text-teal-300 mb-2" />
                  <p className="text-lg font-black leading-tight">{value}</p>
                  {sub && <p className="text-xs text-teal-300 mt-0.5">{sub}</p>}
                  <p className="text-xs text-white/50 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {loadingStats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-64 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          ) : stats.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum dado nos últimos 30 dias</p>
              <p className="text-sm mt-1">Os dados aparecem conforme mesas são utilizadas.</p>
            </div>
          ) : (
            <>
              {/* 3 gráficos lado a lado */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Gráfico: mais acessadas */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="w-4 h-4 text-teal-600" />
                      <h3 className="font-semibold text-sm text-slate-700">Mais Frequentadas</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={topAcessos} layout="vertical" margin={{ left: -10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="mesa_numero" tick={{ fontSize: 10 }} width={45}
                          tickFormatter={(v) => `Mesa ${v}`} />
                        <Tooltip formatter={(v) => [`${v} acessos`, 'Acessos']} labelFormatter={(v) => `Mesa ${v}`} />
                        <Bar dataKey="acessos" radius={[0, 4, 4, 0]}>
                          {topAcessos.map((_, i) => <Cell key={i} fill={CORES_BARRA[i % CORES_BARRA.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Gráfico: maior faturamento */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <DollarSign className="w-4 h-4 text-teal-600" />
                      <h3 className="font-semibold text-sm text-slate-700">Maior Faturamento</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={topReceita} layout="vertical" margin={{ left: -10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${v}`} />
                        <YAxis type="category" dataKey="mesa_numero" tick={{ fontSize: 10 }} width={45}
                          tickFormatter={(v) => `Mesa ${v}`} />
                        <Tooltip formatter={(v) => [formatarReal(Number(v)), 'Receita']} labelFormatter={(v) => `Mesa ${v}`} />
                        <Bar dataKey="receita" radius={[0, 4, 4, 0]}>
                          {topReceita.map((_, i) => <Cell key={i} fill={CORES_BARRA[i % CORES_BARRA.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Gráfico: taxa de ocupação */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="w-4 h-4 text-teal-600" />
                      <h3 className="font-semibold text-sm text-slate-700">Taxa de Ocupação</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={topOcupacao} layout="vertical" margin={{ left: -10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                        <YAxis type="category" dataKey="mesa_numero" tick={{ fontSize: 10 }} width={45}
                          tickFormatter={(v) => `Mesa ${v}`} />
                        <Tooltip formatter={(v) => [`${v}%`, 'Ocupação']} labelFormatter={(v) => `Mesa ${v}`} />
                        <Bar dataKey="taxa_ocupacao" radius={[0, 4, 4, 0]}>
                          {topOcupacao.map((entry, i) => (
                            <Cell key={i} fill={
                              entry.taxa_ocupacao >= 60 ? '#16a34a' :
                              entry.taxa_ocupacao >= 30 ? '#f97316' : '#94a3b8'
                            } />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Tabela completa ranking */}
              <Card>
                <CardContent className="p-0">
                  <div className="px-5 py-3 border-b border-slate-100">
                    <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-teal-600" />
                      Ranking completo — últimos 30 dias
                    </h3>
                  </div>
                  {/* Header */}
                  <div className="grid grid-cols-5 gap-2 px-5 py-2 bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wide border-b">
                    <div>Mesa</div>
                    <div className="text-center">Acessos</div>
                    <div className="text-center">Receita</div>
                    <div className="text-center">Tempo ocupada</div>
                    <div className="text-center">Taxa ocupação</div>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {[...stats]
                      .sort((a, b) => b.receita - a.receita)
                      .map((s, i) => (
                        <div key={s.mesa_numero} className="grid grid-cols-5 gap-2 px-5 py-3 hover:bg-slate-50 transition-colors items-center text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{medalha(i)}</span>
                            <span className="font-bold text-slate-700">Mesa {s.mesa_numero}</span>
                          </div>
                          <div className="text-center">
                            <span className="font-semibold text-slate-700">{s.acessos}</span>
                            <span className="text-xs text-slate-400 ml-1">vis.</span>
                          </div>
                          <div className="text-center font-semibold text-teal-700">
                            {s.receita > 0 ? formatarReal(s.receita) : <span className="text-slate-300">—</span>}
                          </div>
                          <div className="text-center text-slate-600">
                            {s.minutos_ocupada >= 60
                              ? `${Math.floor(s.minutos_ocupada / 60)}h ${s.minutos_ocupada % 60}min`
                              : `${s.minutos_ocupada}min`}
                          </div>
                          <div className="text-center">
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{
                                color: s.taxa_ocupacao >= 60 ? '#16a34a' : s.taxa_ocupacao >= 30 ? '#f97316' : '#64748b',
                                background: s.taxa_ocupacao >= 60 ? '#dcfce7' : s.taxa_ocupacao >= 30 ? '#ffedd5' : '#f1f5f9',
                              }}
                            >
                              {s.taxa_ocupacao}%
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          ABA — QR CODES
      ══════════════════════════════════════════════ */}
      {aba === 'qrcodes' && (
        loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {mesas.map((mesa) => {
              const cfg = STATUS_CONFIG[mesa.status]
              return (
                <Card key={mesa.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 text-center space-y-2">
                    <p className="text-3xl font-black text-slate-700">{mesa.numero}</p>
                    <Badge className={`${cfg.cor} border-0`}>{cfg.label}</Badge>
                    <p className="text-xs text-slate-400">{mesa.capacidade} lugares</p>
                    <Button onClick={() => abrirQR(mesa)} variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                      <QrCode className="w-3.5 h-3.5" />
                      Ver QR Code
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )
      )}

      {/* Modal QR */}
      {qrSelecionada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setQrSelecionada(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-black text-slate-800 mb-1">Mesa {qrSelecionada.numero}</h2>
            <p className="text-sm text-slate-500 mb-4">Escaneie para fazer o pedido</p>
            {qrUrl && <img src={qrUrl} alt="QR Code" className="w-48 h-48 mx-auto rounded-xl" />}
            <p className="text-xs text-slate-400 mt-3 mb-5 font-mono break-all">
              {process.env.NEXT_PUBLIC_APP_URL}/mesa/{qrSelecionada.qr_token}
            </p>
            <div className="flex gap-2">
              <Button onClick={baixarQR} variant="outline" className="flex-1 gap-2 text-sm">
                <Download className="w-4 h-4" /> Baixar
              </Button>
              <Button onClick={imprimirQR} className="flex-1 gap-2 text-sm bg-teal-600 hover:bg-teal-700">
                <Printer className="w-4 h-4" /> Imprimir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
