'use client'

import { useState } from 'react'
import Link from 'next/link'

// ── Estrutura de comissões ──────────────────────────────────────────────────
const TIERS = [
  { min: 1,  max: 4,        label: '1–4 clientes',   recorrente: 0.10, cor: '#64748b' },
  { min: 5,  max: 9,        label: '5–9 clientes',   recorrente: 0.15, cor: '#1A9B8A' },
  { min: 10, max: 14,       label: '10–14 clientes', recorrente: 0.20, cor: '#1A9B8A' },
  { min: 15, max: 19,       label: '15–19 clientes', recorrente: 0.25, cor: '#0f7a6b' },
  { min: 20, max: Infinity, label: '20+ clientes',   recorrente: 0.30, cor: '#0a5a4f' },
]

const MENSALIDADE_BASE = 450   // R$ médio/mês (planos: R$350, R$450, R$650)
const VALOR_IMPL       = 2000  // R$ implementação por restaurante
const COMISSAO_IMPL    = 0.30  // 30% fixo na implementação

function getTier(n: number) {
  return TIERS.find((t) => n >= t.min && n <= t.max) ?? TIERS[TIERS.length - 1]
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

// ── Como funciona ──────────────────────────────────────────────────────────
const STEPS = [
  {
    n: '01',
    emoji: '📝',
    title: 'Cadastre-se como parceiro',
    desc: 'Preencha o formulário abaixo. Em até 24h você recebe seu link de indicação personalizado.',
  },
  {
    n: '02',
    emoji: '🤝',
    title: 'Indique restaurantes',
    desc: 'Compartilhe seu link com donos de restaurantes. Cada restaurante que contratar pelo seu link é seu cliente.',
  },
  {
    n: '03',
    emoji: '💸',
    title: 'Ganhe na implementação',
    desc: 'Assim que o restaurante fechar o contrato, você recebe 30% do valor de implementação. Direto na sua conta.',
  },
  {
    n: '04',
    emoji: '📅',
    title: 'Receba todo mês',
    desc: 'Enquanto o restaurante for cliente ativo, você ganha comissão recorrente. Quanto mais clientes, maior o %.',
  },
]

// ── Por que é fácil de vender ──────────────────────────────────────────────
const MOTIVOS = [
  { emoji: '📱', title: 'O cliente não precisa baixar nada', desc: 'QR code no celular já está no cardápio. Sem atrito, sem barreira de adoção.' },
  { emoji: '⚡', title: 'Implantação em 1 dia útil', desc: 'O restaurante assina hoje, está funcionando amanhã. Sem obra, sem hardware caro.' },
  { emoji: '💰', title: 'ROI imediato para o restaurante', desc: 'Reduz erros de pedido, aumenta ticket médio e libera garçons para mais mesas.' },
  { emoji: '🔒', title: 'Contrato sem fidelidade obrigatória', desc: 'Proposta sem pegadinha facilita a decisão e aumenta sua taxa de fechamento.' },
  { emoji: '🎨', title: 'Cardápio com a cara do restaurante', desc: 'Cada restaurante usa o sistema com a própria logo e cores. Seus clientes veem a marca do estabelecimento — não a nossa.' },
  { emoji: '📊', title: 'Dashboard de acompanhamento', desc: 'Você verá seus clientes ativos e comissões em tempo real no seu painel de parceiro.' },
]

// ── Componente principal ───────────────────────────────────────────────────
export default function ParceirosPage() {
  // Calculadora
  const [clientes, setClientes] = useState(5)
  const tier        = getTier(clientes)
  const mensal      = clientes * MENSALIDADE_BASE * tier.recorrente
  const porImpl     = VALOR_IMPL * COMISSAO_IMPL
  const anual       = mensal * 12 + clientes * porImpl
  const sliderPct   = ((clientes - 1) / 29) * 100

  // Formulário
  const [form, setForm]       = useState({ nome: '', email: '', whatsapp: '', cidade: '', como: '' })
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)

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

    if (resp.ok) {
      setEnviado(true)
    } else {
      const data = await resp.json().catch(() => ({}))
      alert(data.error || 'Erro ao enviar cadastro. Tente novamente.')
    }
    setEnviando(false)
  }

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 60%, #1A9B8A 100%)' }}
      >
        {/* Glow */}
        <div
          className="pointer-events-none absolute"
          style={{
            top: '10%', left: '55%',
            width: '700px', height: '700px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(26,155,138,0.2) 0%, transparent 70%)',
            filter: 'blur(70px)',
          }}
        />

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
          <Link href="/" className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <span className="text-white font-black text-sm">M+</span>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">Menuê+</span>
          </Link>
          <div className="hidden sm:flex items-center gap-2">
            <Link
              href="/"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white/60 hover:text-white transition-colors"
            >
              Para restaurantes
            </Link>
            <a
              href="#cadastro"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
              style={{ background: '#1A9B8A', color: '#fff' }}
            >
              Quero ser parceiro →
            </a>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-12 pb-28 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest"
              style={{ background: 'rgba(26,155,138,0.2)', color: '#5EEAD4', border: '1px solid rgba(26,155,138,0.3)' }}
            >
              🤝 Programa de parceiros Menuê+
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.05] tracking-tight">
              Indique restaurantes.{' '}
              <span style={{ color: '#5EEAD4' }}>Ganhe comissão</span>{' '}
              todo mês.
            </h1>

            <p className="text-teal-200/70 text-lg leading-relaxed max-w-lg">
              Você indica um restaurante para o Menuê+. Ele assina. Você recebe{' '}
              <strong className="text-white">30% da implementação</strong> na hora e{' '}
              <strong className="text-white">até 30% de recorrente</strong> todo mês enquanto ele for cliente.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="#cadastro"
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-black transition-all hover:opacity-90 shadow-lg"
                style={{ background: '#1A9B8A', color: '#fff' }}
              >
                📝 Quero ser parceiro
              </a>
              <a
                href="#calculadora"
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-bold transition-all hover:bg-white/10"
                style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                Calcular meus ganhos
              </a>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8 pt-2">
              {[
                { n: '30%', label: 'na implementação' },
                { n: 'até 30%', label: 'recorrente/mês' },
                { n: '∞', label: 'sem limite de clientes' },
              ].map(({ n, label }) => (
                <div key={label}>
                  <p className="text-white font-black text-2xl">{n}</p>
                  <p className="text-teal-300/60 text-xs">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Card de ganho estimado */}
          <div className="hidden lg:flex justify-end">
            <div
              className="w-80 rounded-3xl p-8 space-y-5"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)' }}
            >
              <p className="text-teal-300 text-xs font-bold uppercase tracking-widest">Exemplo real</p>
              <p className="text-white/60 text-sm leading-relaxed">
                Você indica <strong className="text-white">10 restaurantes</strong> ao longo de 3 meses.
              </p>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-3 border-b border-white/10">
                  <span className="text-teal-200/70 text-sm">Comissão de implementação</span>
                  <span className="text-white font-black">{fmt(10 * porImpl)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/10">
                  <span className="text-teal-200/70 text-sm">Recorrente/mês (20%)</span>
                  <span className="text-white font-black">{fmt(10 * MENSALIDADE_BASE * 0.20)}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-teal-300 text-sm font-bold">Projeção 1º ano</span>
                  <span className="font-black text-xl" style={{ color: '#5EEAD4' }}>
                    {fmt(10 * porImpl + 10 * MENSALIDADE_BASE * 0.20 * 12)}
                  </span>
                </div>
              </div>
              <p className="text-white/30 text-xs">* considerando mensalidade média de R$ 450/restaurante (planos R$350–R$650)</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: '#F0FAFA' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#1A9B8A' }}>
              Simples assim
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800">
              Como funciona o programa
            </h2>
            <p className="text-slate-500 mt-3 text-lg max-w-xl mx-auto">
              Quatro passos do cadastro ao dinheiro na conta.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step) => (
              <div key={step.n} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: '#1A9B8A' }}
                  >
                    <span className="text-white font-black text-xs">{step.n}</span>
                  </div>
                  <span className="text-2xl">{step.emoji}</span>
                </div>
                <div>
                  <p className="font-black text-slate-800 text-base">{step.title}</p>
                  <p className="text-slate-500 text-sm mt-1 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TABELA DE COMISSÕES ────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#1A9B8A' }}>
              Comissões
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800">
              Quanto mais você indica, mais você ganha
            </h2>
            <p className="text-slate-500 mt-3 text-lg max-w-xl mx-auto">
              A comissão recorrente cresce conforme sua carteira de clientes ativos aumenta.
            </p>
          </div>

          {/* Desktop — tabela */}
          <div className="hidden sm:block overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            <div className="grid grid-cols-4 gap-0" style={{ background: '#0f3d35' }}>
              {['Clientes ativos', 'Implementação', 'Recorrente/mês', 'Ganho mensal est.'].map((h) => (
                <div key={h} className="px-5 py-4">
                  <p className="text-teal-300 text-xs font-bold uppercase tracking-wider">{h}</p>
                </div>
              ))}
            </div>

            {TIERS.map((tier, i) => {
              const midClientes = tier.max === Infinity ? tier.min + 2 : Math.floor((tier.min + tier.max) / 2)
              const ganhoMensal = midClientes * MENSALIDADE_BASE * tier.recorrente
              const isDestaque  = tier.min === 10

              return (
                <div
                  key={tier.label}
                  className="grid grid-cols-4 gap-0 border-t border-slate-100"
                  style={{ background: isDestaque ? '#F0FDF4' : i % 2 === 0 ? '#fff' : '#FAFFFE' }}
                >
                  <div className="px-5 py-4 flex items-center gap-2">
                    <span className="font-black text-slate-800 text-sm">{tier.label}</span>
                    {isDestaque && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#dcfce7', color: '#16a34a' }}>
                        popular
                      </span>
                    )}
                  </div>
                  <div className="px-5 py-4 flex items-center">
                    <span className="text-slate-700 font-bold text-sm">
                      30% · <span className="text-slate-500 font-normal">{fmt(porImpl)}/cliente</span>
                    </span>
                  </div>
                  <div className="px-5 py-4 flex items-center">
                    <span className="font-black text-2xl" style={{ color: tier.cor }}>
                      {(tier.recorrente * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="px-5 py-4 flex items-center">
                    <span className="font-black text-slate-800 text-sm">
                      ~{fmt(ganhoMensal)}<span className="text-slate-400 font-normal text-xs">/mês</span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Mobile — cards */}
          <div className="sm:hidden space-y-3">
            {TIERS.map((tier) => {
              const midClientes = tier.max === Infinity ? tier.min + 2 : Math.floor((tier.min + tier.max) / 2)
              const ganhoMensal = midClientes * MENSALIDADE_BASE * tier.recorrente
              const isDestaque  = tier.min === 10

              return (
                <div
                  key={tier.label}
                  className="rounded-2xl p-5 border"
                  style={{
                    background: isDestaque ? '#F0FDF4' : '#fff',
                    borderColor: isDestaque ? '#bbf7d0' : '#e2e8f0',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-800">{tier.label}</span>
                      {isDestaque && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#dcfce7', color: '#16a34a' }}>
                          popular
                        </span>
                      )}
                    </div>
                    <span className="font-black text-3xl" style={{ color: tier.cor }}>
                      {(tier.recorrente * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-slate-400 text-xs">Implementação</p>
                      <p className="text-slate-700 font-semibold">{fmt(porImpl)}/cliente</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-xs">Ganho recorrente est.</p>
                      <p className="font-black text-slate-800">~{fmt(ganhoMensal)}<span className="text-slate-400 font-normal text-xs">/mês</span></p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <p className="text-slate-400 text-xs text-center mt-4">
            * Ganho mensal estimado com base na mensalidade média de R$ 450/restaurante.
          </p>
        </div>
      </section>

      {/* ── CALCULADORA ───────────────────────────────────────────────────── */}
      <section id="calculadora" className="py-24 px-6" style={{ background: '#F0FAFA' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#1A9B8A' }}>
              Calculadora
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800">
              Simule seus ganhos
            </h2>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            {/* Slider */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between">
                <label className="text-slate-700 font-bold text-base">Quantos restaurantes você vai indicar?</label>
                <span
                  className="text-2xl font-black px-4 py-1 rounded-xl"
                  style={{ background: '#F0FAFA', color: '#1A9B8A' }}
                >
                  {clientes}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                value={clientes}
                onChange={(e) => setClientes(Number(e.target.value))}
                className={[
                  'w-full h-2 rounded-full appearance-none cursor-grab active:cursor-grabbing',
                  // thumb — webkit
                  '[&::-webkit-slider-thumb]:appearance-none',
                  '[&::-webkit-slider-thumb]:w-6',
                  '[&::-webkit-slider-thumb]:h-6',
                  '[&::-webkit-slider-thumb]:rounded-full',
                  '[&::-webkit-slider-thumb]:bg-white',
                  '[&::-webkit-slider-thumb]:border-[3px]',
                  '[&::-webkit-slider-thumb]:border-teal-500',
                  '[&::-webkit-slider-thumb]:shadow-md',
                  '[&::-webkit-slider-thumb]:shadow-teal-200',
                  '[&::-webkit-slider-thumb]:cursor-grab',
                  '[&::-webkit-slider-thumb]:active:cursor-grabbing',
                  '[&::-webkit-slider-thumb]:transition-transform',
                  '[&::-webkit-slider-thumb]:hover:scale-110',
                  // thumb — firefox
                  '[&::-moz-range-thumb]:w-6',
                  '[&::-moz-range-thumb]:h-6',
                  '[&::-moz-range-thumb]:rounded-full',
                  '[&::-moz-range-thumb]:bg-white',
                  '[&::-moz-range-thumb]:border-[3px]',
                  '[&::-moz-range-thumb]:border-teal-500',
                  '[&::-moz-range-thumb]:shadow-md',
                  '[&::-moz-range-thumb]:cursor-grab',
                ].join(' ')}
                style={{
                  background: `linear-gradient(to right, #1A9B8A ${sliderPct}%, #e2e8f0 ${sliderPct}%)`,
                }}
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>1 cliente</span>
                <span>15</span>
                <span>30 clientes</span>
              </div>
            </div>

            {/* Tier badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-8 text-sm font-bold"
              style={{ background: '#F0FDF4', color: '#16a34a', border: '1px solid #bbf7d0' }}
            >
              <span>📊</span>
              <span>Faixa atual: {tier.label} → {(tier.recorrente * 100).toFixed(0)}% de recorrente</span>
            </div>

            {/* Resultados */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div
                className="rounded-2xl p-6 text-center"
                style={{ background: '#F8FAFC', border: '1px solid #e2e8f0' }}
              >
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Por implementação</p>
                <p className="text-slate-800 font-black text-2xl">{fmt(clientes * porImpl)}</p>
                <p className="text-slate-400 text-xs mt-1">{clientes} × {fmt(porImpl)}</p>
              </div>

              <div
                className="rounded-2xl p-6 text-center"
                style={{ background: '#F0FDF4', border: '1px solid #bbf7d0' }}
              >
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#16a34a' }}>Recorrente/mês</p>
                <p className="font-black text-2xl" style={{ color: '#1A9B8A' }}>{fmt(mensal)}</p>
                <p className="text-slate-400 text-xs mt-1">{clientes} × {fmt(MENSALIDADE_BASE * tier.recorrente)}</p>
              </div>

              <div
                className="rounded-2xl p-6 text-center"
                style={{ background: 'linear-gradient(135deg, #0f3d35, #1A9B8A)' }}
              >
                <p className="text-teal-300 text-xs font-bold uppercase tracking-wider mb-2">Projeção 1º ano</p>
                <p className="text-white font-black text-2xl">{fmt(anual)}</p>
                <p className="text-teal-300/60 text-xs mt-1">impl. + 12 meses</p>
              </div>
            </div>

            <p className="text-slate-400 text-xs text-center mt-6">
              * Estimativa com base na mensalidade média de R$ 450 (planos: R$350 / R$450 / R$650). Valores reais podem ser maiores.
            </p>
          </div>
        </div>
      </section>

      {/* ── POR QUE É FÁCIL VENDER ────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#1A9B8A' }}>
              Por que funciona
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800">
              Um produto que vende sozinho
            </h2>
            <p className="text-slate-500 mt-3 text-lg max-w-xl mx-auto">
              Você não precisa convencer ninguém — o produto resolve um problema real que todo restaurante tem.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {MOTIVOS.map((m) => (
              <div
                key={m.title}
                className="rounded-2xl p-6 border border-slate-100 hover:border-teal-200 hover:shadow-md transition-all"
                style={{ background: '#FAFFFE' }}
              >
                <span className="text-3xl">{m.emoji}</span>
                <p className="font-black text-slate-800 text-base mt-3">{m.title}</p>
                <p className="text-slate-500 text-sm mt-1 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FORMULÁRIO DE CADASTRO ─────────────────────────────────────────── */}
      <section
        id="cadastro"
        className="py-24 px-6"
        style={{ background: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 60%, #1A9B8A 100%)' }}
      >
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-3 text-teal-400">
              Cadastro de parceiro
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              Comece a ganhar hoje
            </h2>
            <p className="text-teal-200/70 text-lg">
              Preencha o formulário. Em até 24h você recebe seu link de indicação e acesso ao painel.
            </p>
          </div>

          {enviado ? (
            /* ── Sucesso ── */
            <div
              className="rounded-3xl p-10 text-center space-y-4"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <div className="text-6xl">🎉</div>
              <h3 className="text-2xl font-black text-white">Cadastro recebido!</h3>
              <p className="text-teal-200/70 leading-relaxed">
                Nossa equipe vai analisar seu cadastro e entrar em contato em até 24h pelo WhatsApp que você informou.
                Bem-vindo ao programa de parceiros Menuê+!
              </p>
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold mt-2"
                style={{ background: 'rgba(26,155,138,0.3)', color: '#5EEAD4' }}
              >
                ✓ Fique de olho no seu WhatsApp
              </div>
            </div>
          ) : (
            /* ── Formulário ── */
            <form
              onSubmit={handleSubmit}
              className="rounded-3xl p-8 space-y-5"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              {/* Nome */}
              <div className="space-y-1.5">
                <label className="text-teal-200/80 text-sm font-semibold">Seu nome completo *</label>
                <input
                  name="nome"
                  required
                  placeholder="Ex: João Silva"
                  value={form.nome}
                  onChange={handleChange}
                  className="w-full h-12 px-4 rounded-xl text-sm text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-teal-400"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-teal-200/80 text-sm font-semibold">E-mail *</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full h-12 px-4 rounded-xl text-sm text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-teal-400"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                />
              </div>

              {/* WhatsApp */}
              <div className="space-y-1.5">
                <label className="text-teal-200/80 text-sm font-semibold">WhatsApp *</label>
                <input
                  name="whatsapp"
                  required
                  placeholder="(00) 00000-0000"
                  value={form.whatsapp}
                  onChange={handleChange}
                  className="w-full h-12 px-4 rounded-xl text-sm text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-teal-400"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                />
              </div>

              {/* Cidade */}
              <div className="space-y-1.5">
                <label className="text-teal-200/80 text-sm font-semibold">
                  Cidade <span className="text-teal-300/40 font-normal">(opcional)</span>
                </label>
                <input
                  name="cidade"
                  placeholder="Ex: São Paulo - SP"
                  value={form.cidade}
                  onChange={handleChange}
                  className="w-full h-12 px-4 rounded-xl text-sm text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-teal-400"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                />
              </div>

              {/* Como pretende indicar */}
              <div className="space-y-1.5">
                <label className="text-teal-200/80 text-sm font-semibold">
                  Como pretende indicar? <span className="text-teal-300/40 font-normal">(opcional)</span>
                </label>
                <select
                  name="como"
                  value={form.como}
                  onChange={handleChange}
                  className="w-full h-12 px-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-400"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: form.como ? '#fff' : 'rgba(255,255,255,0.3)',
                  }}
                >
                  <option value="" disabled style={{ color: '#94a3b8', background: '#0f3d35' }}>Selecione uma opção</option>
                  <option value="rede_pessoal" style={{ color: '#0f172a', background: '#fff' }}>Rede de contatos pessoal</option>
                  <option value="redes_sociais" style={{ color: '#0f172a', background: '#fff' }}>Redes sociais / conteúdo</option>
                  <option value="consultor" style={{ color: '#0f172a', background: '#fff' }}>Sou consultor de restaurantes</option>
                  <option value="agencia" style={{ color: '#0f172a', background: '#fff' }}>Agência / marketing</option>
                  <option value="outro" style={{ color: '#0f172a', background: '#fff' }}>Outro</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={enviando || !form.nome || !form.email || !form.whatsapp}
                className="w-full h-13 py-4 rounded-2xl text-base font-black text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#1A9B8A' }}
              >
                {enviando ? '⏳ Enviando...' : '🚀 Quero ser parceiro Menuê+'}
              </button>

              <p className="text-teal-300/40 text-xs text-center">
                Sem taxas de adesão · Sem mensalidade · Você só ganha quando indica
              </p>
            </form>
          )}
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 text-center" style={{ background: '#0a2420' }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            <span className="text-white font-black text-xs">M+</span>
          </div>
          <span className="text-white font-bold">Menuê+</span>
        </div>
        <p className="text-teal-700 text-xs">
          © {new Date().getFullYear()} Menuê+ · Programa de Parceiros
        </p>
        <Link href="/" className="text-teal-700 text-xs hover:text-teal-500 underline underline-offset-2 mt-1 inline-block transition-colors">
          Ver plataforma para restaurantes →
        </Link>
      </footer>

    </div>
  )
}
