'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Clock, DollarSign,
  BookOpen, QrCode, ConciergeBell, Users, ChevronDown, ChevronRight, Settings, LogOut
} from 'lucide-react'
import { useRouter } from 'next/navigation'

const NAV = [
  { href: '/admin',                label: 'Visão ao Vivo', icon: LayoutDashboard, apenasAdmin: false },
  { href: '/admin/clientes',       label: 'Clientes',      icon: Users,           apenasAdmin: true  },
  { href: '/admin/tempo',          label: 'Performance',   icon: Clock,           apenasAdmin: true  },
  { href: '/admin/faturamento',    label: 'Financeiro',    icon: DollarSign,      apenasAdmin: true  },
  { href: '/admin/cardapio',       label: 'Cardápio',      icon: BookOpen,        apenasAdmin: true  },
  { href: '/admin/mesas',          label: 'Mesas & QR',    icon: QrCode,          apenasAdmin: true  },
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

  const navFiltrado = NAV.filter((n) => !n.apenasAdmin || cargo === 'admin')

  async function sair() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <aside className="w-56 bg-teal-900 text-white flex flex-col shrink-0">
      <div className="px-4 py-4 border-b border-teal-700 flex items-center justify-between">
        <div>
          <p className="font-black tracking-widest text-sm uppercase text-teal-400">Meu Menu+</p>
          <p className="text-xs text-teal-500 tracking-widest uppercase">cardápio digital</p>
        </div>
        <button
          onClick={sair}
          title="Sair"
          className="text-teal-600 hover:text-red-400 transition-colors p-1"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {navFiltrado.map(({ href, label, icon: Icon }) => {
          const ativo = pathname === href
          return (
            <Link
              key={href}
              href={href}
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

        {/* Botão Operações (accordion) */}
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
    </aside>
  )
}
