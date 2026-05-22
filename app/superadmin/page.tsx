'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Users, TrendingUp, DollarSign, Store, ExternalLink, ShieldOff, ShieldCheck, Settings2, RefreshCw } from 'lucide-react'

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
}

const MENSALIDADE = 550
const IMPLEMENTACAO = 2000

export default function SuperAdminPage() {
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState<string | null>(null)
  const [inicializando, setInicializando] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Master — Meu Menu+'
    carregar()
  }, [])

  async function carregar() {
    setCarregando(true)
    const res = await fetch('/api/superadmin/tenants')
    if (res.status === 401) { router.push('/superadmin/login'); return }
    const { tenants } = await res.json()
    setTenants(tenants ?? [])
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

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a1628' }}>
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-teal-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-teal-400/60 text-sm">Carregando painel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white" style={{ background: '#0a1628' }}>

      {/* ── Header com gradiente da marca ── */}
      <header style={{ background: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 50%, #1A9B8A 100%)' }}>
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/20">
              <span className="text-lg font-black text-white">M</span>
            </div>
            <div>
              <p className="text-xs font-black tracking-widest uppercase text-teal-300 leading-none">Meu Menu+</p>
              <h1 className="text-xl font-black text-white leading-tight">Painel Master</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={carregar}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white/70 hover:text-white"
              title="Atualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={sair}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-red-500/30 border border-white/20 hover:border-red-500/40 transition-all text-sm text-white/80 hover:text-white"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── Cards de métricas ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            icon={<Store className="w-5 h-5" />}
            label="Restaurantes ativos"
            value={ativos.length.toString()}
            sub={`${tenants.length} total`}
            accent="#1A9B8A"
          />
          <MetricCard
            icon={<DollarSign className="w-5 h-5" />}
            label="MRR"
            value={`R$ ${mrr.toLocaleString('pt-BR')}`}
            sub={`${ativos.length} × R$ 550/mês`}
            accent="#22c55e"
          />
          <MetricCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Receita total est."
            value={`R$ ${receitaTotal.toLocaleString('pt-BR')}`}
            sub="impl. + mensalidades"
            accent="#f59e0b"
          />
          <MetricCard
            icon={<Users className="w-5 h-5" />}
            label="Pedidos gerados"
            value={totalPedidos.toLocaleString('pt-BR')}
            sub={`R$ ${totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em vendas`}
            accent="#8b5cf6"
          />
        </div>

        {/* ── Tabela de restaurantes ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">
              Restaurantes <span className="ml-1" style={{ color: '#1A9B8A' }}>({tenants.length})</span>
            </h2>
          </div>

          <div className="rounded-2xl overflow-hidden border border-white/8" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>

            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'rgba(26,155,138,0.08)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['Restaurante', 'Email', 'Slug', 'Mesas', 'Pedidos', 'Faturado', 'Plano', 'Status', 'Cadastro', ''].map((h, i) => (
                      <th key={i} className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-white/60 ${i >= 3 && i <= 5 ? 'text-center' : i === 5 ? 'text-right' : 'text-left'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t, idx) => (
                    <tr
                      key={t.id}
                      style={{ background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                      className="hover:bg-teal-500/5 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <p className="font-bold text-white">{t.nome_restaurante}</p>
                        <p className="text-white/40 text-xs mt-0.5">{t.nome}</p>
                      </td>
                      <td className="px-5 py-4 text-white text-xs">{t.email}</td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs px-2.5 py-1 rounded-lg whitespace-nowrap" style={{ background: 'rgba(26,155,138,0.15)', color: '#1A9B8A', border: '1px solid rgba(26,155,138,0.3)' }}>
                          {t.slug}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center font-semibold text-white">{t.total_mesas}</td>
                      <td className="px-4 py-4 text-center font-semibold text-white">{t.total_pedidos}</td>
                      <td className="px-4 py-4 text-right font-semibold text-white">
                        R$ {t.faturamento_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {t.plano_aceito_em ? (
                          <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
                            {t.plano}
                          </span>
                        ) : (
                          <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                            pendente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          t.status === 'ativo'
                            ? ''
                            : 'text-red-400'
                        }`} style={t.status === 'ativo' ? { background: 'rgba(26,155,138,0.15)', color: '#1A9B8A', border: '1px solid rgba(26,155,138,0.3)' } : { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-white text-xs">
                        {new Date(t.criado_em).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 justify-end">
                          {t.total_mesas === 0 && (
                            <button onClick={() => forcarSetup(t)} disabled={inicializando === t.id}
                              title="Inicializar mesas e config"
                              className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
                              style={{ color: '#f59e0b' }}
                            >
                              <Settings2 className={`w-4 h-4 ${inicializando === t.id ? 'animate-spin' : ''}`} />
                            </button>
                          )}
                          <a href={`https://${t.slug}.meumenu.com.br/admin`} target="_blank" rel="noopener noreferrer"
                            title="Abrir painel do cliente"
                            className="p-1.5 rounded-lg text-white/30 hover:text-teal-400 transition-colors">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button onClick={() => toggleStatus(t)} disabled={atualizando === t.id}
                            title={t.status === 'ativo' ? 'Suspender' : 'Reativar'}
                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${t.status === 'ativo' ? 'text-white/30 hover:text-red-400' : 'text-white/30 hover:text-green-400'}`}>
                            {t.status === 'ativo' ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {tenants.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-5 py-16 text-center text-white/30">
                        Nenhum restaurante cadastrado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              {tenants.map((t) => (
                <div key={t.id} className="px-5 py-4 space-y-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-white">{t.nome_restaurante}</p>
                      <p className="text-white/40 text-xs mt-0.5">{t.email}</p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold shrink-0"
                      style={t.status === 'ativo'
                        ? { background: 'rgba(26,155,138,0.15)', color: '#1A9B8A', border: '1px solid rgba(26,155,138,0.3)' }
                        : { background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                      {t.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { val: t.total_mesas, lbl: 'mesas' },
                      { val: t.total_pedidos, lbl: 'pedidos' },
                      { val: `R$${(t.faturamento_total).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, lbl: 'faturado' },
                    ].map(({ val, lbl }) => (
                      <div key={lbl} className="rounded-xl py-2.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <p className="font-bold text-white text-sm">{val}</p>
                        <p className="text-white/40 text-xs">{lbl}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(26,155,138,0.15)', color: '#1A9B8A' }}>
                      {t.slug}
                    </span>
                    <div className="flex gap-2">
                      {t.total_mesas === 0 && (
                        <button onClick={() => forcarSetup(t)} disabled={inicializando === t.id} style={{ color: '#f59e0b' }} className="disabled:opacity-40">
                          <Settings2 className={`w-4 h-4 ${inicializando === t.id ? 'animate-spin' : ''}`} />
                        </button>
                      )}
                      <a href={`https://${t.slug}.meumenu.com.br/admin`} target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-teal-400">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button onClick={() => toggleStatus(t)} disabled={atualizando === t.id}
                        className={`disabled:opacity-40 ${t.status === 'ativo' ? 'text-white/30 hover:text-red-400' : 'text-white/30 hover:text-green-400'}`}>
                        {t.status === 'ativo' ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Breakdown de receita ── */}
        <div className="rounded-2xl p-6 border" style={{ background: 'rgba(26,155,138,0.06)', borderColor: 'rgba(26,155,138,0.2)' }}>
          <h3 className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: '#1A9B8A' }}>
            Breakdown de receita
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <RevenueItem
              label="Implementações"
              value={`R$ ${(ativos.length * IMPLEMENTACAO).toLocaleString('pt-BR')}`}
              sub={`${ativos.length} × R$ 2.000`}
              color="#f59e0b"
            />
            <RevenueItem
              label="Mensalidades (MRR)"
              value={`R$ ${mrr.toLocaleString('pt-BR')}`}
              sub={`${ativos.length} × R$ 550/mês`}
              color="#1A9B8A"
            />
            <RevenueItem
              label="Volume dos clientes"
              value={`R$ ${totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              sub="soma de todos os pedidos"
              color="#8b5cf6"
            />
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
    <div className="rounded-2xl p-5 border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="inline-flex p-2 rounded-xl mb-3" style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}30` }}>
        {icon}
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-white/70 text-sm mt-0.5">{label}</p>
      <p className="text-xs mt-1 font-semibold" style={{ color: accent }}>{sub}</p>
    </div>
  )
}

function RevenueItem({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div>
      <p className="text-white/70 text-sm mb-1 font-medium">{label}</p>
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
      <p className="text-white/50 text-xs mt-0.5">{sub}</p>
    </div>
  )
}
