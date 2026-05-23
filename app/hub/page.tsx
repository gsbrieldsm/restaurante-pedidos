import Link from 'next/link'

export default function HubPage() {
  return (
    <div className="relative min-h-screen bg-black overflow-hidden flex flex-col items-center justify-center px-6">

      {/* Glow teal — centro */}
      <div
        className="pointer-events-none absolute"
        style={{
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '700px',
          height: '700px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(26,155,138,0.35) 0%, rgba(26,155,138,0.08) 50%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Conteúdo */}
      <div className="relative z-10 flex flex-col items-center text-center gap-10 w-full max-w-lg">

        {/* Logo marca */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0f3d35, #1A9B8A)' }}
          >
            <span className="text-2xl font-black text-white tracking-tighter">M+</span>
          </div>
          <div>
            <p className="text-white/30 text-xs font-bold tracking-[0.3em] uppercase">Sistema de Gestão</p>
          </div>
        </div>

        {/* Botão principal */}
        <Link
          href="/admin"
          className="group relative w-full flex items-center justify-between px-6 py-4 rounded-2xl overflow-hidden transition-all duration-300"
          style={{ background: 'linear-gradient(135deg, #0f3d35 0%, #1A9B8A 100%)' }}
        >
          <div className="text-left">
            <p className="text-white font-bold text-base">Painel de Gestão</p>
            <p className="text-teal-300/70 text-xs">Dashboard completo</p>
          </div>
          <span className="text-white/60 text-xl group-hover:translate-x-1 transition-transform">→</span>
        </Link>

        {/* Estações */}
        <div className="w-full space-y-2">
          <p className="text-white/20 text-xs font-bold uppercase tracking-widest text-center">Estações de trabalho</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: '/estacao/cozinha',  emoji: '🍳', label: 'Cozinha'  },
              { href: '/estacao/bar',      emoji: '🍺', label: 'Bar'      },
              { href: '/estacao/drinks',   emoji: '🍹', label: 'Drinks'   },
              { href: '/estacao/chopeira', emoji: '🍻', label: 'Chopeira' },
            ].map((e) => (
              <Link
                key={e.href}
                href={e.href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/8 hover:border-teal-500/40 hover:bg-teal-950/30 transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <span className="text-lg">{e.emoji}</span>
                <span className="text-white/70 text-sm font-medium">{e.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <p className="text-white/15 text-xs tracking-widest uppercase">
          Menuê+ · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
