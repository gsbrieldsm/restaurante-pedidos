'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Clock, DollarSign,
  BookOpen, QrCode, ConciergeBell, Users, ChevronDown, ChevronRight, Settings, LogOut, Menu, X, UserCog
} from 'lucide-react'
import { useRouter } from 'next/navigation'

const NAV = [
  { href: '/admin',                label: 'Visão ao Vivo', icon: LayoutDashboard, apenasAdmin: false },
  { href: '/admin/clientes',       label: 'Clientes',      icon: Users,           apenasAdmin: true  },
  { href: '/admin/tempo',          label: 'Performance',   icon: Clock,           apenasAdmin: true  },
  { href: '/admin/faturamento',    label: 'Financeiro',    icon: DollarSign,      apenasAdmin: true  },
  { href: '/admin/cardapio',       label: 'Cardápio',      icon: BookOpen,        apenasAdmin: true  },
  { href: '/admin/mesas',          label: 'Mesas & QR',    icon: QrCode,          apenasAdmin: true  },
  { href: '/admin/equipe',         label: 'Equipe',        icon: UserCog,         apenasAdmin: true  },
  { href: '/admin/configuracoes',  label: 'Configurações', icon: Settings,        apenasAdmin: true  },
]

const OPERACOES = [
  { href: '/garcom',          emoji: '🛎️', label: 'Painel do Garçom' },
  { href: '/estacao/cozinha', emoji: '🍳', label: 'Cozinha'          },
  { href: '/estacao/bar',     emoji: '🍺', label: 'Bar'              },
  { href: '/estacao/drinks',  emoji: '🍹', label: 'Drinks'           },
  { href: '/estacao/chopeira',emoji: '🍻', label: 'Chopeira'         },
]

export function AdminSidebar({ cargo }: { cargo: 'admin' | 'operador' }) {
  const pathname = usePathname()
  const router = useRouter()
  const [operacoesAberto, setOperacoesAberto] = useState(false)
  const [drawerAberto, setDrawerAberto] = useState(false)

  const navFiltrado = NAV.filter((n) => !n.apenasAdmin || cargo === 'admin')

  async function sair() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/operador/login')
    router.refresh()
  }

  const navContent = (onLinkClick?: () => void) => (
    <nav className="flex-1 py-3 px-2 space-y-0.5">
      {navFiltrado.map(({ href, label, icon: Icon }) => {
        const ativo = pathname === href
        return (
          <Link
            key={href}
            href={href}
            onClick={onLinkClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              ativo
                ? 'bg-teal-600 text-white font-medium'
                : 'text-slate-400 hover:bg-teal-800 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
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

  return (
    <>
      {/* ── Desktop: sidebar fixa (sem alteração) ── */}
      <aside className="hidden md:flex w-56 bg-teal-900 text-white flex-col shrink-0">
        <div className="px-4 py-4 border-b border-teal-700 flex items-center justify-between">
          <div>
            <p className="font-black tracking-widest text-sm uppercase text-teal-400">Menuê+</p>
            <p className="text-xs text-teal-500 tracking-widest uppercase">cardápio digital</p>
          </div>
          <button onClick={sair} title="Sair" className="text-teal-600 hover:text-red-400 transition-colors p-1">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        {navContent()}
      </aside>

      {/* ── Mobile: top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-teal-900 flex items-center justify-between px-4 py-3 shadow-md">
        <div>
          <p className="font-black tracking-widest text-xs uppercase text-teal-400 leading-none">Menuê+</p>
          <p className="text-white font-bold text-base leading-tight">Gestão</p>
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
              <div>
                <p className="font-black tracking-widest text-sm uppercase text-teal-400">Menuê+</p>
                <p className="text-xs text-teal-500 tracking-widest uppercase">cardápio digital</p>
              </div>
              <button onClick={() => setDrawerAberto(false)} className="text-teal-400 hover:text-white p-1">
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
