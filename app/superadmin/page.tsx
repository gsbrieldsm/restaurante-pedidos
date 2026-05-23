'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Users, TrendingUp, DollarSign, Store, ExternalLink, ShieldOff, ShieldCheck, Settings2, RefreshCw, Handshake, ChevronDown } from 'lucide-react'

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

const MENSALIDADE = 550
const IMPLEMENTACAO = 2000
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://menue.com.br'

const STATUS_PARCEIRO: Record<string, { label: string; cor: string; bg: string }> = {
  novo:        { label: 'Novo',        cor: '#0284c7', bg: '#e0f2fe' },
  contactado:  { label: 'Contactado',  cor: '#d97706', bg: '#fef3c7' },
  aprovado:    { label: 'Aprovado',    cor: '#16a34a', bg: '#dcfce7' },
  recusado:    { label: 'Recusado',    cor: '#dc2626', bg: '#fee2e2' },
}

const COMO_LABEL: Record<string, string> = {
  rede_pessoal:  'Rede pessoal',
  redes_sociais: 'Redes sociais',
  consultor:     'Consultor',
  agencia:       'Agência',
  outro:         'Outro',
}

export default function SuperAdminPage() {
  const router = useRouter()
  const [tenants, setTenants]         = useState<Tenant[]>([])
  const [parceiros, setParceiros]     = useState<Parceiro[]>([])
  const [carregando, setCarregando]   = useState(true)
  const [atualizando, setAtualizando] = useState<string | null>(null)
  const [inicializando, setInicializando] = useState<string | null>(null)
  const [statusEditando, setStatusEditando] = useState<string | null>(null)

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

      const resParceiros = await fetch('/api/superadmin/parceiros')
      if (resParceiros.ok) {
        const { parceiros } = await resParceiros.json()
        setParceiros(parceiros ?? [])
      }
    } catch (err) {
      console.error('[superadmin] erro ao carregar:', err)
    } finally {
      setCarregando(false)
    }
  }

  async function atualizarStatusParceiro(id: string, status: string) {
    setStatusEditando(id)
    await fetch('/api/superadmin/parceiros', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setParceiros((prev) => prev.map((p) => p.id === id ? { ...p, status: status as Parceiro['status'] } : p))
    setStatusEditando(null)
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
      setTenants((prev) =>
        prev.map((t) => t.id === tenant.id ? { ...t, total_mesas: data.ja_configurado ? t.total_mesas : 10 } : t)
      )
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

  async function sair() {
    await fetch('/api/superadmin/auth', { method: 'DELETE' })
    router.push('/superadmin/login')
  }

  const ativos = tenants.filter((t) => t.status === 'ativo' && t.plano_aceito_em)
  const mrr = ativos.length * MENSALIDADE
  const receitaTotal = ativos.length * IMPLEMENTACAO + mrr
  const totalPedidos = tenants.reduce((s, t) => s + t.total_pedidos, 0)
  const totalFaturado = tenants.reduce((s, t) => s + t.faturamento_total, 0)
  const totalSessoes = tenants.reduce((s, t) => s + t.total_sessoes, 0)

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
    <div className="min-h-screen bg-slate-100">

      {/* ── Header gradiente da marca ── */}
      <header style={{ background: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 50%, #1A9B8A 100%)' }}>
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/10 border border-white/20">
              <span className="text-lg font-black text-white">M+</span>
            </div>
            <div>
              <p className="text-xs font-black tracking-widest uppercase text-teal-300 leading-none">Menuê+</p>
              <h1 className="text-xl font-black text-white leading-tight">Painel Master</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={carregar} title="Atualizar"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white/80 hover:text-white">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={sair}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-red-500/30 border border-white/20 hover:border-red-400/40 transition-all text-sm text-white font-medium">
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* ── Cards de métricas ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard icon={<Store className="w-5 h-5" />} label="Restaurantes ativos"
            value={ativos.length.toString()} sub={`${tenants.length} total`} accent="#1A9B8A" />
          <MetricCard icon={<DollarSign className="w-5 h-5" />} label="MRR"
            value={`R$ ${mrr.toLocaleString('pt-BR')}`} sub={`${ativos.length} × R$ 550/mês`} accent="#16a34a" />
          <MetricCard icon={<TrendingUp className="w-5 h-5" />} label="Receita total est."
            value={`R$ ${receitaTotal.toLocaleString('pt-BR')}`} sub="impl. + mensalidades" accent="#d97706" />
          <MetricCard icon={<Users className="w-5 h-5" />} label="Pedidos gerados"
            value={totalPedidos.toLocaleString('pt-BR')} sub={`R$ ${totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em vendas`} accent="#7c3aed" />
        </div>

        {/* ── Parceiros — leads do programa de indicação ── */}
        <ParceirosSection
          parceiros={parceiros}
          statusEditando={statusEditando}
          onStatusChange={atualizarStatusParceiro}
        />

        {/* ── Tabela de restaurantes ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">
              Restaurantes
              <span className="ml-2 text-sm font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-600">{tenants.length}</span>
            </h2>
          </div>

          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Restaurante', 'Email', 'Slug', 'Mesas', 'Pedidos', 'Faturado', 'Plano', 'Status', 'Cadastro', ''].map((h, i) => (
                    <th key={i} className={`px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 ${[3,4,5,6,7,8].includes(i) ? 'text-center' : i === 5 ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-800">{t.nome_restaurante}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{t.nome}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600 text-xs">{t.email}</td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs px-2.5 py-1 rounded-lg whitespace-nowrap bg-teal-50 text-teal-700 border border-teal-100">
                        {t.slug}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center font-semibold text-slate-700">{t.total_mesas}</td>
                    <td className="px-4 py-4 text-center font-semibold text-slate-700">{t.total_pedidos}</td>
                    <td className="px-4 py-4 text-right font-semibold text-slate-700">
                      R$ {t.faturamento_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {t.plano_aceito_em ? (
                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-green-50 text-green-700 border border-green-100">
                          {t.plano}
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                          pendente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        t.status === 'ativo'
                          ? 'bg-teal-50 text-teal-700 border border-teal-100'
                          : 'bg-red-50 text-red-600 border border-red-100'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-slate-400 text-xs">
                      {new Date(t.criado_em).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 justify-end">
                        {t.total_mesas === 0 && (
                          <button onClick={() => forcarSetup(t)} disabled={inicializando === t.id}
                            title="Inicializar mesas" className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors disabled:opacity-40">
                            <Settings2 className={`w-4 h-4 ${inicializando === t.id ? 'animate-spin' : ''}`} />
                          </button>
                        )}
                        <a href={`${APP_URL}/login`} target="_blank" rel="noopener noreferrer"
                          title={`Abrir login do cliente (${APP_URL}/login)`}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-teal-600 hover:bg-teal-50 transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button onClick={() => toggleStatus(t)} disabled={atualizando === t.id}
                          title={t.status === 'ativo' ? 'Suspender' : 'Reativar'}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                            t.status === 'ativo'
                              ? 'text-slate-300 hover:text-red-500 hover:bg-red-50'
                              : 'text-slate-300 hover:text-green-600 hover:bg-green-50'
                          }`}>
                          {t.status === 'ativo' ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-5 py-16 text-center text-slate-300">
                      Nenhum restaurante cadastrado ainda.
                    </td>
                  </tr>
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
                  }`}>
                    {t.status}
                  </span>
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
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-100">
                    {t.slug}
                  </span>
                  <div className="flex gap-2">
                    {t.total_mesas === 0 && (
                      <button onClick={() => forcarSetup(t)} disabled={inicializando === t.id}
                        className="text-amber-500 disabled:opacity-40">
                        <Settings2 className={`w-4 h-4 ${inicializando === t.id ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                    <a href={`${APP_URL}/login`} target="_blank" rel="noopener noreferrer"
                      className="text-slate-300 hover:text-teal-600">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button onClick={() => toggleStatus(t)} disabled={atualizando === t.id}
                      className={`disabled:opacity-40 ${t.status === 'ativo' ? 'text-slate-300 hover:text-red-500' : 'text-slate-300 hover:text-green-600'}`}>
                      {t.status === 'ativo' ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Breakdown de receita & uso ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-5">
            Breakdown de receita & uso
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <RevenueItem label="Implementações"
              value={`R$ ${(ativos.length * IMPLEMENTACAO).toLocaleString('pt-BR')}`}
              sub={`${ativos.length} × R$ 2.000`} color="#d97706" />
            <RevenueItem label="Mensalidades (MRR)"
              value={`R$ ${mrr.toLocaleString('pt-BR')}`}
              sub={`${ativos.length} × R$ 550/mês`} color="#1A9B8A" />
            <RevenueItem label="Volume dos clientes"
              value={`R$ ${totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              sub="soma de todos os pedidos" color="#7c3aed" />
            <RevenueItem label="Acessos ao cardápio"
              value={totalSessoes.toLocaleString('pt-BR')}
              sub="sessões de mesa abertas" color="#0284c7" />
          </div>
        </div>

      </div>
    </div>
  )
}

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

function ParceirosSection({ parceiros, statusEditando, onStatusChange }: {
  parceiros: Parceiro[]
  statusEditando: string | null
  onStatusChange: (id: string, status: string) => void
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Handshake className="w-4 h-4 text-teal-600" />
          <h2 className="font-bold text-slate-800">
            Leads de Parceiros
            <span className="ml-2 text-sm font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-600">
              {parceiros.length}
            </span>
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="font-semibold text-blue-600">{parceiros.filter(p => p.status === 'novo').length} novos</span>
          <span className="font-semibold text-green-600">{parceiros.filter(p => p.status === 'aprovado').length} aprovados</span>
        </div>
      </div>

      {parceiros.length === 0 ? (
        <div className="px-6 py-12 text-center text-slate-300 text-sm">
          Nenhum cadastro de parceiro ainda. Os leads virão de <strong className="text-slate-400">/parceiros</strong>.
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
                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                          style={{ background: s.bg, color: s.cor }}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="relative flex items-center">
                          <select
                            value={p.status}
                            disabled={statusEditando === p.id}
                            onChange={(e) => onStatusChange(p.id, e.target.value)}
                            className="appearance-none text-xs px-3 py-1.5 pr-7 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 cursor-pointer hover:border-teal-300 focus:outline-none focus:border-teal-400 transition-colors disabled:opacity-40"
                          >
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
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold shrink-0"
                      style={{ background: s.bg, color: s.cor }}>
                      {s.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <a href={`https://wa.me/55${p.whatsapp}`} target="_blank" rel="noopener noreferrer"
                      className="font-mono px-2 py-1 rounded-lg bg-green-50 text-green-700 border border-green-100">
                      {p.whatsapp}
                    </a>
                    {p.cidade && <span>{p.cidade}</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs">{new Date(p.criado_em).toLocaleDateString('pt-BR')}</span>
                    <select value={p.status} disabled={statusEditando === p.id}
                      onChange={(e) => onStatusChange(p.id, e.target.value)}
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
  )
}
