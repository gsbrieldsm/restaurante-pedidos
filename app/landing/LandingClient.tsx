'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

/* ─── Scroll reveal hook ─────────────────────────────── */
function useReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('revealed')
            observer.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12 }
    )
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

/* ─── Animated counter ───────────────────────────────── */
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const dur = 1400
        const start = performance.now()
        const tick = (now: number) => {
          const p = Math.min((now - start) / dur, 1)
          const ease = 1 - Math.pow(1 - p, 3)
          setVal(Math.round(ease * to))
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.5 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [to])

  return <span ref={ref}>{val}{suffix}</span>
}

/* ─── Data ───────────────────────────────────────────── */
const FEATURES = [
  { icon: '📱', title: 'Cardápio digital por QR', desc: 'O cliente escaneia o QR na mesa, vê o cardápio e faz o pedido direto pelo celular. Sem baixar app.' },
  { icon: '⚡', title: 'Pedidos em tempo real', desc: 'Cada pedido chega instantaneamente na estação certa — cozinha, bar ou drinks. Zero papel, zero ruído.' },
  { icon: '🛵', title: 'Módulo Delivery', desc: 'Link próprio de delivery, cálculo de taxa por zona, painel do entregador. Sem marketplace.', badge: 'Business+' },
  { icon: '🛎️', title: 'Painel do garçom', desc: 'O garçom vê tudo pronto para entregar e recebe chamadas em tempo real, sem precisar ficar circulando.' },
  { icon: '💳', title: 'Saldo pré-pago', desc: 'Clientes frequentes carregam crédito antecipado. Pix, dinheiro ou cartão — tudo registrado no financeiro.' },
  { icon: '📊', title: 'Dashboard ao vivo', desc: 'Visão completa de mesas abertas, comandas ativas e status de cada pedido — sem recarregar a página.' },
  { icon: '👥', title: 'Controle de acesso', desc: 'Crie logins por funcionário com cargo. Cada um acessa só o que precisa.' },
  { icon: '💰', title: 'Gestão financeira', desc: 'Faturamento, ticket médio e top clientes. Dados reais do seu restaurante, sem planilha.' },
]

const STEPS = [
  { n: '01', title: 'QR code na mesa', desc: 'Imprime e cola. O cliente escaneia e já está no cardápio do seu restaurante.' },
  { n: '02', title: 'Cliente faz o pedido', desc: 'Escolhe os itens, adiciona observações e confirma. Simples como mandar mensagem.' },
  { n: '03', title: 'Cozinha recebe na hora', desc: 'O pedido aparece na tela da estação correta em segundos. Sem grito, sem confusão.' },
  { n: '04', title: 'Garçom entrega', desc: 'Notificação automática quando o item fica pronto. Um clique para confirmar a entrega.' },
]

const DIFERENCIAIS = [
  '🚫  Sem aplicativo para baixar',
  '⏱️  Implantação em menos de 1 dia',
  '📶  Funciona em qualquer celular',
  '🔔  Notificação sonora ao ficar pronto',
  '🧑‍🍳  Múltiplas estações independentes',
  '📍  Chamada de garçom pelo cliente',
  '💳  Cliente pede a conta pelo celular',
  '📈  Ranking de clientes automático',
  '🛵  Delivery sem comissão por pedido',
  '💰  Saldo pré-pago para fidelização',
]

const PLANOS = [
  {
    nome: 'Starter', mesas: 'Até 15 mesas', preco: 397, destaque: false,
    inclui: ['Cardápio digital QR', '2 estações', 'Painel do garçom'],
    naoinclui: ['Delivery', 'Financeiro', 'Clientes'],
  },
  {
    nome: 'Pro', mesas: 'Até 30 mesas', preco: 697, destaque: true,
    inclui: ['Tudo do Starter', 'Estações ilimitadas', 'Financeiro', 'Clientes & saldo'],
    naoinclui: ['Delivery'],
  },
  {
    nome: 'Business', mesas: 'Até 60 mesas', preco: 1197, destaque: false,
    inclui: ['Tudo do Pro', 'Módulo Delivery 🛵', 'Performance avançada'],
    naoinclui: [],
  },
]

/* ─── Component ──────────────────────────────────────── */
export default function LandingClient() {
  useReveal()
  const whatsapp = 'https://wa.me/5547988194822?text=Ol%C3%A1%2C%20quero%20saber%20mais%20sobre%20o%20Menu%C3%AA%2B'

  return (
    <div className="min-h-screen font-sans" style={{ background: '#030d0b', color: '#e2faf7' }}>

      {/* ── Estilos globais de animação ── */}
      <style>{`
        .reveal { opacity: 0; transform: translateY(32px); transition: opacity 0.7s cubic-bezier(.16,1,.3,1), transform 0.7s cubic-bezier(.16,1,.3,1); }
        .reveal.revealed { opacity: 1; transform: translateY(0); }
        .reveal-delay-1 { transition-delay: 0.1s; }
        .reveal-delay-2 { transition-delay: 0.2s; }
        .reveal-delay-3 { transition-delay: 0.3s; }
        .reveal-delay-4 { transition-delay: 0.4s; }
        .reveal-delay-5 { transition-delay: 0.5s; }
        .reveal-delay-6 { transition-delay: 0.6s; }
        .reveal-delay-7 { transition-delay: 0.7s; }
        .glow-card:hover { box-shadow: 0 0 0 1px #1A9B8A44, 0 8px 40px #1A9B8A22; }
        .glow-btn:hover { box-shadow: 0 0 24px #1A9B8A66; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes pulse-ring { 0%{opacity:.6;transform:scale(1)} 100%{opacity:0;transform:scale(1.5)} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        .float { animation: float 5s ease-in-out infinite; }
        .gradient-text {
          background: linear-gradient(120deg, #5EEAD4 0%, #1A9B8A 40%, #5EEAD4 80%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .gradient-text-dark {
          background: linear-gradient(120deg, #0d6b5e 0%, #1A9B8A 50%, #0d6b5e 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .grid-bg {
          background-image:
            linear-gradient(rgba(26,155,138,.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(26,155,138,.06) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        .light-card { background: #fff; border: 1px solid rgba(26,155,138,0.12); box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(26,155,138,0.06); transition: all 0.2s; }
        .light-card:hover { border-color: rgba(26,155,138,0.3); box-shadow: 0 4px 20px rgba(26,155,138,0.12); transform: translateY(-1px); }
        .step-connector { background: linear-gradient(90deg, #1A9B8A 0%, transparent 100%); }
      `}</style>

      {/* ═══════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden grid-bg" style={{ minHeight: '100vh' }}>

        {/* Glow radial de fundo */}
        <div className="pointer-events-none absolute inset-0" style={{
          background: 'radial-gradient(ellipse 80% 60% at 60% 40%, rgba(26,155,138,0.18) 0%, transparent 70%)',
        }} />
        <div className="pointer-events-none absolute" style={{
          top: '50%', left: '55%', width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(26,155,138,0.12) 0%, transparent 65%)',
          transform: 'translate(-50%,-50%)',
          filter: 'blur(40px)',
        }} />

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(26,155,138,0.2)', border: '1px solid rgba(26,155,138,0.3)' }}>
              <span className="font-black text-sm" style={{ color: '#5EEAD4' }}>M+</span>
            </div>
            <span className="font-bold text-lg tracking-tight text-white">Menuê+</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Link href="/parceiros" className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={{ color: 'rgba(255,255,255,0.5)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
              Seja parceiro
            </Link>
            <Link href="/login" className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={{ color: 'rgba(255,255,255,0.5)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
              Entrar
            </Link>
            <Link href="/registro" className="glow-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{ background: '#1A9B8A', color: '#fff' }}>
              Testar grátis →
            </Link>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-10 pb-24 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest"
              style={{ background: 'rgba(26,155,138,0.12)', color: '#5EEAD4', border: '1px solid rgba(26,155,138,0.25)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              🚀 Sistema para Gastronomia — +Tecnologia e +Controle! 📊
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.02] tracking-tight text-white">
              Gastronomia{' '}
              <span className="gradient-text">sem filas,</span>{' '}
              sem papel{' '}
              <br className="hidden lg:block" />e{' '}
              <span className="gradient-text">sem erros!</span>
            </h1>

            <p className="text-lg leading-relaxed max-w-lg" style={{ color: 'rgba(226,250,247,0.6)' }}>
              Cardápio digital via QR code, pedidos direto para cozinha e bar, delivery integrado e gestão completa — tudo em uma plataforma, sem app.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/registro"
                className="glow-btn flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-black transition-all"
                style={{ background: '#1A9B8A', color: '#fff' }}>
                🚀 Começar trial de 7 dias
              </Link>
              <a href="#como-funciona"
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-bold transition-all"
                style={{ color: '#5EEAD4', border: '1px solid rgba(26,155,138,0.3)' }}>
                Ver como funciona ↓
              </a>
            </div>

            <p className="text-sm" style={{ color: 'rgba(94,234,212,0.4)' }}>
              Sem cartão de crédito · 7 dias grátis · Cancele quando quiser.{' '}
              <Link href="/login" className="underline underline-offset-2 transition-colors" style={{ color: 'rgba(94,234,212,0.7)' }}>
                Já tenho conta
              </Link>
            </p>

            {/* Stats */}
            <div className="flex items-center gap-8 pt-2">
              {[
                { to: 7, suffix: ' dias', label: 'trial grátis' },
                { to: 1, suffix: ' dia',  label: 'de implantação' },
                { to: 0, suffix: ' apps', label: 'para instalar' },
              ].map(({ to, suffix, label }) => (
                <div key={label}>
                  <p className="font-black text-2xl text-white">
                    <Counter to={to} suffix={suffix} />
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(94,234,212,0.4)' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Phone mockup */}
          <div className="flex justify-center lg:justify-end float">
            <div className="relative">
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-[2.5rem]" style={{
                boxShadow: '0 0 80px rgba(26,155,138,0.35), 0 0 160px rgba(26,155,138,0.15)',
              }} />
              <div className="relative w-56 lg:w-64 rounded-[2.5rem] p-[3px] shadow-2xl"
                style={{ background: 'linear-gradient(135deg, rgba(26,155,138,0.5), rgba(26,155,138,0.1))' }}>
                <div className="rounded-[2.3rem] overflow-hidden"
                  style={{ background: '#030d0b' }}>
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-5 rounded-full z-10"
                    style={{ background: 'rgba(0,0,0,0.6)' }} />
                  <Image
                    src="/preview-cardapio.png"
                    alt="Cardápio digital Menuê+"
                    width={800}
                    height={1738}
                    className="w-full h-auto block"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #030d0b)' }} />
      </section>

      {/* ═══════════════════════════════════════════════
          DASHBOARD PREVIEW (desktop only)
      ═══════════════════════════════════════════════ */}
      <section className="hidden md:block py-20 px-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f0f7f5 100%)' }}>

        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-12 reveal">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#1A9B8A' }}>
              Painel administrativo
            </p>
            <h2 className="text-3xl sm:text-4xl font-black" style={{ color: '#0d1a18' }}>
              Visão completa da sua operação,{' '}
              <span className="gradient-text-dark">em tempo real</span>
            </h2>
          </div>

          {/* Browser mockup */}
          <div className="reveal reveal-delay-1 relative mx-auto"
            style={{ maxWidth: '1000px' }}>

            {/* Glow externo */}
            <div className="absolute -inset-1 rounded-2xl pointer-events-none"
              style={{ boxShadow: '0 0 60px rgba(26,155,138,0.2), 0 0 120px rgba(26,155,138,0.08)' }} />

            {/* Frame do browser */}
            <div className="relative rounded-2xl overflow-hidden"
              style={{ border: '1px solid rgba(26,155,138,0.25)', background: '#0d1a18' }}>

              {/* Barra do browser */}
              <div className="flex items-center gap-3 px-4 py-3"
                style={{ background: '#0a1412', borderBottom: '1px solid rgba(26,155,138,0.12)' }}>
                {/* Dots */}
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
                </div>
                {/* URL bar */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs"
                    style={{ background: 'rgba(26,155,138,0.08)', color: 'rgba(94,234,212,0.5)', border: '1px solid rgba(26,155,138,0.12)' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    amostra.menue.com.br/admin
                  </div>
                </div>
                <div className="w-16" />
              </div>

              {/* Screenshot */}
              <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
                <Image
                  src="/preview-admin.png"
                  alt="Painel administrativo Menuê+"
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 1200px) 100vw, 1000px"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          PARA QUEM
      ═══════════════════════════════════════════════ */}
      <section className="py-14 px-6" style={{ background: 'linear-gradient(180deg, #f0f7f5 0%, #ffffff 100%)', borderTop: '1px solid rgba(26,155,138,0.1)' }}>
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-bold uppercase tracking-widest mb-8 reveal"
            style={{ color: '#1A9B8A' }}>
            Feito para qualquer operação de food service
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            {[
              { emoji: '🍽️', label: 'Restaurantes' },
              { emoji: '🍺', label: 'Bares' },
              { emoji: '🍔', label: 'Hamburguerias' },
              { emoji: '🍕', label: 'Pizzarias' },
              { emoji: '🥗', label: 'Lanchonetes' },
              { emoji: '🚚', label: 'Food Trucks' },
            ].map(({ emoji, label }, i) => (
              <div key={label}
                className={`reveal reveal-delay-${i + 1} flex flex-col items-center gap-2 py-5 px-2 rounded-2xl transition-all cursor-default light-card`}
              >
                <span className="text-4xl">{emoji}</span>
                <span className="text-xs font-semibold text-center" style={{ color: '#4a6e68' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          COMO FUNCIONA
      ═══════════════════════════════════════════════ */}
      <section id="como-funciona" className="py-28 px-6"
        style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f0f7f5 100%)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="reveal text-xs font-bold uppercase tracking-widest mb-3"
              style={{ color: '#1A9B8A' }}>Fluxo completo</p>
            <h2 className="reveal reveal-delay-1 text-4xl sm:text-5xl font-black" style={{ color: '#0d1a18' }}>
              Do QR code ao prato na mesa
            </h2>
            <p className="reveal reveal-delay-2 text-lg mt-4 max-w-xl mx-auto"
              style={{ color: '#4a6e68' }}>
              Quatro passos que eliminam ruído, erro e tempo perdido na operação.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((step, i) => (
              <div key={step.n}
                className={`reveal reveal-delay-${i + 1} light-card relative rounded-2xl p-6 flex flex-col gap-4`}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: '#1A9B8A' }}>
                  <span className="font-black text-sm text-white">{step.n}</span>
                </div>
                <div>
                  <p className="font-black text-base" style={{ color: '#0d1a18' }}>{step.title}</p>
                  <p className="text-sm mt-1.5 leading-relaxed" style={{ color: '#4a6e68' }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          FUNCIONALIDADES
      ═══════════════════════════════════════════════ */}
      <section className="py-28 px-6"
        style={{ background: 'linear-gradient(180deg, #f0f7f5 0%, #ffffff 100%)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="reveal text-xs font-bold uppercase tracking-widest mb-3"
              style={{ color: '#1A9B8A' }}>Plataforma completa</p>
            <h2 className="reveal reveal-delay-1 text-4xl sm:text-5xl font-black" style={{ color: '#0d1a18' }}>
              Tudo que seu restaurante precisa
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <div key={f.title}
                className={`reveal reveal-delay-${(i % 4) + 1} light-card relative rounded-2xl p-5 flex flex-col gap-3`}>
                {f.badge && (
                  <span className="absolute top-4 right-4 text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full"
                    style={{ background: '#1A9B8A', color: '#fff' }}>
                    {f.badge}
                  </span>
                )}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: 'rgba(26,155,138,0.1)' }}>
                  {f.icon}
                </div>
                <div>
                  <p className="font-black text-sm" style={{ color: '#0d1a18' }}>{f.title}</p>
                  <p className="text-xs mt-1.5 leading-relaxed" style={{ color: '#4a6e68' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          DIFERENCIAIS
      ═══════════════════════════════════════════════ */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative max-w-5xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="reveal text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#1A9B8A' }}>
              Por que Menuê+
            </p>
            <h2 className="reveal reveal-delay-1 text-4xl sm:text-5xl font-black text-white mb-6">
              Simples para o cliente.<br />
              <span className="gradient-text">Poderoso para você.</span>
            </h2>
            <p className="reveal reveal-delay-2 text-lg leading-relaxed" style={{ color: 'rgba(226,250,247,0.5)' }}>
              Desenvolvido para a realidade dos restaurantes brasileiros — sem complicação, sem hardware caro, sem taxa por pedido, sem comissão no delivery.
            </p>

            {/* Métricas */}
            <div className="reveal reveal-delay-3 grid grid-cols-3 gap-4 mt-10">
              {[
                { n: 0, suffix: '%', label: 'comissão no delivery' },
                { n: 7,  suffix: 'd', label: 'trial grátis' },
                { n: 1,  suffix: 'd', label: 'para implantar' },
              ].map(({ n, suffix, label }) => (
                <div key={label} className="rounded-2xl p-4 text-center"
                  style={{ background: 'rgba(26,155,138,0.07)', border: '1px solid rgba(26,155,138,0.15)' }}>
                  <p className="font-black text-2xl" style={{ color: '#5EEAD4' }}>
                    <Counter to={n} suffix={suffix} />
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(226,250,247,0.4)' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {DIFERENCIAIS.map((text, i) => (
              <div key={text}
                className={`reveal reveal-delay-${Math.min(i + 1, 7)} glow-card flex items-center gap-4 rounded-xl px-5 py-3.5 transition-all`}
                style={{ background: 'rgba(26,155,138,0.04)', border: '1px solid rgba(26,155,138,0.1)' }}>
                <span className="font-medium text-sm" style={{ color: 'rgba(226,250,247,0.75)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          ESTAÇÕES
      ═══════════════════════════════════════════════ */}
      <section className="py-28 px-6"
        style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f0f7f5 100%)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="reveal text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#1A9B8A' }}>
              Operação em tempo real
            </p>
            <h2 className="reveal reveal-delay-1 text-4xl sm:text-5xl font-black" style={{ color: '#0d1a18' }}>
              Cada estação no seu ritmo
            </h2>
            <p className="reveal reveal-delay-2 text-lg mt-4 max-w-xl mx-auto" style={{ color: '#4a6e68' }}>
              Cozinha, bar, drinks e chopeira recebem somente os pedidos que são deles.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { emoji: '🍳', label: 'Cozinha',  desc: 'Pratos, entradas e tudo que sai do fogão'  },
              { emoji: '🍺', label: 'Bar',      desc: 'Cervejas, doses e bebidas simples'         },
              { emoji: '🍹', label: 'Drinks',   desc: 'Coquetéis e bebidas elaboradas'            },
              { emoji: '🍻', label: 'Chopeira', desc: 'Controle dedicado para chope'              },
            ].map((e, i) => (
              <div key={e.label}
                className={`reveal reveal-delay-${i + 1} light-card rounded-2xl p-7 text-center`}>
                <span className="text-5xl">{e.emoji}</span>
                <p className="font-black text-lg mt-4" style={{ color: '#0d1a18' }}>{e.label}</p>
                <p className="text-xs mt-1.5" style={{ color: '#4a6e68' }}>{e.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          PREÇO
      ═══════════════════════════════════════════════ */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30" />
        {/* Glow central */}
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(26,155,138,0.12) 0%, transparent 70%)' }} />

        <div className="relative max-w-5xl mx-auto text-center">
          <p className="reveal text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#1A9B8A' }}>
            Investimento
          </p>
          <h2 className="reveal reveal-delay-1 text-4xl sm:text-5xl font-black text-white mb-4">
            Preço fixo e <span className="gradient-text">sem surpresa</span> no mês!
          </h2>
          <p className="reveal reveal-delay-2 text-lg max-w-xl mx-auto mb-4"
            style={{ color: 'rgba(226,250,247,0.5)' }}>
            Sem taxa por pedido, sem comissão no delivery, sem cobrança por usuário.
          </p>

          <div className="reveal reveal-delay-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold mb-16"
            style={{ background: 'rgba(26,155,138,0.1)', color: '#5EEAD4', border: '1px solid rgba(26,155,138,0.2)' }}>
            🎁 Todos os planos incluem 7 dias grátis · Sem cartão de crédito
          </div>

          {/* Implementação */}
          <div className="reveal max-w-sm mx-auto rounded-2xl p-7 mb-10 text-left"
            style={{ background: 'rgba(26,155,138,0.06)', border: '1px solid rgba(26,155,138,0.2)' }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#5EEAD4' }}>
              Implementação · única vez
            </p>
            <p className="font-black text-white text-4xl mb-5">R$ 2.000</p>
            <ul className="space-y-2 text-sm" style={{ color: 'rgba(226,250,247,0.6)' }}>
              {[
                'Configuração completa da plataforma',
                'Cadastro dos produtos (sem fotos)',
                'QR codes das mesas',
                'Treinamento da equipe no sistema',
                'Suporte no 1º mês',
              ].map((i) => (
                <li key={i} className="flex items-start gap-2">
                  <span style={{ color: '#1A9B8A' }}>✓</span>{i}
                </li>
              ))}
            </ul>
            <p className="text-xs mt-4 pt-4" style={{ color: 'rgba(94,234,212,0.25)', borderTop: '1px solid rgba(26,155,138,0.15)' }}>
              Cobrada apenas se continuar após o trial.
            </p>
          </div>

          {/* Planos */}
          <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
            {PLANOS.map((p, i) => (
              <div key={p.nome}
                className={`reveal reveal-delay-${i + 1} glow-card relative rounded-2xl p-7 text-left transition-all`}
                style={{
                  background: p.destaque ? 'rgba(26,155,138,0.12)' : 'rgba(255,255,255,0.025)',
                  border: p.destaque ? '1px solid rgba(26,155,138,0.4)' : '1px solid rgba(26,155,138,0.1)',
                }}>
                {p.destaque && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-xs font-bold"
                    style={{ background: '#1A9B8A' }}>
                    mais popular
                  </div>
                )}
                <p className="text-white font-black text-lg mb-0.5">{p.nome}</p>
                <p className="text-xs mb-4" style={{ color: 'rgba(94,234,212,0.4)' }}>{p.mesas} · usuários ilimitados</p>
                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-white font-black text-3xl">R$ {p.preco}</span>
                  <span className="text-sm" style={{ color: 'rgba(94,234,212,0.4)' }}>/mês</span>
                </div>
                <ul className="space-y-2">
                  {p.inclui.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs" style={{ color: 'rgba(226,250,247,0.75)' }}>
                      <span style={{ color: '#1A9B8A' }}>✓</span>{item}
                    </li>
                  ))}
                  {p.naoinclui.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      <span>✗</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Enterprise */}
          <div className="reveal max-w-4xl mx-auto rounded-2xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 mb-12"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(26,155,138,0.2)' }}>
            <div className="text-left">
              <p className="text-white font-bold text-sm">Mais de 60 mesas ou precisa de algo sob medida?</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(94,234,212,0.4)' }}>
                Redes, franquias e grandes operações — montamos um plano personalizado.
              </p>
            </div>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer"
              className="shrink-0 glow-btn px-6 py-3 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: 'rgba(26,155,138,0.15)', border: '1px solid rgba(26,155,138,0.3)' }}>
              📲 Falar com a gente
            </a>
          </div>

          {/* CTA */}
          <div className="reveal flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/registro"
              className="glow-btn flex items-center gap-2 px-10 py-4 rounded-2xl text-base font-black transition-all"
              style={{ background: '#1A9B8A', color: '#fff' }}>
              🚀 Começar trial de 7 dias grátis
            </Link>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold transition-all"
              style={{ color: '#5EEAD4', border: '1px solid rgba(26,155,138,0.25)' }}>
              📲 Falar com consultor
            </a>
          </div>
          <p className="mt-4 text-sm" style={{ color: 'rgba(94,234,212,0.3)' }}>
            Já tem conta?{' '}
            <Link href="/login" className="underline underline-offset-2 transition-colors" style={{ color: 'rgba(94,234,212,0.6)' }}>
              Entrar
            </Link>
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          CTA FINAL
      ═══════════════════════════════════════════════ */}
      <section className="py-28 px-6 relative overflow-hidden" style={{ borderTop: '1px solid rgba(26,155,138,0.1)' }}>
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 70% 70% at 50% 50%, rgba(26,155,138,0.1) 0%, transparent 70%)' }} />
        <div className="relative max-w-2xl mx-auto text-center space-y-8">
          <h2 className="reveal text-4xl sm:text-5xl font-black text-white">
            Pronto para modernizar<br />
            <span className="gradient-text">seu restaurante?</span>
          </h2>
          <p className="reveal reveal-delay-1 text-lg" style={{ color: 'rgba(226,250,247,0.5)' }}>
            Crie sua conta agora e teste por 7 dias sem custo. Ou fale com a gente para uma demonstração ao vivo.
          </p>
          <div className="reveal reveal-delay-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/registro"
              className="glow-btn inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-lg font-black text-white transition-all"
              style={{ background: '#1A9B8A' }}>
              🚀 Testar grátis por 7 dias
            </Link>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-5 rounded-2xl text-base font-bold transition-all"
              style={{ color: '#5EEAD4', border: '1px solid rgba(26,155,138,0.25)' }}>
              📲 Falar no WhatsApp
            </a>
          </div>
          <p className="reveal reveal-delay-3 text-sm" style={{ color: 'rgba(94,234,212,0.3)' }}>
            Sem cartão de crédito · Implantação em até 1 dia útil · Suporte incluído
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════ */}
      <footer className="py-10 px-6" style={{ borderTop: '1px solid rgba(26,155,138,0.1)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(26,155,138,0.15)', border: '1px solid rgba(26,155,138,0.25)' }}>
                <span className="font-black text-xs" style={{ color: '#5EEAD4' }}>M+</span>
              </div>
              <span className="font-bold text-white">Menuê+</span>
            </div>
            <div className="flex items-center gap-6 text-xs" style={{ color: 'rgba(94,234,212,0.35)' }}>
              <Link href="/parceiros" className="hover:text-teal-300 transition-colors">Programa de Parceiros</Link>
              <Link href="/termos" className="hover:text-teal-300 transition-colors">Termos de Uso</Link>
              <Link href="/login" className="hover:text-teal-300 transition-colors">Entrar</Link>
            </div>
          </div>
          <div className="pt-6 text-center" style={{ borderTop: '1px solid rgba(26,155,138,0.08)' }}>
            <p className="text-xs" style={{ color: 'rgba(94,234,212,0.2)' }}>
              © {new Date().getFullYear()} Menuê+ · Cardápio digital e gestão de pedidos para restaurantes brasileiros
            </p>
          </div>
        </div>
      </footer>

    </div>
  )
}
