'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LogOut, Users, TrendingUp, DollarSign, Store,
  ExternalLink, ShieldOff, ShieldCheck, Settings2,
  RefreshCw, Handshake, ChevronDown, CreditCard,
  Gauge, HeadphonesIcon, Menu, X, Copy, Check, Link2,
  Banknote, History, CheckCircle2, CircleDashed, Trash2, ChevronRight,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────
type RestauranteIndicado = {
  id:              string
  nome_restaurante: string
  plano:           string
  plano_aceito_em: string | null
  criado_em:       string
}

type Pagamento = {
  id:          string
  parceiro_id: string
  tenant_id:   string | null
  tipo:        'implementacao' | 'recorrente'
  valor:       number
  referencia:  string
  observacao:  string | null
  pago_em:     string
}

type Parceiro = {
  id:                    string
  nome:                  string
  email:                 string
  whatsapp:              string
  cidade:                string | null
  como:                  string | null
  status:                'novo' | 'contactado' | 'aprovado' | 'recusado'
  notas:                 string | null
  criado_em:             string
  codigo_indicacao:      string | null
  restaurantes_indicados: RestauranteIndicado[]
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
const MENSALIDADE   = 550
const IMPLEMENTACAO = 2000
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://menue.com.br'

const TIERS_COMISSAO = [
  { min: 1,  max: 4,  pct: 0.10, label: '10%' },
  { min: 5,  max: 9,  pct: 0.15, label: '15%' },
  { min: 10, max: 14, pct: 0.20, label: '20%' },
  { min: 15, max: 19, pct: 0.25, label: '25%' },
  { min: 20, max: Infinity, pct: 0.30, label: '30%' },
]

function calcComissao(qtd: number) {
  const tier = TIERS_COMISSAO.find(t => qtd >= t.min && qtd <= t.max) ?? TIERS_COMISSAO[0]
  return {
    pct:       tier.pct,
    label:     tier.label,
    mensal:    Math.round(qtd * MENSALIDADE * tier.pct),
    impl:      Math.round(qtd * IMPLEMENTACAO * 0.30),
  }
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

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
  const [copiado,      setCopiado]      = useState<string | null>(null)
  const [expandido,    setExpandido]    = useState<string | null>(null)
  const [pagamentos,   setPagamentos]   = useState<Record<string, Pagamento[]>>({})
  const [pagandoId,    setPagandoId]    = useState<string | null>(null)
  const [mesRef,       setMesRef]       = useState(() => {
    const d = new Date(); return `${d.toLocaleString('pt-BR', { month: 'long' })} ${d.getFullYear()}`
  })

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
    const res = await fetch('/api/superadmin/parceiros', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    const data = await res.json()
    setParceiros((prev) => prev.map((p) => p.id === id ? {
      ...p,
      status: status as Parceiro['status'],
      codigo_indicacao: data.parceiro?.codigo_indicacao ?? p.codigo_indicacao,
    } : p))
    setStatusEdit(null)
  }

  function copiarLink(codigo: string) {
    const link = `${APP_URL}/registro?ref=${codigo}`
    navigator.clipboard.writeText(link).catch(() => {})
    setCopiado(codigo)
    setTimeout(() => setCopiado(null), 2000)
  }

  async function carregarPagamentos(parceiroId: string) {
    if (pagamentos[parceiroId]) return // já carregado
    const res = await fetch(`/api/superadmin/pagamentos?parceiro_id=${parceiroId}`)
    if (res.ok) {
      const data = await res.json()
      setPagamentos(prev => ({ ...prev, [parceiroId]: data.pagamentos ?? [] }))
    }
  }

  async function registrarPagamento(
    parceiroId: string,
    tipo: 'implementacao' | 'recorrente',
    valor: number,
    referencia: string,
    tenantId?: string,
  ) {
    setPagandoId(`${parceiroId}-${tipo}-${referencia}`)
    const res = await fetch('/api/superadmin/pagamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parceiro_id: parceiroId, tenant_id: tenantId ?? null, tipo, valor, referencia }),
    })
    const data = await res.json()
    if (data.ok) {
      setPagamentos(prev => ({
        ...prev,
        [parceiroId]: [data.pagamento, ...(prev[parceiroId] ?? [])],
      }))
    }
    setPagandoId(null)
  }

  async function desfazerPagamento(parceiroId: string, pagamentoId: string) {
    await fetch(`/api/superadmin/pagamentos?id=${pagamentoId}`, { method: 'DELETE' })
    setPagamentos(prev => ({
      ...prev,
      [parceiroId]: (prev[parceiroId] ?? []).filter(p => p.id !== pagamentoId),
    }))
  }

  function implJaPaga(parceiroId: string, tenantId: string) {
    return (pagamentos[parceiroId] ?? []).some(p => p.tipo === 'implementacao' && p.tenant_id === tenantId)
  }

  function recorrenteJaPaga(parceiroId: string, ref: string) {
    return (pagamentos[parceiroId] ?? []).some(p => p.tipo === 'recorrente' && p.referencia === ref)
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
                <p className="text-slate-400 text-sm mt-1">Gerencie os leads do programa de indicação e acompanhe as comissões.</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard icon={<Handshake className="w-5 h-5" />} label="Total de leads" value={parceiros.length.toString()} sub="desde o início" accent="#1A9B8A" />
                <MetricCard icon={<Users className="w-5 h-5" />} label="Novos" value={parceiros.filter(p => p.status === 'novo').length.toString()} sub="aguardando contato" accent="#0284c7" />
                <MetricCard icon={<TrendingUp className="w-5 h-5" />} label="Aprovados" value={parceiros.filter(p => p.status === 'aprovado').length.toString()} sub="parceiros ativos" accent="#16a34a" />
                <MetricCard icon={<DollarSign className="w-5 h-5" />} label="Indicações confirmadas"
                  value={parceiros.reduce((s, p) => s + (p.restaurantes_indicados?.filter(r => r.plano_aceito_em).length ?? 0), 0).toString()}
                  sub="restaurantes convertidos" accent="#d97706" />
              </div>

              {/* Lista de parceiros */}
              <div className="space-y-3">
                {parceiros.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 px-6 py-16 text-center">
                    <Handshake className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-semibold">Nenhum cadastro ainda</p>
                    <p className="text-slate-300 text-sm mt-1">Os leads virão da página <strong className="text-slate-400">/parceiros</strong>.</p>
                  </div>
                ) : parceiros.map((p) => {
                  const s        = STATUS_PARCEIRO[p.status] ?? STATUS_PARCEIRO.novo
                  const ativos   = p.restaurantes_indicados?.filter(r => r.plano_aceito_em).length ?? 0
                  const total    = p.restaurantes_indicados?.length ?? 0
                  const com      = calcComissao(ativos)
                  const aberto   = expandido === p.id
                  const linkRef  = p.codigo_indicacao ? `${APP_URL}/registro?ref=${p.codigo_indicacao}` : null

                  return (
                    <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      {/* Cabeçalho do card */}
                      <div className="px-5 py-4 flex items-start gap-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm text-white"
                          style={{ background: s.cor }}>
                          {p.nome.charAt(0).toUpperCase()}
                        </div>

                        {/* Dados */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-slate-800">{p.nome}</p>
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: s.bg, color: s.cor }}>{s.label}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-400">
                            <span>{p.email}</span>
                            <a href={`https://wa.me/55${p.whatsapp}`} target="_blank" rel="noopener noreferrer"
                              className="text-green-600 hover:underline font-mono">{p.whatsapp}</a>
                            {p.cidade && <span>{p.cidade}</span>}
                            <span>{new Date(p.criado_em).toLocaleDateString('pt-BR')}</span>
                          </div>

                          {/* Link de indicação */}
                          {linkRef && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex-1 min-w-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-50 border border-teal-100">
                                <Link2 className="w-3 h-3 text-teal-500 shrink-0" />
                                <span className="text-xs font-mono text-teal-700 truncate">{linkRef}</span>
                              </div>
                              <button onClick={() => copiarLink(p.codigo_indicacao!)}
                                title="Copiar link" className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-colors shrink-0">
                                {copiado === p.codigo_indicacao
                                  ? <Check className="w-3.5 h-3.5 text-green-500" />
                                  : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          )}

                          {/* Comissão estimada (apenas se aprovado e tem indicações ativas) */}
                          {p.status === 'aprovado' && ativos > 0 && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 font-semibold">
                                {ativos} ativo{ativos > 1 ? 's' : ''} · comissão {com.label}
                              </span>
                              <span className="text-slate-500">
                                ~{fmt(com.mensal)}/mês + {fmt(com.impl)} impl.
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Ações direita */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Alterar status */}
                          <div className="relative">
                            <select value={p.status} disabled={statusEdit === p.id}
                              onChange={(e) => atualizarStatusParceiro(p.id, e.target.value)}
                              className="appearance-none text-xs px-3 py-1.5 pr-7 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 cursor-pointer hover:border-teal-300 focus:outline-none disabled:opacity-40">
                              <option value="novo">Novo</option>
                              <option value="contactado">Contactado</option>
                              <option value="aprovado">Aprovado</option>
                              <option value="recusado">Recusado</option>
                            </select>
                            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>

                          {/* Expandir restaurantes */}
                          {(p.status === 'aprovado' || total > 0) && (
                            <button onClick={() => {
                              const novoAberto = aberto ? null : p.id
                              setExpandido(novoAberto)
                              if (novoAberto) carregarPagamentos(p.id)
                            }}
                              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:border-teal-200 hover:text-teal-600 hover:bg-teal-50 transition-colors">
                              {p.status === 'aprovado' ? <Banknote className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
                              {total > 0 && <span>{total}</span>}
                              <ChevronDown className={`w-3 h-3 transition-transform ${aberto ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Painel expandido: pagamentos */}
                      {aberto && (
                        <div className="border-t border-slate-100 bg-slate-50">
                          <div className="px-5 py-4 space-y-5">

                            {/* ── Implementações ── */}
                            {total > 0 && (
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                                  <Store className="w-3.5 h-3.5" /> Implementações (30% = {fmt(IMPLEMENTACAO * 0.30)}/restaurante)
                                </p>
                                <div className="space-y-2">
                                  {p.restaurantes_indicados.map((r) => {
                                    const pago    = implJaPaga(p.id, r.id)
                                    const valor   = Math.round(IMPLEMENTACAO * 0.30)
                                    const chave   = `${p.id}-implementacao-${r.id}`
                                    const loading = pagandoId === chave
                                    return (
                                      <div key={r.id} className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3">
                                        <div className="flex-1 min-w-0">
                                          <p className="font-semibold text-slate-800 text-sm">{r.nome_restaurante}</p>
                                          <p className="text-xs text-slate-400 mt-0.5">
                                            {r.plano_aceito_em
                                              ? `Ativo desde ${new Date(r.plano_aceito_em).toLocaleDateString('pt-BR')}`
                                              : 'Ainda pendente de plano'}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <span className="text-sm font-black text-slate-700">{fmt(valor)}</span>
                                          {pago ? (
                                            <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 border border-green-100 px-2.5 py-1 rounded-lg">
                                              <CheckCircle2 className="w-3.5 h-3.5" /> Pago
                                            </span>
                                          ) : (
                                            <button
                                              disabled={!r.plano_aceito_em || loading}
                                              onClick={() => registrarPagamento(p.id, 'implementacao', valor, r.nome_restaurante, r.id)}
                                              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                              {loading ? <CircleDashed className="w-3.5 h-3.5 animate-spin" /> : <Banknote className="w-3.5 h-3.5" />}
                                              Marcar pago
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {/* ── Recorrente mensal ── */}
                            {p.status === 'aprovado' && ativos > 0 && (
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                                  <TrendingUp className="w-3.5 h-3.5" /> Recorrente mensal ({com.label} = {fmt(com.mensal)}/mês)
                                </p>
                                <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-slate-700">{ativos} restaurante{ativos > 1 ? 's' : ''} ativo{ativos > 1 ? 's' : ''}</p>
                                      <p className="text-xs text-slate-400 mt-0.5">Referência do mês:</p>
                                    </div>
                                    <input
                                      value={mesRef}
                                      onChange={e => setMesRef(e.target.value)}
                                      placeholder="Ex: Maio 2026"
                                      className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 w-32 text-slate-700 focus:outline-none focus:border-teal-300"
                                    />
                                    <span className="text-sm font-black text-slate-700">{fmt(com.mensal)}</span>
                                    {recorrenteJaPaga(p.id, mesRef) ? (
                                      <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 border border-green-100 px-2.5 py-1 rounded-lg">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Pago
                                      </span>
                                    ) : (
                                      <button
                                        disabled={!mesRef || pagandoId === `${p.id}-recorrente-${mesRef}`}
                                        onClick={() => registrarPagamento(p.id, 'recorrente', com.mensal, mesRef)}
                                        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors disabled:opacity-40"
                                      >
                                        {pagandoId === `${p.id}-recorrente-${mesRef}`
                                          ? <CircleDashed className="w-3.5 h-3.5 animate-spin" />
                                          : <Banknote className="w-3.5 h-3.5" />}
                                        Marcar pago
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* ── Histórico de pagamentos ── */}
                            {(pagamentos[p.id] ?? []).length > 0 && (
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                                  <History className="w-3.5 h-3.5" /> Histórico de pagamentos
                                </p>
                                <div className="space-y-1.5">
                                  {(pagamentos[p.id] ?? []).map(pg => (
                                    <div key={pg.id} className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-2.5">
                                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${pg.tipo === 'implementacao' ? 'bg-blue-400' : 'bg-green-400'}`} />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-slate-700">
                                          {pg.tipo === 'implementacao' ? '🏗️ Impl.' : '📅 Recorrente'} — {pg.referencia}
                                        </p>
                                        <p className="text-xs text-slate-400">{new Date(pg.pago_em).toLocaleDateString('pt-BR')}</p>
                                      </div>
                                      <span className="text-sm font-black text-green-600">{fmt(pg.valor)}</span>
                                      <button
                                        onClick={() => desfazerPagamento(p.id, pg.id)}
                                        title="Desfazer pagamento"
                                        className="p-1 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                <p className="text-xs text-slate-400 mt-2 text-right">
                                  Total pago: <span className="font-black text-slate-600">
                                    {fmt((pagamentos[p.id] ?? []).reduce((s, pg) => s + Number(pg.valor), 0))}
                                  </span>
                                </p>
                              </div>
                            )}

                            {total === 0 && ativos === 0 && (pagamentos[p.id] ?? []).length === 0 && (
                              <p className="text-sm text-slate-400 text-center py-4">
                                Nenhuma indicação ainda. Compartilhe o link com o parceiro.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
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
