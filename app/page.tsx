import Link from 'next/link'
import { UtensilsCrossed, LayoutDashboard } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-teal-50 flex flex-col items-center justify-center p-8 gap-6">
      <div className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center">
          <UtensilsCrossed className="w-9 h-9 text-white" />
        </div>
        <h1 className="text-3xl font-black text-slate-800">Meu Menu+</h1>
        <p className="text-slate-500 mt-1">Restaurante</p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/admin"
          className="flex items-center gap-3 bg-slate-800 text-white rounded-xl px-5 py-4 hover:bg-slate-700 transition-colors"
        >
          <LayoutDashboard className="w-5 h-5 text-teal-400" />
          <div>
            <p className="font-semibold">Painel de Gestão</p>
            <p className="text-xs text-slate-400">Dashboard completo</p>
          </div>
        </Link>

        <div className="grid grid-cols-2 gap-3">
          {[
            { href: '/estacao/cozinha',  emoji: '🍳', label: 'Cozinha'  },
            { href: '/estacao/bar',      emoji: '🍺', label: 'Bar'      },
            { href: '/estacao/drinks',   emoji: '🍹', label: 'Drinks'   },
            { href: '/estacao/chopeira', emoji: '🍻', label: 'Chopeira' },
          ].map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:bg-teal-50 hover:border-teal-200 transition-colors"
            >
              <span className="text-xl">{e.emoji}</span>
              <span className="font-medium text-slate-700 text-sm">{e.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
