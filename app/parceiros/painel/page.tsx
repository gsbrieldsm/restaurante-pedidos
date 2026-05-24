'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Copy, Check, LogOut, TrendingUp, Users, DollarSign,
  Clock, CheckCircle2, AlertCircle, ExternalLink
} from 'lucide-react'

// ── helpers ───────────────────────────────────────────────────────────────────
function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── types ─────────────────────────────────────────────────────────────────────
interface Restaurante {
  id:              string
  nome_restaurante: string
  plano:           string
  ativo:           boolean
  plano_aceito_em: string | null
  criado_em:       string
  status:          string
}

interface PainelData {
  parceiro: {
    nome:             string
    email:            string
    codigo_indicacao: string
    criado_em:        string
  }
  stats: {
    total_indicados:   number
    total_ativos:      number
    tier:              { label: string; recorrente: number } | null
    comissao_impl:     number
    recorrente_mensal: number
    projecao_anual:    number
  }
  restaurantes: Restaurante[]
}

// ── componente ────────────────────────────────────────────────────────────────
export default function ParceiroPainelPage() {
  const router = useRouter()
  const [data,    setData]    = useState<PainelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied,  setCopied]  = useState(false)

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://menue.com.br'

  useEffect(() => {
    fetch('/api/parceiros/painel')
      .then((r) => {
        if (r.status === 401) { router.push('/parceiros/login'); return null }
        return r.json()
      })
      .then((d) => { if (d) setData(d) })
      .finally(() => setLoading(false))
  }, [router])

  async function sair() {
    await fetch('/api/parceiros/auth', { method: 'DELETE' })
    router.push('/parceiros/login')
  }

  function copiarLink() {
    if (!data) return
    navigator.clipboard.writeText(`${APP_URL}/registro?ref=${data.parceiro.codigo_indicacao}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── loading ──
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#0f1a18' }}
      >
        <div className="flex items-center gap-3 text-teal-400">
          <div className="w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold">Carregando painel...</span>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { parceiro, stats, restaurantes } = data
  const linkRef = `${APP_URL}/registro?ref=${parceiro.codigo_indicacao}`
  const tierPct = stats.tier ? (stats.tier.recorrente * 100).toFixed(0) + '%' : '—'

  return (
    <div className="min-h-screen" style={{ background: '#0f1a18' }}>

      {/* ── TOP BAR ────────────────────────────────────────────────────────── */}
      <header
        className="border-b sticky top-0 z-10"
        style={{ background: '#0a2420', borderColor: 'rgba(26,155,138,0.2)' }}
      >
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(26,155,138,0.2)' }}
            >
              <span className="text-white font-black text-sm">M+</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">Olá, {parceiro.nome.split(' ')[0]}!</p>
              <p className="text-teal-500 text-xs mt-0.5">Painel do Parceiro</p>
            </div>
          </div>
          <button
            onClick={sair}
            className="flex items-center gap-2 text-teal-600 hover:text-red-400 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ── LINK DE INDICAÇÃO ────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'rgba(26,155,138,0.08)', border: '1px solid rgba(26,155,138,0.25)' }}
        >
          <p className="text-teal-400 text-xs font-bold uppercase tracking-widest mb-3">🔗 Seu link de indicação</p>
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className="flex-1 min-w-0 px-4 py-3 rounded-xl text-sm font-mono text-teal-200 truncate"
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(26,155,138,0.2)' }}
            >
              {linkRef}
            </div>
            <button
              onClick={copiarLink}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 shrink-0"
              style={{ background: copied ? '#16a34a' : '#1A9B8A', color: '#fff' }}
            >
              {copied ? <><Check className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar</>}
            </button>
          </div>
          <p className="text-teal-600 text-xs mt-3">
            Código: <span className="font-bold text-teal-400">{parceiro.codigo_indicacao}</span>
            {' '} · Parceiro desde {fmtData(parceiro.criado_em)}
          </p>
        </div>

        {/* ── STATS ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              icon: Users,
              label: 'Indicados',
              value: String(stats.total_indicados),
              sub: 'total cadastrado',
              cor: '#64748b',
            },
            {
              icon: CheckCircle2,
              label: 'Ativos',
              value: String(stats.total_ativos),
              sub: 'com plano pago',
              cor: '#1A9B8A',
            },
            {
              icon: TrendingUp,
              label: 'Seu tier',
              value: tierPct,
              sub: stats.tier?.label ?? (stats.total_ativos === 0 ? 'nenhum ativo' : ''),
              cor: '#f59e0b',
            },
            {
              icon: DollarSign,
              label: 'Recorrente/mês',
              value: fmt(stats.recorrente_mensal),
              sub: 'estimativa atual',
              cor: '#10b981',
            },
          ].map(({ icon: Icon, label, value, sub, cor }) => (
            <div
              key={label}
              className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4" style={{ color: cor }} />
                <p className="text-slate-400 text-xs font-semibold">{label}</p>
              </div>
              <p className="text-white font-black text-2xl leading-none">{value}</p>
              <p className="text-slate-500 text-xs mt-1.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── COMISSÕES ───────────────────────────────────────────────────── */}
        <div>
          <p className="text-teal-400 text-xs font-bold uppercase tracking-widest mb-4">💰 Comissões</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div
              className="rounded-2xl p-6"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">Por implementação</p>
              <p className="text-white font-black text-2xl">{fmt(stats.comissao_impl)}</p>
              <p className="text-slate-500 text-xs mt-1">
                {stats.total_ativos} × R$600 (30% de R$2.000)
              </p>
            </div>

            <div
              className="rounded-2xl p-6"
              style={{ background: 'rgba(26,155,138,0.08)', border: '1px solid rgba(26,155,138,0.25)' }}
            >
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#1A9B8A' }}>
                Recorrente / mês
              </p>
              <p className="text-white font-black text-2xl">{fmt(stats.recorrente_mensal)}</p>
              <p className="text-slate-500 text-xs mt-1">
                {stats.total_ativos} × R$597 × {tierPct}
              </p>
            </div>

            <div
              className="rounded-2xl p-6"
              style={{ background: 'linear-gradient(135deg, rgba(15,61,53,0.8), rgba(26,155,138,0.3))', border: '1px solid rgba(26,155,138,0.3)' }}
            >
              <p className="text-teal-300 text-xs font-bold uppercase tracking-wider mb-3">Projeção 1º ano</p>
              <p className="text-white font-black text-2xl">{fmt(stats.projecao_anual)}</p>
              <p className="text-teal-600 text-xs mt-1">impl. + recorrente × 12 meses</p>
            </div>
          </div>

          {stats.total_ativos === 0 && (
            <div
              className="mt-4 rounded-xl px-4 py-3 text-sm text-amber-300/80 leading-relaxed"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              💡 As comissões serão calculadas assim que seus primeiros indicados ativarem um plano pago.
            </div>
          )}
        </div>

        {/* ── RESTAURANTES INDICADOS ──────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-teal-400 text-xs font-bold uppercase tracking-widest">🏪 Restaurantes indicados</p>
            <p className="text-slate-500 text-xs">{restaurantes.length} total</p>
          </div>

          {restaurantes.length === 0 ? (
            <div
              className="rounded-2xl p-10 text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}
            >
              <p className="text-4xl mb-3">🔗</p>
              <p className="text-slate-400 font-semibold text-sm">Nenhum restaurante indicado ainda</p>
              <p className="text-slate-500 text-xs mt-1 max-w-xs mx-auto">
                Compartilhe seu link de indicação com donos de restaurantes para começar a ganhar.
              </p>
              <button
                onClick={copiarLink}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                style={{ background: '#1A9B8A', color: '#fff' }}
              >
                <Copy className="w-4 h-4" /> Copiar meu link
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {restaurantes.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl px-5 py-4 flex items-center gap-4"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  {/* Status */}
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${r.ativo ? 'bg-teal-400' : 'bg-slate-600'}`} />

                  {/* Nome */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{r.nome_restaurante}</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Indicado em {fmtData(r.criado_em)}
                      {r.plano_aceito_em && ` · Ativo desde ${fmtData(r.plano_aceito_em)}`}
                    </p>
                  </div>

                  {/* Plano */}
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-lg capitalize shrink-0"
                    style={{
                      background: r.ativo ? 'rgba(26,155,138,0.15)' : 'rgba(255,255,255,0.06)',
                      color:      r.ativo ? '#5EEAD4' : '#64748b',
                    }}
                  >
                    {r.ativo ? r.plano : 'Trial / Pendente'}
                  </span>

                  {/* Status badge */}
                  <div className="shrink-0">
                    {r.ativo ? (
                      <div className="flex items-center gap-1 text-teal-400 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-slate-500 text-xs">
                        <Clock className="w-3.5 h-3.5" /> Pendente
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
        <div className="text-center pt-4 pb-8 space-y-2">
          <p className="text-slate-600 text-xs">
            Dúvidas sobre suas comissões?{' '}
            <a
              href={`https://wa.me/5547988194822?text=${encodeURIComponent(`Olá! Sou parceiro Menuê+ (${parceiro.codigo_indicacao}) e tenho uma dúvida sobre minhas comissões.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 hover:text-teal-400 underline underline-offset-2 transition-colors inline-flex items-center gap-1"
            >
              Fale com a gente no WhatsApp <ExternalLink className="w-3 h-3" />
            </a>
          </p>
          <p className="text-slate-700 text-xs">
            * Estimativas com base na mensalidade média de R$597. Valores reais dependem do plano de cada cliente.
          </p>
        </div>

      </main>
    </div>
  )
}
