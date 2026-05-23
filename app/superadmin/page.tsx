'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LogOut, Users, TrendingUp, DollarSign, Store,
  ExternalLink, ShieldOff, ShieldCheck, Settings2,
  RefreshCw, Handshake, ChevronDown, CreditCard,
  Gauge, HeadphonesIcon, Menu, X,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────
type Parceiro = {
  id:        string
  nome:      string
  email:     string
  whatsapp:  string
  cidade:    string | null
  como:      string | null
  status:    'novo' | 'contactado' | 'aprovado' | 'recusado'
  notas:     string | null
  criado_em: string
}

type Tenant = {
  id: string
  slug: string
  nome: string
  nome_restaurante: string
  email: string
  status: 'ativo' | 'suspenso'
  plano: string
  plano_aceito_em: string | null
  criado_em: string
  total_mesas: number
  total_pedidos: number
  faturamento_total: number
  total_sessoes: number
}

type Aba = 'assinaturas' | 'performance' | 'suporte' | 'parceiros'

// ── Constantes ──────────────────────────────────────────────────────────────
const MENSALIDADE  = 550
const IMPLEMENTACAO = 2000
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://menue.com.br'

const STATUS_PARCEIRO: Record<string, { label: string; cor: string; bg: string }> = {
  novo:       { label: 'Novo',       cor: '#0284c7', bg: '#e0f2fe' },
  contactado: { label: 'Contactado', cor: '#d97706', bg: '#fef3c7' },
  aprovado:   { label: 'Aprovado',   cor: '#16a34a', bg: '#dcfce7' },
  recusado:   { label: 'Recusado',   cor: '#dc2626', bg: '#fee2e2' },
}

const COMO_LABEL: Record<string, string> = {
  rede_pessoal:  'Rede pessoal',
  redes_sociais: 'Redes sociais',
  consultor:     'Consultor',
  agencia:       'Agência',
  outro:         'Outro',
}

const NAV: { id: Aba; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: 'assinaturas', label: 'Controle de assinatura', icon: CreditCard },
  { id: 'performance', label: 'Performance do sistema', icon: Gauge },
  { id: 'suporte',     label: 'Chamados & Suporte',     icon: HeadphonesIcon },
  { id: 'parceiros',   label: 'Parceiros',              icon: Handshake },
]

// ── Componente principal ───────────────────────────────────────────────────
export default function SuperAdminPage() {
  const router = useRouter()
  const [aba,          setAba]          = useState<Aba>('assinaturas')
  const [tenants,      setTenants]      = useState<Tenant[]>([])
  const [parceiros,    setParceiros]    = useState<Parceiro[]>([])
  const [carregando,   setCarregando]   = useState(true)
  const [atualizando,  setAtualizando]  = useState<string | null>(null)
  const [inicializando,setInicializando]= useState<string | null>(null)
  const [statusEdit,   setStatusEdit]   = useState<string | null>(null)
  const [sidebarOpen,  setSidebarOpen]  = useState(false)

  useEffect(() => {
    document.title = 'Master — Menuê+'
    carregar()
  }, [])

  async function carregar() {
    setCarregando(true)
    try {
      const resTenants = await fetch('/api/superadmin/tenants')
      if (resTenants.status === 401) { router.push('/superadmin/login'); return }
      const { tenants } = await resTenants.json()
      setTenants(tenants ?? [])
    } catch (e) { console.error(e) }

    try {
      const res = await fetch('/api/superadmin/parceiros')
      if (res.ok) {
        const data = await res.json()
        setParceiros(data.parceiros ?? [])
      }
    } catch (e) { console.error(e) }

    setCarregando(false)
  }

  async function forcarSetup(tenant: Tenant) {
    setInicializando(tenant.id)
    const res = await fetch('/api/superadmin/tenants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tenant.id, acao: 'setup' }),
    })
    const data = await res.json()
    if (data.ok) {
      setTenants((prev) => prev.map((t) => t.id === tenant.id
        ? { ...t, total_mesas: data.ja_configurado ? t.total_mesas : 10 } : t))
    }
    setInicializando(null)
  }

  async function toggleStatus(tenant: Tenant) {
    const novoStatus = tenant.status === 'ativo' ? 'suspenso' : 'ativo'
    setAtualizando(tenant.id)
    await fetch('/api/superadmin/tenants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tenant.id, status: novoStatus }),
    })
    setTenants((prev) => prev.map((t) => t.id === tenant.id ? { ...t, status: novoStatus } : t))
    setAtualizando(null)
  }

  async function atualizarStatusParceiro(id: string, status: string) {
    setStatusEdit(id)
    await fetch('/api/superadmin/parceiros', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setParceiros((prev) => prev.map((p) => p.id === id
      ? { ...p, status: status as Parceiro['status'] } : p))
    setStatusEdit(null)
  }

  async function sair() {
    await fetch('/api/superadmin/auth', { method: 'DELETE' })
    router.push('/superadmin/login')
  }

  const ativos        = tenants.filter((t) => t.status === 'ativo' && t.plano_aceito_em)
  const mrr           = ativos.length * MENSALIDADE
  const receitaTotal  = ativos.length * IMPLEMENTACAO + mrr
  const totalPedidos  = tenants.reduce((s, t) => s + t.total_pedidos, 0)
  const totalFaturado = tenants.reduce((s, t) => s + t.faturamento_total, 0)
  const totalSessoes  = tenants.reduce((s, t) => s + t.total_sessoes, 0)
  const novosPartners = parceiros.filter((p) => p.status === 'novo').length

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-teal-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Carregando painel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">

      {/* ── Overlay mobile ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={[
        'fixed md:sticky top-0 h-screen z-30 flex flex-col transition-transform duration-200',
        'w-56 shrink-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      ].join(' ')}
        style={{ background: 'linear-gradient(160deg, #0a2420 0%, #0f3d35 100%)' }}
      >
        {/* Logo */}
        <div className="px-5 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 border border-white/20 shrink-0">
              <span className="text-base font-black text-white">M+</span>
            </div>
            <div>
              <p className="text-xs font-black tracking-widest uppercase text-teal-300 leading-none">Menuê+</p>
              <p className="text-white font-bold text-sm leading-tight">Painel Master</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ id, label, icon: Icon }) => {
            const ativo = aba === id
            const badge = id === 'parceiros' && novosPartners > 0 ? novosPartners : null
            return (
              <button
                key={id}
                onClick={() => { setAba(id); setSidebarOpen(false) }}
                className={[
                  'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all text-left',
                  ativo
                    ? 'bg-white/15 text-white'
                    : 'text-white/50 hover:bg-white/08 hover:text-white/80',
                ].join(' ')}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {badge && (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white min-w-[20px] text-center">
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Footer sidebar */}
        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <button onClick={carregar}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/08 transition-all">
            <RefreshCw className="w-4 h-4" />
            <span>Atualizar dados</span>
          </button>
          <button onClick={sair}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* ── Conteúdo principal ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header mobile */}
        <header className="md:hidden flex items-center justify-between px-4 py-4 bg-white border-b border-slate-200 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
            <Menu className="w-5 h-5" />
          </button>
          <p className="font-bold text-slate-800 text-sm">{NAV.find(n => n.id === aba)?.label}</p>
          <button onClick={sair} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100">
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        <main className="flex-1 p-4 space-y-4">

          {/* ── ABA: Controle de assinatura ── */}
          {aba === 'assinaturas' && (
            <>
              <div>
                <h2 className="text-xl font-black text-slate-800">Controle de assinatura</h2>
                <p className="text-slate-400 text-sm mt-1">Visão geral de todos os tenants e receita.</p>
              </div>

              {/* Métricas */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard icon={<Store className="w-5 h-5" />} label="Restaurantes ativos"
                  value={ativos.length.toString()} sub={`${tenants.length} total`} accent="#1A9B8A" />
                <MetricCard icon={<DollarSign className="w-5 h-5" />} label="MRR"
                  value={`R$ ${mrr.toLocaleString('pt-BR')}`} sub={`${ativos.length} × R$ ${MENSALIDADE}/mês`} accent="#16a34a" />
                <MetricCard icon={<TrendingUp className="w-5 h-5" />} label="Receita total est."
                  value={`R$ ${receitaTotal.toLocaleString('pt-BR')}`} sub="impl. + mensalidades" accent="#d97706" />
                <MetricCard icon={<Users className="w-5 h-5" />} label="Pedidos gerados"
                  value={totalPedidos.toLocaleString('pt-BR')} sub={`R$ ${totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em vendas`} accent="#7c3aed" />
              </div>

              {/* Tabela de restaurantes */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">
                    Restaurantes
                    <span className="ml-2 text-sm font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-600">{tenants.length}</span>
                  </h3>
                </div>

                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        {['Restaurante', 'Email', 'Slug', '⊞', 'Ped.', 'Faturado', 'Plano', 'Status', 'Cadastro', ''].map((h, i) => (
                          <th key={i} className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400 text-left whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tenants.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-3 max-w-[140px]">
                            <p className="font-bold text-slate-800 text-xs leading-tight truncate">{t.nome_restaurante}</p>
                            <p className="text-slate-400 text-xs mt-0.5 truncate">{t.nome}</p>
                          </td>
                          <td className="px-3 py-3 max-w-[160px]">
                            <span className="text-slate-500 text-xs truncate block">{t.email}</span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-100 whitespace-nowrap">
                              {t.slug}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center font-semibold text-slate-700 whitespace-nowrap">{t.total_mesas}</td>
                          <td className="px-3 py-3 text-center font-semibold text-slate-700 whitespace-nowrap">{t.total_pedidos}</td>
                          <td className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">
                            R$ {t.faturamento_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {t.plano_aceito_em
                              ? <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-green-50 text-green-700 border border-green-100">{t.plano}</span>
                              : <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-100">pendente</span>}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              t.status === 'ativo'
                                ? 'bg-teal-50 text-teal-700 border border-teal-100'
                                : 'bg-red-50 text-red-600 border border-red-100'
                            }`}>{t.status}</span>
                          </td>
                          <td className="px-3 py-3 text-slate-400 text-xs whitespace-nowrap">
                            {new Date(t.criado_em).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              {t.total_mesas === 0 && (
                                <button onClick={() => forcarSetup(t)} disabled={inicializando === t.id}
                                  title="Inicializar mesas" className="p-1 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors disabled:opacity-40">
                                  <Settings2 className={`w-3.5 h-3.5 ${inicializando === t.id ? 'animate-spin' : ''}`} />
                                </button>
                              )}
                              <a href={`${APP_URL}/login`} target="_blank" rel="noopener noreferrer"
                                className="p-1 rounded-lg text-slate-300 hover:text-teal-600 hover:bg-teal-50 transition-colors">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                              <button onClick={() => toggleStatus(t)} disabled={atualizando === t.id}
                                title={t.status === 'ativo' ? 'Suspender' : 'Reativar'}
                                className={`p-1 rounded-lg transition-colors disabled:opacity-40 ${
                                  t.status === 'ativo'
                                    ? 'text-slate-300 hover:text-red-500 hover:bg-red-50'
                                    : 'text-slate-300 hover:text-green-600 hover:bg-green-50'
                                }`}>
                                {t.status === 'ativo' ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {tenants.length === 0 && (
                        <tr><td colSpan={10} className="px-5 py-16 text-center text-slate-300">Nenhum restaurante cadastrado ainda.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile */}
                <div className="md:hidden divide-y divide-slate-100">
                  {tenants.map((t) => (
                    <div key={t.id} className="px-5 py-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-800">{t.nome_restaurante}</p>
                          <p className="text-slate-400 text-xs mt-0.5">{t.email}</p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${
                          t.status === 'ativo' ? 'bg-teal-50 text-teal-700 border border-teal-100' : 'bg-red-50 text-red-600 border border-red-100'
                        }`}>{t.status}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                          { val: t.total_mesas, lbl: 'mesas' },
                          { val: t.total_pedidos, lbl: 'pedidos' },
                          { val: `R$${t.faturamento_total.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, lbl: 'faturado' },
                        ].map(({ val, lbl }) => (
                          <div key={lbl} className="bg-slate-50 rounded-xl py-2.5 border border-slate-100">
                            <p className="font-bold text-slate-800 text-sm">{val}</p>
                            <p className="text-slate-400 text-xs">{lbl}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Breakdown */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-5">Breakdown de receita & uso</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <RevenueItem label="Implementações" value={`R$ ${(ativos.length * IMPLEMENTACAO).toLocaleString('pt-BR')}`}
                    sub={`${ativos.length} × R$ 2.000`} color="#d97706" />
                  <RevenueItem label="Mensalidades (MRR)" value={`R$ ${mrr.toLocaleString('pt-BR')}`}
                    sub={`${ativos.length} × R$ ${MENSALIDADE}/mês`} color="#1A9B8A" />
                  <RevenueItem label="Volume dos clientes" value={`R$ ${totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    sub="soma de todos os pedidos" color="#7c3aed" />
                  <RevenueItem label="Acessos ao cardápio" value={totalSessoes.toLocaleString('pt-BR')}
                    sub="sessões de mesa abertas" color="#0284c7" />
                </div>
              </div>
            </>
          )}

          {/* ── ABA: Performance do sistema ── */}
          {aba === 'performance' && (
            <>
              <div>
                <h2 className="text-xl font-black text-slate-800">Performance do sistema</h2>
                <p className="text-slate-400 text-sm mt-1">Métricas de uso e saúde da plataforma.</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard icon={<Store className="w-5 h-5" />} label="Tenants ativos" value={ativos.length.toString()} sub="plano confirmado" accent="#1A9B8A" />
                <MetricCard icon={<Users className="w-5 h-5" />} label="Sessões de mesa" value={totalSessoes.toLocaleString('pt-BR')} sub="total histórico" accent="#7c3aed" />
                <MetricCard icon={<TrendingUp className="w-5 h-5" />} label="Pedidos gerados" value={totalPedidos.toLocaleString('pt-BR')} sub="total histórico" accent="#d97706" />
                <MetricCard icon={<DollarSign className="w-5 h-5" />} label="Volume processado" value={`R$ ${totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`} sub="nos restaurantes" accent="#16a34a" />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <Gauge className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 font-semibold">Monitoramento avançado em breve</p>
                <p className="text-slate-300 text-sm mt-1">Uptime, latência de API, erros por tenant e alertas em tempo real.</p>
              </div>
            </>
          )}

          {/* ── ABA: Chamados & Suporte ── */}
          {aba === 'suporte' && (
            <>
              <div>
                <h2 className="text-xl font-black text-slate-800">Chamados & Suporte</h2>
                <p className="text-slate-400 text-sm mt-1">Central de atendimento aos clientes.</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <HeadphonesIcon className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 font-semibold">Sistema de chamados em breve</p>
                <p className="text-slate-300 text-sm mt-1">Tickets abertos pelos restaurantes, histórico de atendimento e SLA.</p>
              </div>
            </>
          )}

          {/* ── ABA: Parceiros ── */}
          {aba === 'parceiros' && (
            <>
              <div>
                <h2 className="text-xl font-black text-slate-800">Parceiros</h2>
                <p className="text-slate-400 text-sm mt-1">Leads do programa de indicação. Gerencie o status de cada cadastro.</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard icon={<Handshake className="w-5 h-5" />} label="Total de leads" value={parceiros.length.toString()} sub="desde o início" accent="#1A9B8A" />
                <MetricCard icon={<Users className="w-5 h-5" />} label="Novos" value={parceiros.filter(p => p.status === 'novo').length.toString()} sub="aguardando contato" accent="#0284c7" />
                <MetricCard icon={<TrendingUp className="w-5 h-5" />} label="Contactados" value={parceiros.filter(p => p.status === 'contactado').length.toString()} sub="em negociação" accent="#d97706" />
                <MetricCard icon={<DollarSign className="w-5 h-5" />} label="Aprovados" value={parceiros.filter(p => p.status === 'aprovado').length.toString()} sub="parceiros ativos" accent="#16a34a" />
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800">Cadastros recebidos</h3>
                </div>

                {parceiros.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    <Handshake className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-semibold">Nenhum cadastro ainda</p>
                    <p className="text-slate-300 text-sm mt-1">Os leads virão da página <strong className="text-slate-400">/parceiros</strong>.</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            {['Nome', 'Email', 'WhatsApp', 'Cidade', 'Como indica', 'Cadastro', 'Status', 'Alterar'].map((h) => (
                              <th key={h} className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 text-left">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parceiros.map((p) => {
                            const s = STATUS_PARCEIRO[p.status] ?? STATUS_PARCEIRO.novo
                            return (
                              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-5 py-4 font-bold text-slate-800">{p.nome}</td>
                                <td className="px-5 py-4 text-slate-500 text-xs">{p.email}</td>
                                <td className="px-5 py-4">
                                  <a href={`https://wa.me/55${p.whatsapp}`} target="_blank" rel="noopener noreferrer"
                                    className="text-xs font-mono px-2 py-1 rounded-lg bg-green-50 text-green-700 border border-green-100 hover:bg-green-100 transition-colors">
                                    {p.whatsapp}
                                  </a>
                                </td>
                                <td className="px-5 py-4 text-slate-500 text-xs">{p.cidade ?? '—'}</td>
                                <td className="px-5 py-4 text-slate-500 text-xs">{p.como ? (COMO_LABEL[p.como] ?? p.como) : '—'}</td>
                                <td className="px-5 py-4 text-slate-400 text-xs whitespace-nowrap">
                                  {new Date(p.criado_em).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-5 py-4">
                                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: s.bg, color: s.cor }}>
                                    {s.label}
                                  </span>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="relative flex items-center">
                                    <select value={p.status} disabled={statusEdit === p.id}
                                      onChange={(e) => atualizarStatusParceiro(p.id, e.target.value)}
                                      className="appearance-none text-xs px-3 py-1.5 pr-7 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 cursor-pointer hover:border-teal-300 focus:outline-none disabled:opacity-40">
                                      <option value="novo">Novo</option>
                                      <option value="contactado">Contactado</option>
                                      <option value="aprovado">Aprovado</option>
                                      <option value="recusado">Recusado</option>
                                    </select>
                                    <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile */}
                    <div className="md:hidden divide-y divide-slate-100">
                      {parceiros.map((p) => {
                        const s = STATUS_PARCEIRO[p.status] ?? STATUS_PARCEIRO.novo
                        return (
                          <div key={p.id} className="px-5 py-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-bold text-slate-800">{p.nome}</p>
                                <p className="text-slate-400 text-xs mt-0.5">{p.email}</p>
                              </div>
                              <span className="text-xs px-2.5 py-1 rounded-full font-semibold shrink-0" style={{ background: s.bg, color: s.cor }}>
                                {s.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <a href={`https://wa.me/55${p.whatsapp}`} target="_blank" rel="noopener noreferrer"
                                className="font-mono px-2 py-1 rounded-lg bg-green-50 text-green-700 border border-green-100">
                                {p.whatsapp}
                              </a>
                              {p.cidade && <span className="text-slate-500">{p.cidade}</span>}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 text-xs">{new Date(p.criado_em).toLocaleDateString('pt-BR')}</span>
                              <select value={p.status} disabled={statusEdit === p.id}
                                onChange={(e) => atualizarStatusParceiro(p.id, e.target.value)}
                                className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 disabled:opacity-40">
                                <option value="novo">Novo</option>
                                <option value="contactado">Contactado</option>
                                <option value="aprovado">Aprovado</option>
                                <option value="recusado">Recusado</option>
                              </select>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

        </main>
      </div>
    </div>
  )
}

// ── Sub-componentes ────────────────────────────────────────────────────────
function MetricCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string; sub: string; accent: string
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <div className="inline-flex p-2 rounded-xl mb-3" style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}30` }}>
        {icon}
      </div>
      <p className="text-2xl font-black text-slate-800">{value}</p>
      <p className="text-slate-500 text-sm mt-0.5">{label}</p>
      <p className="text-xs mt-1 font-semibold" style={{ color: accent }}>{sub}</p>
    </div>
  )
}

function RevenueItem({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div>
      <p className="text-slate-500 text-sm mb-1 font-medium">{label}</p>
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
      <p className="text-slate-400 text-xs mt-0.5">{sub}</p>
    </div>
  )
}
