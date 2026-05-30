'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

/* ─── Scroll reveal ──────────────────────────────────── */
function useReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('revealed'); observer.unobserve(e.target) }
      }),
      { threshold: 0.12 }
    )
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

/* ─── Animated counter ───────────────────────────────── */
function Counter({ to, prefix = '', suffix = '' }: { to: number; prefix?: string; suffix?: string }) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const dur = 1600; const start = performance.now()
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
  return <span ref={ref}>{prefix}{val}{suffix}</span>
}

/* ─── Data ───────────────────────────────────────────── */
const TIERS = [
  { min: 1,  max: 4,        label: '1–4 clientes',   recorrente: 0.10, cor: '#5EEAD4' },
  { min: 5,  max: 9,        label: '5–9 clientes',   recorrente: 0.15, cor: '#5EEAD4' },
  { min: 10, max: 14,       label: '10–14 clientes', recorrente: 0.20, cor: '#5EEAD4' },
  { min: 15, max: 19,       label: '15–19 clientes', recorrente: 0.25, cor: '#5EEAD4' },
  { min: 20, max: Infinity, label: '20+ clientes',   recorrente: 0.30, cor: '#5EEAD4' },
]
const MENSALIDADE_BASE = 697
const VALOR_IMPL       = 2000
const COMISSAO_IMPL    = 0.30

function getTier(n: number) {
  return TIERS.find((t) => n >= t.min && n <= t.max) ?? TIERS[TIERS.length - 1]
}
function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

const STEPS = [
  { n: '01', emoji: '📝', title: 'Cadastre-se como parceiro',   desc: 'Preencha o formulário abaixo. Em até 24h você recebe seu link de indicação personalizado.' },
  { n: '02', emoji: '🤝', title: 'Indique restaurantes',         desc: 'Compartilhe seu link. Cada restaurante que contratar pelo seu link é seu cliente.' },
  { n: '03', emoji: '💸', title: 'Ganhe na implementação',       desc: 'Assim que o restaurante fechar contrato, você recebe 30% do valor de implementação.' },
  { n: '04', emoji: '📅', title: 'Receba todo mês',              desc: 'Enquanto o restaurante for cliente ativo, você ganha comissão recorrente. Quanto mais clientes, maior o %.' },
]

const MOTIVOS = [
  { emoji: '📱', title: 'O cliente não precisa baixar nada',     desc: 'QR code no celular já está no cardápio. Sem atrito, sem barreira de adoção.' },
  { emoji: '⚡', title: 'Implantação em 1 dia útil',             desc: 'O restaurante assina hoje, está funcionando amanhã. Sem obra, sem hardware caro.' },
  { emoji: '💰', title: 'ROI imediato para o restaurante',       desc: 'Reduz erros de pedido, aumenta ticket médio e libera garçons para mais mesas.' },
  { emoji: '🔒', title: 'Contrato sem fidelidade obrigatória',   desc: 'Proposta sem pegadinha facilita a decisão e aumenta sua taxa de fechamento.' },
  { emoji: '🎨', title: 'Cardápio com a cara do restaurante',    desc: 'Cada restaurante usa o sistema com a própria logo e cores. Seus clientes veem a marca deles.' },
  { emoji: '📊', title: 'Dashboard de acompanhamento',           desc: 'Você verá seus clientes ativos e comissões em tempo real no seu painel de parceiro.' },
]

/* ─── Component ──────────────────────────────────────── */
export default function ParceirosPage() {
  useReveal()

  const [clientes, setClientes]   = useState(5)
  const [form, setForm]           = useState({ nome: '', email: '', whatsapp: '', cidade: '', como: '' })
  const [enviado, setEnviado]     = useState(false)
  const [enviando, setEnviando]   = useState(false)

  const tier      = getTier(clientes)
  const mensal    = clientes * MENSALIDADE_BASE * tier.recorrente
  const porImpl   = VALOR_IMPL * COMISSAO_IMPL
  const anual     = mensal * 12 + clientes * porImpl
  const sliderPct = ((clientes - 1) / 29) * 100

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome || !form.email || !form.whatsapp) return
    setEnviando(true)
    const resp = await fetch('/api/parceiros/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (resp.ok) { setEnviado(true) }
    else {
      const data = await resp.json().catch(() => ({}))
      alert(data.error || 'Erro ao enviar cadastro. Tente novamente.')
    }
    setEnviando(false)
  }

  return (
    <div className="min-h-screen font-sans" style={{ background: '#ffffff', color: '#0d1a18' }}>

      <style>{`
        .reveal { opacity:0; transform:translateY(32px); transition:opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1); }
        .reveal.revealed { opacity:1; transform:translateY(0); }
        .reveal-delay-1{transition-delay:.1s} .reveal-delay-2{transition-delay:.2s}
        .reveal-delay-3{transition-delay:.3s} .reveal-delay-4{transition-delay:.4s}
        .reveal-delay-5{transition-delay:.5s} .reveal-delay-6{transition-delay:.6s}
        @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        .gradient-text{background:linear-gradient(120deg,#0a7a6c 0%,#1A9B8A 40%,#0a7a6c 80%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 4s linear infinite;}
        .gradient-text-dark{background:linear-gradient(120deg,#0d6b5e 0%,#1A9B8A 50%,#0d6b5e 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 4s linear infinite;}
        .glow-btn:hover{box-shadow:0 0 24px #1A9B8A55;}
        /* Grade sutil que só aparece onde o teal bate */
        .grid-bg-light{
          background-color:#ffffff;
          background-image:
            linear-gradient(rgba(26,155,138,.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(26,155,138,.07) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        .grid-bg-tint{
          background-color:#f8fbfa;
          background-image:
            linear-gradient(rgba(26,155,138,.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(26,155,138,.06) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        /* Névoa teal em spots específicos */
        .teal-mist-hero {
          background-color: #ffffff;
          background-image:
            radial-gradient(ellipse 65% 70% at 90% 10%, rgba(26,155,138,0.16) 0%, transparent 60%),
            radial-gradient(ellipse 50% 60% at 5%  80%, rgba(26,155,138,0.11) 0%, transparent 55%),
            radial-gradient(ellipse 40% 50% at 60% 90%, rgba(26,155,138,0.09) 0%, transparent 50%),
            linear-gradient(rgba(26,155,138,.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(26,155,138,.08) 1px, transparent 1px);
          background-size: auto, auto, auto, 48px 48px, 48px 48px;
        }
        .teal-mist-section {
          background-color: #ffffff;
          background-image:
            radial-gradient(ellipse 70% 60% at 0% 50%,   rgba(26,155,138,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 50% 50% at 100% 50%, rgba(26,155,138,0.09) 0%, transparent 55%),
            linear-gradient(rgba(26,155,138,.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(26,155,138,.07) 1px, transparent 1px);
          background-size: auto, auto, 48px 48px, 48px 48px;
        }
        .light-card{background:#fff;border:1px solid rgba(26,155,138,0.15);box-shadow:0 1px 3px rgba(0,0,0,.04),0 4px 12px rgba(26,155,138,.06);transition:all .2s;}
        .light-card:hover{border-color:rgba(26,155,138,.35);box-shadow:0 4px 20px rgba(26,155,138,.14);transform:translateY(-1px);}
        .dark-card{background:rgba(26,155,138,0.05);border:1px solid rgba(26,155,138,0.15);transition:all .2s;}
        .dark-card:hover{border-color:rgba(26,155,138,.35);box-shadow:0 0 24px rgba(26,155,138,.1);}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        .float{animation:float 5s ease-in-out infinite;}
      `}</style>

      {/* ═══════════════════════════════════════════════
          HERO — branco + grid
      ═══════════════════════════════════════════════ */}
      <section className="teal-mist-hero relative overflow-hidden" style={{ minHeight: '95vh' }}>

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: '#1A9B8A' }}>
              <span className="font-black text-sm text-white">M+</span>
            </div>
            <span className="font-bold text-lg tracking-tight" style={{ color: '#0d1a18' }}>Menuê+</span>
          </Link>
          <div className="hidden sm:flex items-center gap-2">
            <Link href="/" className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={{ color: '#4a6e68' }}>
              Para restaurantes
            </Link>
            <Link href="/parceiros/login" className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={{ color: '#4a6e68' }}>
              Já sou parceiro
            </Link>
            <a href="#cadastro"
              className="glow-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{ background: '#1A9B8A', color: '#fff' }}>
              Quero ser parceiro →
            </a>
          </div>
        </nav>

        {/* Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-10 pb-28 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest"
              style={{ background: 'rgba(26,155,138,0.1)', color: '#1A9B8A', border: '1px solid rgba(26,155,138,0.25)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#1A9B8A' }} />
              🤝 Programa de parceiros Menuê+
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.02] tracking-tight" style={{ color: '#0d1a18' }}>
              Indique restaurantes.{' '}
              <span className="gradient-text">Ganhe todo mês.</span>
            </h1>

            <p className="text-lg leading-relaxed max-w-lg" style={{ color: '#4a6e68' }}>
              Você indica um restaurante para o Menuê+. Ele assina. Você recebe{' '}
              <strong style={{ color: '#0d1a18' }}>30% da implementação</strong> na hora e{' '}
              <strong style={{ color: '#0d1a18' }}>até 30% de recorrente</strong> todo mês enquanto ele for cliente.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <a href="#cadastro"
                className="glow-btn flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-black transition-all"
                style={{ background: '#1A9B8A', color: '#fff' }}>
                📝 Quero ser parceiro
              </a>
              <a href="#calculadora"
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-bold transition-all"
                style={{ color: '#1A9B8A', border: '1px solid rgba(26,155,138,0.35)', background: 'rgba(26,155,138,0.04)' }}>
                Calcular meus ganhos ↓
              </a>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8 pt-2">
              {[
                { to: 30, suffix: '%', label: 'na implementação' },
                { to: 30, suffix: '%', label: 'recorrente/mês' },
                { to: 0,  suffix: '',  label: 'sem limite de clientes' },
              ].map(({ to, suffix, label }, i) => (
                <div key={label}>
                  <p className="font-black text-2xl" style={{ color: '#1A9B8A' }}>
                    {i === 2 ? '∞' : <Counter to={to} suffix={suffix} />}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#4a6e68' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Card exemplo real */}
          <div className="flex justify-center lg:justify-end float">
            <div className="w-full max-w-sm rounded-3xl p-7 space-y-5 light-card">
              <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#1A9B8A' }}>Exemplo real</p>
              <p className="text-base leading-relaxed" style={{ color: '#0d1a18' }}>
                Você indica <strong style={{ color: '#1A9B8A' }}>10 restaurantes</strong> ao longo de 3 meses.
              </p>
              <div className="space-y-0">
                {[
                  { label: 'Comissão de implementação', val: fmt(10 * porImpl) },
                  { label: 'Recorrente/mês (20%)',      val: fmt(10 * MENSALIDADE_BASE * 0.20) },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between items-center py-4"
                    style={{ borderBottom: '1px solid rgba(26,155,138,0.12)' }}>
                    <span className="text-sm font-medium" style={{ color: '#4a6e68' }}>{label}</span>
                    <span className="font-black text-base" style={{ color: '#0d1a18' }}>{val}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-4">
                  <span className="text-base font-black" style={{ color: '#1A9B8A' }}>Projeção 1º ano</span>
                  <span className="font-black text-2xl" style={{ color: '#1A9B8A' }}>
                    {fmt(10 * porImpl + 10 * MENSALIDADE_BASE * 0.20 * 12)}
                  </span>
                </div>
              </div>
              <p className="text-xs" style={{ color: '#4a6e68' }}>
                * mensalidade média de R$ 697/restaurante (planos R$397–R$1.197)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          COMO FUNCIONA — claro
      ═══════════════════════════════════════════════ */}
      <section className="py-28 px-6"
        style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f0f7f5 100%)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="reveal text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#1A9B8A' }}>
              Simples assim
            </p>
            <h2 className="reveal reveal-delay-1 text-4xl sm:text-5xl font-black" style={{ color: '#0d1a18' }}>
              Como funciona o programa
            </h2>
            <p className="reveal reveal-delay-2 text-lg mt-4 max-w-xl mx-auto" style={{ color: '#4a6e68' }}>
              Quatro passos do cadastro ao dinheiro na conta.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((step, i) => (
              <div key={step.n}
                className={`reveal reveal-delay-${i + 1} light-card rounded-2xl p-6 flex flex-col gap-4`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: '#1A9B8A' }}>
                    <span className="text-white font-black text-xs">{step.n}</span>
                  </div>
                  <span className="text-2xl">{step.emoji}</span>
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
          TABELA DE COMISSÕES — grid teal tint
      ═══════════════════════════════════════════════ */}
      <section className="teal-mist-section py-28 px-6 relative overflow-hidden">
        <div className="relative max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <p className="reveal text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#1A9B8A' }}>
              Comissões
            </p>
            <h2 className="reveal reveal-delay-1 text-4xl sm:text-5xl font-black" style={{ color: '#0d1a18' }}>
              Quanto mais você indica,{' '}
              <span className="gradient-text-dark">mais você ganha</span>
            </h2>
            <p className="reveal reveal-delay-2 text-lg mt-4 max-w-xl mx-auto" style={{ color: '#4a6e68' }}>
              A comissão recorrente cresce conforme sua carteira de clientes ativos aumenta.
            </p>
          </div>

          {/* Desktop — tabela */}
          <div className="reveal hidden sm:block overflow-hidden rounded-2xl"
            style={{ border: '1px solid rgba(26,155,138,0.2)', boxShadow: '0 4px 24px rgba(26,155,138,0.08)' }}>
            <div className="grid grid-cols-4"
              style={{ background: '#1A9B8A' }}>
              {['Clientes ativos', 'Implementação', 'Recorrente/mês', 'Ganho mensal est.'].map((h) => (
                <div key={h} className="px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-white/90">{h}</p>
                </div>
              ))}
            </div>
            {TIERS.map((t, i) => {
              const mid      = t.max === Infinity ? t.min + 2 : Math.floor((t.min + t.max) / 2)
              const ganho    = mid * MENSALIDADE_BASE * t.recorrente
              const destaque = t.min === 10
              return (
                <div key={t.label} className="grid grid-cols-4"
                  style={{
                    background: destaque ? 'rgba(26,155,138,0.08)' : i % 2 === 0 ? '#fff' : '#fafffe',
                    borderTop: '1px solid rgba(26,155,138,0.08)',
                  }}>
                  <div className="px-5 py-4 flex items-center gap-2">
                    <span className="font-black text-sm" style={{ color: '#0d1a18' }}>{t.label}</span>
                    {destaque && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(26,155,138,0.15)', color: '#1A9B8A' }}>popular</span>
                    )}
                  </div>
                  <div className="px-5 py-4 flex items-center">
                    <span className="text-sm" style={{ color: '#4a6e68' }}>
                      30% · <span style={{ color: '#94a3b8' }}>{fmt(porImpl)}/cliente</span>
                    </span>
                  </div>
                  <div className="px-5 py-4 flex items-center">
                    <span className="font-black text-2xl" style={{ color: '#1A9B8A' }}>
                      {(t.recorrente * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="px-5 py-4 flex items-center">
                    <span className="font-black text-sm" style={{ color: '#0d1a18' }}>
                      ~{fmt(ganho)}<span className="text-xs font-normal" style={{ color: '#94a3b8' }}>/mês</span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Mobile — cards */}
          <div className="sm:hidden space-y-3">
            {TIERS.map((t) => {
              const mid      = t.max === Infinity ? t.min + 2 : Math.floor((t.min + t.max) / 2)
              const ganho    = mid * MENSALIDADE_BASE * t.recorrente
              const destaque = t.min === 10
              return (
                <div key={t.label} className="light-card rounded-2xl p-5"
                  style={{ border: destaque ? '1px solid rgba(26,155,138,0.35)' : undefined }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-black" style={{ color: '#0d1a18' }}>{t.label}</span>
                      {destaque && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(26,155,138,0.12)', color: '#1A9B8A' }}>popular</span>
                      )}
                    </div>
                    <span className="font-black text-3xl" style={{ color: '#1A9B8A' }}>
                      {(t.recorrente * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-xs" style={{ color: '#94a3b8' }}>Implementação</p>
                      <p className="font-semibold" style={{ color: '#0d1a18' }}>{fmt(porImpl)}/cliente</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs" style={{ color: '#94a3b8' }}>Ganho recorrente est.</p>
                      <p className="font-black" style={{ color: '#0d1a18' }}>~{fmt(ganho)}<span className="text-xs font-normal" style={{ color: '#94a3b8' }}>/mês</span></p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <p className="reveal text-xs text-center mt-5" style={{ color: '#94a3b8' }}>
            * Ganho estimado com base na mensalidade média de R$ 697/restaurante.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          CALCULADORA — claro
      ═══════════════════════════════════════════════ */}
      <section id="calculadora" className="py-28 px-6"
        style={{ background: 'linear-gradient(180deg, #f0f7f5 0%, #ffffff 100%)' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <p className="reveal text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#1A9B8A' }}>
              Calculadora
            </p>
            <h2 className="reveal reveal-delay-1 text-4xl sm:text-5xl font-black" style={{ color: '#0d1a18' }}>
              Simule seus ganhos
            </h2>
          </div>

          <div className="reveal light-card rounded-3xl p-8">
            {/* Slider */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between">
                <label className="font-bold text-base" style={{ color: '#0d1a18' }}>
                  Quantos restaurantes você vai indicar?
                </label>
                <span className="text-2xl font-black px-4 py-1 rounded-xl"
                  style={{ background: 'rgba(26,155,138,0.08)', color: '#1A9B8A' }}>
                  {clientes}
                </span>
              </div>
              <input
                type="range" min={1} max={30} value={clientes}
                onChange={(e) => setClientes(Number(e.target.value))}
                className={[
                  'w-full h-2 rounded-full appearance-none cursor-grab active:cursor-grabbing',
                  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6',
                  '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white',
                  '[&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-teal-500',
                  '[&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab',
                  '[&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform',
                  '[&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full',
                  '[&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-teal-500',
                ].join(' ')}
                style={{ background: `linear-gradient(to right, #1A9B8A ${sliderPct}%, #e2e8f0 ${sliderPct}%)` }}
              />
              <div className="flex justify-between text-xs" style={{ color: '#4a6e68' }}>
                <span>1 cliente</span><span>15</span><span>30 clientes</span>
              </div>
            </div>

            {/* Tier badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-8 text-sm font-bold"
              style={{ background: 'rgba(26,155,138,0.08)', color: '#1A9B8A', border: '1px solid rgba(26,155,138,0.2)' }}>
              <span>📊</span>
              <span>Faixa atual: {tier.label} → {(tier.recorrente * 100).toFixed(0)}% de recorrente</span>
            </div>

            {/* Resultados */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-2xl p-6 text-center"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#4a6e68' }}>
                  Por implementação
                </p>
                <p className="font-black text-2xl" style={{ color: '#0d1a18' }}>{fmt(clientes * porImpl)}</p>
                <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>{clientes} × {fmt(porImpl)}</p>
              </div>
              <div className="rounded-2xl p-6 text-center"
                style={{ background: 'rgba(26,155,138,0.06)', border: '1px solid rgba(26,155,138,0.2)' }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#1A9B8A' }}>
                  Recorrente/mês
                </p>
                <p className="font-black text-2xl" style={{ color: '#1A9B8A' }}>{fmt(mensal)}</p>
                <p className="text-xs mt-1" style={{ color: '#4a6e68' }}>{clientes} × {fmt(MENSALIDADE_BASE * tier.recorrente)}</p>
              </div>
              <div className="rounded-2xl p-6 text-center"
                style={{ background: 'linear-gradient(135deg, #030d0b, #0f3d35)' }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#5EEAD4' }}>
                  Projeção 1º ano
                </p>
                <p className="text-white font-black text-2xl">{fmt(anual)}</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(94,234,212,0.4)' }}>impl. + 12 meses</p>
              </div>
            </div>
            <p className="text-xs text-center mt-6" style={{ color: '#94a3b8' }}>
              * Estimativa com mensalidade média de R$ 697. Valores reais podem ser maiores.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          POR QUE É FÁCIL VENDER — claro
      ═══════════════════════════════════════════════ */}
      <section className="py-28 px-6"
        style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f0f7f5 100%)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="reveal text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#1A9B8A' }}>
              Por que funciona
            </p>
            <h2 className="reveal reveal-delay-1 text-4xl sm:text-5xl font-black" style={{ color: '#0d1a18' }}>
              Um produto que <span className="gradient-text-dark">vende sozinho</span>
            </h2>
            <p className="reveal reveal-delay-2 text-lg mt-4 max-w-xl mx-auto" style={{ color: '#4a6e68' }}>
              Você não precisa convencer — o produto resolve um problema real que todo restaurante tem.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {MOTIVOS.map((m, i) => (
              <div key={m.title}
                className={`reveal reveal-delay-${(i % 3) + 1} light-card rounded-2xl p-6 flex flex-col gap-3`}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: 'rgba(26,155,138,0.08)' }}>
                  {m.emoji}
                </div>
                <div>
                  <p className="font-black text-base" style={{ color: '#0d1a18' }}>{m.title}</p>
                  <p className="text-sm mt-1.5 leading-relaxed" style={{ color: '#4a6e68' }}>{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          FORMULÁRIO — claro com grid
      ═══════════════════════════════════════════════ */}
      <section id="cadastro" className="teal-mist-hero py-28 px-6 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 50% 60% at 50% 50%, rgba(26,155,138,0.05) 0%, transparent 70%)' }} />

        <div className="relative max-w-xl mx-auto">
          <div className="text-center mb-12">
            <p className="reveal text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#1A9B8A' }}>
              Cadastro de parceiro
            </p>
            <h2 className="reveal reveal-delay-1 text-4xl sm:text-5xl font-black mb-4" style={{ color: '#0d1a18' }}>
              Comece a ganhar <span className="gradient-text">hoje</span>
            </h2>
            <p className="reveal reveal-delay-2 text-lg" style={{ color: '#4a6e68' }}>
              Preencha o formulário. Em até 24h você recebe seu link de indicação e acesso ao painel.
            </p>
          </div>

          {enviado ? (
            <div className="reveal light-card rounded-3xl p-10 text-center space-y-4">
              <div className="text-6xl">🎉</div>
              <h3 className="text-2xl font-black" style={{ color: '#0d1a18' }}>Cadastro recebido!</h3>
              <p className="leading-relaxed" style={{ color: '#4a6e68' }}>
                Nossa equipe vai analisar e entrar em contato em até 24h pelo WhatsApp. Bem-vindo ao programa Menuê+!
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold mt-2"
                style={{ background: 'rgba(26,155,138,0.1)', color: '#1A9B8A', border: '1px solid rgba(26,155,138,0.2)' }}>
                ✓ Fique de olho no seu WhatsApp
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="reveal light-card rounded-3xl p-8 space-y-5">
              {[
                { name: 'nome',     label: 'Seu nome completo *', type: 'text',  placeholder: 'Ex: João Silva',     required: true },
                { name: 'email',    label: 'E-mail *',             type: 'email', placeholder: 'seu@email.com',      required: true },
                { name: 'whatsapp', label: 'WhatsApp *',           type: 'text',  placeholder: '(00) 00000-0000',    required: true },
                { name: 'cidade',   label: 'Cidade (opcional)',     type: 'text',  placeholder: 'Ex: São Paulo - SP', required: false },
              ].map((f) => (
                <div key={f.name} className="space-y-1.5">
                  <label className="text-sm font-semibold" style={{ color: '#0d1a18' }}>{f.label}</label>
                  <input
                    name={f.name} type={f.type} required={f.required}
                    placeholder={f.placeholder}
                    value={form[f.name as keyof typeof form]}
                    onChange={handleChange}
                    className="w-full h-12 px-4 rounded-xl text-sm transition-all"
                    style={{ background: '#f8faf9', border: '1px solid rgba(26,155,138,0.2)', color: '#0d1a18' }}
                    onFocus={e => e.target.style.borderColor = '#1A9B8A'}
                    onBlur={e => e.target.style.borderColor = 'rgba(26,155,138,0.2)'}
                  />
                </div>
              ))}

              <div className="space-y-1.5">
                <label className="text-sm font-semibold" style={{ color: '#0d1a18' }}>
                  Como pretende indicar? <span style={{ color: '#94a3b8' }}>(opcional)</span>
                </label>
                <select name="como" value={form.como} onChange={handleChange}
                  className="w-full h-12 px-4 rounded-xl text-sm transition-all"
                  style={{
                    background: '#f8faf9',
                    border: '1px solid rgba(26,155,138,0.2)',
                    color: form.como ? '#0d1a18' : '#94a3b8',
                  }}>
                  <option value="" disabled>Selecione uma opção</option>
                  <option value="rede_pessoal">Rede de contatos pessoal</option>
                  <option value="redes_sociais">Redes sociais / conteúdo</option>
                  <option value="consultor">Sou consultor de restaurantes</option>
                  <option value="agencia">Agência / marketing</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <button type="submit"
                disabled={enviando || !form.nome || !form.email || !form.whatsapp}
                className="glow-btn w-full py-4 rounded-2xl text-base font-black text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#1A9B8A' }}>
                {enviando ? '⏳ Enviando...' : '🚀 Quero ser parceiro Menuê+'}
              </button>
              <p className="text-xs text-center" style={{ color: '#94a3b8' }}>
                Sem taxas de adesão · Sem mensalidade · Você só ganha quando indica
              </p>
            </form>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          FOOTER — teal sólido
      ═══════════════════════════════════════════════ */}
      <footer className="py-10 px-6" style={{ background: '#1A9B8A' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/20">
              <span className="font-black text-xs text-white">M+</span>
            </div>
            <span className="font-bold text-white">Menuê+</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-white/70">
            <Link href="/" className="hover:text-white transition-colors">Para restaurantes →</Link>
            <Link href="/parceiros/login" className="hover:text-white transition-colors">Acessar painel</Link>
          </div>
          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} Menuê+ · Programa de Parceiros
          </p>
        </div>
      </footer>

    </div>
  )
}
