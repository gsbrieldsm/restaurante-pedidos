'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { Lock, MessageCircle, ArrowLeft, Sparkles } from 'lucide-react'
import { RECURSO_LABEL } from '@/lib/planos'

function BloqueadoContent() {
  const params  = useSearchParams()
  const recurso = params.get('recurso') ?? ''
  const info    = RECURSO_LABEL[recurso] ?? { titulo: 'este recurso', planoMinimo: 'Pro' }

  const msgWpp = encodeURIComponent(
    `Olá! Quero fazer upgrade do meu plano para acessar ${info.titulo} no Menuê+.`
  )
  const wppUrl = `https://wa.me/5547988194822?text=${msgWpp}`

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">

        {/* Ícone */}
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
          <Lock className="w-8 h-8 text-slate-400" />
        </div>

        {/* Título */}
        <h1 className="text-2xl font-black text-slate-800 mb-2">
          {info.titulo}
        </h1>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          Este recurso está disponível a partir do Plano{' '}
          <span className="font-bold text-teal-600">{info.planoMinimo}</span>.
          Faça upgrade para desbloquear.
        </p>

        {/* CTA */}
        <div className="space-y-3">
          <a
            href={wppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-base font-black text-white transition-all hover:opacity-90"
            style={{ background: '#1A9B8A' }}
          >
            <MessageCircle className="w-5 h-5" />
            Fazer upgrade via WhatsApp
          </a>

          <Link
            href="/admin"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao painel
          </Link>
        </div>

        {/* Planos disponíveis */}
        <div className="mt-8 bg-teal-50 border border-teal-100 rounded-2xl p-4 text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-600 mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Planos que incluem {info.titulo}
          </p>
          <div className="space-y-2">
            {[
              { nome: 'Pro',      preco: 'R$ 697/mês',   mesas: 'até 30 mesas' },
              { nome: 'Business', preco: 'R$ 1.197/mês', mesas: 'até 60 mesas' },
            ].map((p) => (
              <div key={p.nome} className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">{p.nome} — {p.mesas}</span>
                <span className="font-black text-teal-700">{p.preco}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

export default function BloqueadoPage() {
  return (
    <Suspense fallback={null}>
      <BloqueadoContent />
    </Suspense>
  )
}
