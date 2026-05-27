'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Clock, DollarSign,
  BookOpen, QrCode, ConciergeBell, Users, ChevronDown, ChevronRight,
  Settings, LogOut, Menu, X, UserCog, Building2, Check, Loader2, Lock, Truck
} from 'lucide-react'
import { getPlanoConfig } from '@/lib/planos'

const NAV = [
  { href: '/admin',                label: 'Visão ao Vivo', icon: LayoutDashboard, apenasAdmin: false, flag: null        },
  { href: '/admin/clientes',       label: 'Clientes',      icon: Users,           apenasAdmin: true,  flag: null        },
  { href: '/admin/tempo',          label: 'Performance',   icon: Clock,           apenasAdmin: true,  flag: null        },
  { href: '/admin/faturamento',    label: 'Financeiro',    icon: DollarSign,      apenasAdmin: true,  flag: null        },
  { href: '/admin/cardapio',       label: 'Cardápio',      icon: BookOpen,        apenasAdmin: true,  flag: null        },
  { href: '/admin/mesas',          label: 'Mesas & QR',    icon: QrCode,          apenasAdmin: true,  flag: null        },
  { href: '/admin/delivery',       label: 'Delivery',      icon: Truck,           apenasAdmin: true,  flag: 'delivery'  },
  { href: '/admin/equipe',         label: 'Equipe',        icon: UserCog,         apenasAdmin: true,  flag: null        },
  { href: '/admin/configuracoes',  label: 'Configurações', icon: Settings,        apenasAdmin: true,  flag: null        },
]

const OPERACOES = [
  { href: '/garcom',          emoji: '🛎️', label: 'Painel do Garçom' },
  { href: '/entrega',         emoji: '🛵', label: 'Painel Entrega'   },
  { href: '/estacao/cozinha', emoji: '🍳', label: 'Cozinha'          },
  { href: '/estacao/bar',     emoji: '🍺', label: 'Bar'              },
  { href: '/estacao/drinks',  emoji: '🍹', label: 'Drinks'           },
  { href: '/estacao/chopeira',emoji: '🍻', label: 'Chopeira'         },
]

// ─── Hook: carrega restaurantes disponíveis para o usuário logado ─────────────
interface Restaurante {
  usuario_id:       string
  cargo:            string
  tenant_id:        string
  nome_restaurante: string
  ativo_agora:      boolean
}

function useRestaurantes() {
  const [lista,        setLista]        = useState<Restaurante[]>([])
  const [carregando,   setCarregando]   = useState(false)
  const [carregado,    setCarregado]    = useState(false)

  async function carregar() {
    if (carregado || carregando) return
    setCarregando(true)
    try {
      const res  = await fetch('/api/admin/meus-restaurantes')
      const data = await res.json()
      if (res.ok) setLista(data.restaurantes ?? [])
    } finally {
      setCarregando(false)
      setCarregado(true)
    }
  }

  return { lista, carregando, carregar }
}

// ─── Switcher de restaurante ─────────────────────────────────────────────────
function RestauranteSwitcher({ onClose }: { onClose: () => void }) {
  const router  = useRouter()
  const { lista, carregando, carregar } = useRestaurantes()
  const [trocando, setTrocando] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    carregar()

    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function trocar(r: Restaurante) {
    if (r.ativo_agora || trocando) return
    setTrocando(r.usuario_id)

    const res = await fetch('/api/admin/auth/selecionar', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ usuario_id: r.usuario_id }),
    })

    if (res.ok) {
      router.push('/admin')
      router.refresh()
      onClose()
    } else {
      setTrocando(null)
    }
  }

  const atual = lista.find((r) => r.ativo_agora)

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-1 z-50 w-64 bg-teal-950 border border-teal-700/60 rounded-xl shadow-2xl overflow-hidden"
    >
      <p className="px-3 py-2 text-teal-500 text-[10px] font-bold uppercase tracking-widest border-b border-teal-800">
        Meus restaurantes
      </p>

      {carregando && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
        </div>
      )}

      {!carregando && lista.length === 0 && (
        <p className="px-3 py-4 text-teal-600 text-xs text-center">
          Nenhum restaurante encontrado.
        </p>
      )}

      {!carregando && lista.map((r) => (
        <button
          key={r.usuario_id}
          onClick={() => trocar(r)}
          disabled={r.ativo_agora || !!trocando}
          className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-colors ${
            r.ativo_agora
              ? 'bg-teal-800/40 cursor-default'
              : 'hover:bg-teal-800/60 cursor-pointer'
          }`}
        >
          <Building2 className={`w-4 h-4 shrink-0 ${r.ativo_agora ? 'text-teal-300' : 'text-teal-600'}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium leading-tight truncate ${r.ativo_agora ? 'text-white' : 'text-teal-300'}`}>
              {r.nome_restaurante}
            </p>
            <p className="text-teal-600 text-xs capitalize mt-0.5">{r.cargo}</p>
          </div>
          {r.ativo_agora && <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />}
          {trocando === r.usuario_id && <Loader2 className="w-3.5 h-3.5 text-teal-400 animate-spin shrink-0" />}
        </button>
      ))}
    </div>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
export function AdminSidebar({
  cargo,
  nomeRestaurante,
  plano,
}: {
  cargo: 'admin' | 'operador'
  nomeRestaurante?: string
  plano?: string
}) {
  const pathname = usePathname()
  const router   = useRouter()
  const [operacoesAberto, setOperacoesAberto] = useState(false)
  const [drawerAberto,    setDrawerAberto]    = useState(false)
  const [switcherAberto,  setSwitcherAberto]  = useState(false)

  const navFiltrado = NAV.filter((n) => !n.apenasAdmin || cargo === 'admin')


  // Rotas bloqueadas pelo plano atual (só aplica quando plano_ativo=sim — verificado no middleware)
  const planoConfig = getPlanoConfig(plano)
  const bloqueado   = planoConfig.bloqueado

  // Feature flags — itens de nav que dependem de um flag de plano
  function isBloqueadoPorFlag(flag: string | null): boolean {
    if (!flag) return false
    const val = (planoConfig as unknown as Record<string, unknown>)[flag]
    return !val
  }

  async function sair() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/login')
    router.refresh()
  }

  const navContent = (onLinkClick?: () => void) => (
    <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
      {navFiltrado.map(({ href, label, icon: Icon, flag }) => {
        const ativo        = pathname === href
        const restrito     = bloqueado.some((r) => href.startsWith(r))
        const flagBloqueado = isBloqueadoPorFlag(flag)
        const qualquerBloqueio = restrito || flagBloqueado
        return (
          <Link
            key={href}
            href={href}
            onClick={onLinkClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              ativo
                ? 'bg-teal-600 text-white font-medium'
                : qualquerBloqueio
                  ? 'text-slate-500 hover:bg-teal-800 hover:text-slate-300'
                  : 'text-slate-400 hover:bg-teal-800 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="flex-1">{label}</span>
            {qualquerBloqueio && (
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-500" />
                <span className="text-[9px] font-bold uppercase tracking-wide bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded">
                  Business
                </span>
              </span>
            )}
          </Link>
        )
      })}

      <div className="pt-2">
        <button
          onClick={() => setOperacoesAberto((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold text-teal-300 hover:bg-teal-800 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <ConciergeBell className="w-4 h-4" />
            Operações
          </span>
          {operacoesAberto
            ? <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            : <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
        </button>

        {operacoesAberto && (
          <div className="mt-1 ml-2 space-y-0.5">
            {OPERACOES.map((op) => (
              <a
                key={op.href}
                href={op.href}
                target="_blank"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:bg-teal-800 hover:text-white transition-colors"
              >
                <span className="text-sm leading-none">{op.emoji}</span>
                {op.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </nav>
  )

  // Header da sidebar com switcher de restaurante
  const header = (
    <div className="px-5 py-6 border-b border-white/10">
      <div className="flex items-center gap-3">
        {/* Ícone M+ */}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 border border-white/20 shrink-0">
          <span className="text-base font-black text-white">M+</span>
        </div>
        {/* Nome */}
        <div className="relative flex-1 min-w-0">
          <button
            onClick={() => setSwitcherAberto((v) => !v)}
            className="group w-full text-left"
            title="Trocar restaurante"
          >
            <p className="font-black tracking-widest text-xs uppercase text-teal-300 leading-none">Menuê+</p>
            <p className="text-white font-bold text-sm leading-tight mt-0.5 truncate group-hover:text-teal-300 transition-colors">
              {nomeRestaurante ?? 'Meu Restaurante'}
              <ChevronDown className="inline w-3 h-3 ml-0.5 opacity-40" />
            </p>
          </button>

          {switcherAberto && (
            <RestauranteSwitcher onClose={() => setSwitcherAberto(false)} />
          )}
        </div>

        <button onClick={sair} title="Sair" className="text-teal-600 hover:text-red-400 transition-colors p-1 shrink-0">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Desktop: sidebar fixa ── */}
      <aside className="hidden md:flex w-56 bg-teal-900 text-white flex-col shrink-0">
        {header}
        {navContent()}
      </aside>

      {/* ── Mobile: top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-teal-900 flex items-center justify-between px-4 py-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 border border-white/20 shrink-0">
            <span className="text-sm font-black text-white">M+</span>
          </div>
          <div>
            <p className="font-black tracking-widest text-xs uppercase text-teal-300 leading-none">Menuê+</p>
            {nomeRestaurante
              ? <p className="text-white font-semibold text-sm leading-tight truncate max-w-[160px]">{nomeRestaurante}</p>
              : <p className="text-teal-400 text-xs">cardápio digital</p>}
          </div>
        </div>
        <button
          onClick={() => setDrawerAberto(true)}
          className="text-white p-1.5 rounded-lg hover:bg-teal-800 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* ── Mobile: drawer overlay ── */}
      {drawerAberto && (
        <div className="md:hidden fixed inset-0 z-50 flex" onClick={() => setDrawerAberto(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative w-64 bg-teal-900 text-white flex flex-col h-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-4 border-b border-teal-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 border border-white/20 shrink-0">
                  <span className="text-sm font-black text-white">M+</span>
                </div>
                <div className="min-w-0">
                  <p className="font-black tracking-widest text-xs uppercase text-teal-300 leading-none">Menuê+</p>
                  {nomeRestaurante && (
                    <p className="text-white text-xs font-semibold mt-0.5 truncate">{nomeRestaurante}</p>
                  )}
                </div>
              </div>
              <button onClick={() => setDrawerAberto(false)} className="text-teal-400 hover:text-white p-1 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            {navContent(() => setDrawerAberto(false))}
            <div className="px-4 py-4 border-t border-teal-700">
              <button
                onClick={sair}
                className="flex items-center gap-2 text-sm text-teal-400 hover:text-red-400 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
