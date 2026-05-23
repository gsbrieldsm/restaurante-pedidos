'use client'

import Link from 'next/link'
import { ChefHat, Clock, MessageCircle, CheckCircle2 } from 'lucide-react'

export default function TrialExpiradoPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: '#F0FAFA' }}
    >
      <div className="w-full max-w-md">

        {/* Header */}
        <div
          className="rounded-2xl px-8 pt-10 pb-8 text-white mb-5 shadow-xl text-center"
          style={{ background: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 50%, #1A9B8A 100%)' }}
        >
          <div className="flex items-center justify-center gap-2 mb-5">
            <ChefHat className="w-5 h-5 text-teal-400" />
            <p className="text-xs font-bold tracking-widest uppercase text-teal-400">Menuê+</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-7 h-7 text-teal-300" />
          </div>
          <h1 className="text-2xl font-black leading-tight">Seu trial de 7 dias encerrou</h1>
          <p className="text-white/60 text-sm mt-2 leading-relaxed">
            Esperamos que tenha gostado! Para continuar usando o Menuê+, fale com nossa equipe e ativamos seu plano.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

          {/* O que você testou */}
          <div className="px-8 py-6 border-b border-slate-100">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
              O que você explorou no trial
            </p>
            <div className="space-y-2.5">
              {[
                'Cardápio digital com QR Code por mesa',
                'Pedidos em tempo real para cozinha e bar',
                'Gestão de garçons e estações',
                'Relatórios de vendas e performance',
              ].map(item => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" />
                  <span className="text-sm text-slate-600">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Próximo passo */}
          <div className="px-8 py-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
              Próximo passo
            </p>
            <p className="text-sm text-slate-600 leading-relaxed mb-5">
              Entre em contato pelo WhatsApp e nossa equipe vai te passar os detalhes da implementação e ativar seu plano ainda hoje.
            </p>

            <a
              href="https://wa.me/5547988194822?text=Ol%C3%A1%21+Meu+trial+do+Menu%C3%AA%2B+expirou+e+quero+continuar+usando+o+sistema."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-base font-black text-white transition-all hover:opacity-90"
              style={{ background: '#1A9B8A' }}
            >
              <MessageCircle className="w-5 h-5" />
              Falar com a equipe no WhatsApp
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Já ativou seu plano?{' '}
          <Link href="/login" className="text-teal-600 font-medium hover:underline">
            Entrar novamente
          </Link>
        </p>

      </div>
    </div>
  )
}
