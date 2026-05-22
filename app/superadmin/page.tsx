'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Users, TrendingUp, DollarSign, Store, ExternalLink, ShieldOff, ShieldCheck } from 'lucide-react'

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

export default function SuperAdminPage() {
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Master — Meu Menu+'
    carregar()
  }, [])

  async function carregar() {
    const res = await fetch('/api/superadmin/tenants')
    if (res.status === 401) {
      router.push('/superadmin/login')
      return
    }
    const { tenants } = await res.json()
    setTenants(tenants ?? [])
    setCarregando(false)
  }

  async function toggleStatus(tenant: Tenant) {
    const novoStatus = tenant.status === 'ativo' ? 'suspenso' : 'ativo'
    setAtualizando(tenant.id)

    await fetch('/api/superadmin/tenants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tenant.id, status: novoStatus }),
    })

    setTenants((prev) =>
      prev.map((t) => t.id === tenant.id ? { ...t, status: novoStatus } : t)
    )
    setAtualizando(null)
  }

  async function sair() {
    await fetch('/api/superadmin/auth', { method: 'DELETE' })
    router.push('/superadmin/login')
  }

  const ativos = tenants.filter((t) => t.status === 'ativo' && t.plano_aceito_em)
  const mrr = ativos.length * MENSALIDADE
  const totalPedidos = tenants.reduce((s, t) => s + t.total_pedidos, 0)
  const totalFaturado = tenants.reduce((s, t) => s + t.faturamento_total, 0)

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-black tracking-widest uppercase text-teal-400">Meu Menu+</p>
          <h1 className="text-lg font-bold text-white leading-tight">Painel Master</h1>
        </div>
        <button
          onClick={sair}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card icon={<Store className="w-5 h-5" />} label="Restaurantes ativos" value={ativos.length.toString()} color="teal" />
          <Card icon={<Users className="w-5 h-5" />} label="Total cadastros" value={tenants.length.toString()} color="blue" />
          <Card icon={<DollarSign className="w-5 h-5" />} label="MRR estimado" value={`R$ ${mrr.toLocaleString('pt-BR')}`} color="green" />
          <Card icon={<TrendingUp className="w-5 h-5" />} label="Pedidos gerados" value={totalPedidos.toLocaleString('pt-BR')} color="purple" />
        </div>

        {/* Tabela de tenants */}
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Todos os restaurantes ({tenants.length})
          </h2>

          <div className="rounded-2xl border border-slate-800 overflow-hidden">
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50">
                    <th className="text-left px-5 py-3 text-slate-400 font-medium">Restaurante</th>
                    <th className="text-left px-5 py-3 text-slate-400 font-medium">Email</th>
                    <th className="text-left px-5 py-3 text-slate-400 font-medium">Slug</th>
                    <th className="text-center px-4 py-3 text-slate-400 font-medium">Mesas</th>
                    <th className="text-center px-4 py-3 text-slate-400 font-medium">Pedidos</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Faturado</th>
                    <th className="text-center px-4 py-3 text-slate-400 font-medium">Plano</th>
                    <th className="text-center px-4 py-3 text-slate-400 font-medium">Status</th>
                    <th className="text-center px-4 py-3 text-slate-400 font-medium">Cadastro</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {tenants.map((t) => (
                    <tr key={t.id} className="bg-slate-900 hover:bg-slate-800/60 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-white">{t.nome_restaurante}</p>
                        <p className="text-slate-500 text-xs">{t.nome}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-300">{t.email}</td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-teal-400 text-xs bg-teal-950/40 px-2 py-0.5 rounded">
                          {t.slug}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-slate-300">{t.total_mesas}</td>
                      <td className="px-4 py-4 text-center text-slate-300">{t.total_pedidos}</td>
                      <td className="px-4 py-4 text-right text-slate-300">
                        R$ {t.faturamento_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {t.plano_aceito_em ? (
                          <span className="text-xs bg-green-900/40 text-green-400 border border-green-900/60 px-2 py-0.5 rounded-full">
                            {t.plano}
                          </span>
                        ) : (
                          <span className="text-xs bg-yellow-900/40 text-yellow-400 border border-yellow-900/60 px-2 py-0.5 rounded-full">
                            pendente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          t.status === 'ativo'
                            ? 'bg-teal-900/40 text-teal-400 border-teal-900/60'
                            : 'bg-red-900/40 text-red-400 border-red-900/60'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-slate-500 text-xs">
                        {new Date(t.criado_em).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          <a
                            href={`https://${t.slug}.meumenu.com.br/admin`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-500 hover:text-teal-400 transition-colors"
                            title="Abrir painel do cliente"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => toggleStatus(t)}
                            disabled={atualizando === t.id}
                            title={t.status === 'ativo' ? 'Suspender acesso' : 'Reativar acesso'}
                            className={`transition-colors disabled:opacity-40 ${
                              t.status === 'ativo'
                                ? 'text-slate-500 hover:text-red-400'
                                : 'text-slate-500 hover:text-green-400'
                            }`}
                          >
                            {t.status === 'ativo'
                              ? <ShieldOff className="w-4 h-4" />
                              : <ShieldCheck className="w-4 h-4" />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {tenants.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-5 py-12 text-center text-slate-500">
                        Nenhum restaurante cadastrado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile: cards */}
            <div className="md:hidden divide-y divide-slate-800">
              {tenants.map((t) => (
                <div key={t.id} className="bg-slate-900 px-5 py-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white">{t.nome_restaurante}</p>
                      <p className="text-slate-400 text-xs">{t.email}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${
                      t.status === 'ativo'
                        ? 'bg-teal-900/40 text-teal-400 border-teal-900/60'
                        : 'bg-red-900/40 text-red-400 border-red-900/60'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-slate-800 rounded-xl py-2">
                      <p className="text-white font-bold">{t.total_mesas}</p>
                      <p className="text-slate-500 text-xs">mesas</p>
                    </div>
                    <div className="bg-slate-800 rounded-xl py-2">
                      <p className="text-white font-bold">{t.total_pedidos}</p>
                      <p className="text-slate-500 text-xs">pedidos</p>
                    </div>
                    <div className="bg-slate-800 rounded-xl py-2">
                      <p className="text-white font-bold text-xs">
                        R$ {(t.faturamento_total / 100).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                      </p>
                      <p className="text-slate-500 text-xs">faturado</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-teal-400 text-xs bg-teal-950/40 px-2 py-0.5 rounded">
                      {t.slug}
                    </span>
                    <div className="flex gap-3">
                      <a href={`https://${t.slug}.meumenu.com.br/admin`} target="_blank" rel="noopener noreferrer"
                        className="text-slate-500 hover:text-teal-400">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button onClick={() => toggleStatus(t)} disabled={atualizando === t.id}
                        className={`transition-colors disabled:opacity-40 ${
                          t.status === 'ativo' ? 'text-slate-500 hover:text-red-400' : 'text-slate-500 hover:text-green-400'
                        }`}>
                        {t.status === 'ativo' ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rodapé com MRR breakdown */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Receita estimada</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-slate-500 text-sm">Implementações vendidas</p>
              <p className="text-2xl font-bold text-white mt-1">
                R$ {(ativos.length * 2000).toLocaleString('pt-BR')}
              </p>
              <p className="text-slate-500 text-xs mt-0.5">{ativos.length} × R$ 2.000</p>
            </div>
            <div>
              <p className="text-slate-500 text-sm">MRR (mensalidades)</p>
              <p className="text-2xl font-bold text-teal-400 mt-1">
                R$ {mrr.toLocaleString('pt-BR')}
              </p>
              <p className="text-slate-500 text-xs mt-0.5">{ativos.length} × R$ 550/mês</p>
            </div>
            <div>
              <p className="text-slate-500 text-sm">Volume processado pelos clientes</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                R$ {totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-slate-500 text-xs mt-0.5">soma de todos os pedidos</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function Card({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: string
  color: 'teal' | 'blue' | 'green' | 'purple'
}) {
  const colors = {
    teal:   'bg-teal-500/10 text-teal-400 border-teal-900/40',
    blue:   'bg-blue-500/10 text-blue-400 border-blue-900/40',
    green:  'bg-green-500/10 text-green-400 border-green-900/40',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-900/40',
  }

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
      <div className={`inline-flex p-2 rounded-xl border ${colors[color]} mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-slate-500 text-xs mt-0.5">{label}</p>
    </div>
  )
}
