import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Menuê+ — Cardápio digital e gestão de pedidos para restaurantes',
  description: 'Transforme a experiência do seu restaurante com cardápio digital por QR code, pedidos em tempo real e gestão completa. Sem app, sem filas, sem erro.',
}

const FEATURES = [
  {
    emoji: '📱',
    title: 'Cardápio digital por QR',
    desc: 'O cliente escaneia o QR na mesa, vê o cardápio atualizado e faz o pedido direto pelo celular. Sem baixar app.',
  },
  {
    emoji: '⚡',
    title: 'Pedidos em tempo real',
    desc: 'Cada pedido chega instantaneamente na estação certa: cozinha, bar, drinks ou chopeira. Zero papel, zero ruído.',
  },
  {
    emoji: '🛎️',
    title: 'Painel do garçom',
    desc: 'O garçom vê tudo que está pronto para entregar e recebe chamadas de clientes em tempo real, sem precisar ficar circulando.',
  },
  {
    emoji: '📊',
    title: 'Dashboard ao vivo',
    desc: 'Visão completa de mesas abertas, comandas ativas e status de cada pedido — tudo atualizado sem recarregar a página.',
  },
  {
    emoji: '👥',
    title: 'Controle de acesso',
    desc: 'Crie logins por funcionário com cargo (admin ou operador). Cada um acessa só o que precisa.',
  },
  {
    emoji: '💰',
    title: 'Gestão financeira',
    desc: 'Acompanhe faturamento, ticket médio e top clientes. Dados reais do seu restaurante, sem planilha.',
  },
]

const STEPS = [
  {
    n: '01',
    title: 'QR code na mesa',
    desc: 'Imprime e cola. O cliente escaneia e já está no cardápio do seu restaurante.',
    color: '#1A9B8A',
  },
  {
    n: '02',
    title: 'Cliente faz o pedido',
    desc: 'Escolhe os itens, adiciona observações e confirma. Simples como pedir por WhatsApp.',
    color: '#127a6d',
  },
  {
    n: '03',
    title: 'Cozinha recebe na hora',
    desc: 'O pedido aparece na tela da estação correta em segundos. Sem grito, sem confusão.',
    color: '#1A9B8A',
  },
  {
    n: '04',
    title: 'Garçom entrega',
    desc: 'Notificação automática quando o item fica pronto. Um clique para confirmar a entrega.',
    color: '#127a6d',
  },
]

const DIFERENCIAIS = [
  { icon: '🚫', text: 'Sem aplicativo para baixar' },
  { icon: '⏱️', text: 'Implantação em menos de 1 dia' },
  { icon: '📶', text: 'Funciona em qualquer celular com internet' },
  { icon: '🔔', text: 'Notificação sonora quando o pedido fica pronto' },
  { icon: '🧑‍🍳', text: 'Múltiplas estações independentes' },
  { icon: '📍', text: 'Chamada de garçom pelo próprio celular do cliente' },
  { icon: '💳', text: 'Cliente pode chamar para pagar — Pix ou conta' },
  { icon: '📈', text: 'Histórico e ranking de clientes automático' },
]

export default function LandingPage() {
  const whatsapp = 'https://wa.me/5547988194822?text=Ol%C3%A1%2C%20quero%20saber%20mais%20sobre%20o%20Menu%C3%AA%2B'

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── HERO ── */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0d6b5e 0%, #1A9B8A 55%, #26c6b5 100%)' }}
      >
        {/* Glow */}
        <div
          className="pointer-events-none absolute"
          style={{
            top: '20%', left: '60%',
            width: '600px', height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(26,155,138,0.25) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <span className="text-white font-black text-sm">M+</span>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">Menuê+</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Link
              href="/parceiros"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white/70 hover:text-white transition-colors"
            >
              Seja parceiro
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white/70 hover:text-white transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/registro"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
              style={{ background: '#1A9B8A', color: '#fff' }}
            >
              Testar grátis →
            </Link>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-12 pb-24 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest"
              style={{ background: 'rgba(26,155,138,0.2)', color: '#5EEAD4', border: '1px solid rgba(26,155,138,0.3)' }}>
              🚀 Cardápio digital para restaurantes
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.05] tracking-tight">
              Gastronomia{' '}
              <span style={{ color: '#5EEAD4' }}>sem filas,</span>{' '}
              sem papel e{' '}
              <span style={{ color: '#5EEAD4' }}>sem erros!</span>
            </h1>

            <p className="text-teal-200/70 text-lg leading-relaxed max-w-lg">
              Cardápio digital via QR code, pedidos direto para cozinha e bar, painel do garçom e gestão completa — tudo em uma plataforma.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/registro"
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-black transition-all hover:opacity-90 shadow-lg"
                style={{ background: '#1A9B8A', color: '#fff' }}
              >
                🚀 Realizar teste grátis
              </Link>
              <a
                href="#como-funciona"
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-bold transition-all hover:bg-white/10"
                style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                Ver como funciona
              </a>
            </div>

            <p className="text-teal-300/50 text-sm">
              Já tem uma conta?{' '}
              <Link href="/login" className="text-teal-300 hover:text-white underline underline-offset-2 transition-colors">
                Entrar aqui
              </Link>
            </p>

            <div className="flex items-center gap-6 pt-2">
              {[
                { n: 'R$ 397', label: 'mínimo/mês' },
                { n: '1 dia', label: 'de implantação' },
                { n: '0 apps', label: 'para instalar' },
              ].map(({ n, label }) => (
                <div key={label}>
                  <p className="text-white font-black text-2xl">{n}</p>
                  <p className="text-teal-300/60 text-xs">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Phone com screenshot real */}
          <div className="flex justify-center">
            <div
              className="relative w-56 lg:w-72 rounded-[2.5rem] p-2 shadow-2xl"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              {/* Notch */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-5 rounded-full z-10"
                style={{ background: 'rgba(255,255,255,0.08)' }} />
              <div className="rounded-[2.2rem] overflow-hidden">
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
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section id="como-funciona" className="py-24 px-6" style={{ background: '#F0FAFA' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#1A9B8A' }}>
              Fluxo completo
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800">
              Do QR code ao prato na mesa
            </h2>
            <p className="text-slate-500 mt-3 text-lg max-w-xl mx-auto">
              Quatro passos simples que eliminam ruído, erro e tempo perdido na operação.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step) => (
              <div key={step.n} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: step.color }}
                >
                  <span className="text-white font-black text-sm">{step.n}</span>
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

      {/* ── FUNCIONALIDADES ── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#1A9B8A' }}>
              Plataforma completa
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800">
              Tudo que seu restaurante precisa
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl p-6 border border-slate-100 hover:border-teal-200 hover:shadow-md transition-all"
                style={{ background: '#FAFFFE' }}
              >
                <span className="text-3xl">{f.emoji}</span>
                <p className="font-black text-slate-800 text-base mt-3">{f.title}</p>
                <p className="text-slate-500 text-sm mt-1 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DIFERENCIAIS ── */}
      <section className="py-24 px-6" style={{ background: '#F0FAFA' }}>
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#1A9B8A' }}>
              Por que Menuê+
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800 mb-6">
              Simples para o cliente.<br />Poderoso para você.
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed">
              Desenvolvido especificamente para a realidade dos restaurantes brasileiros — sem complicação, sem hardware caro, sem taxa por pedido.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {DIFERENCIAIS.map(({ icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-4 bg-white rounded-xl px-5 py-3.5 shadow-sm border border-slate-100"
              >
                <span className="text-2xl shrink-0">{icon}</span>
                <span className="text-slate-700 font-medium text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ESTAÇÕES ── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#1A9B8A' }}>
              Operação em tempo real
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800">
              Cada estação no seu ritmo
            </h2>
            <p className="text-slate-500 mt-3 text-lg max-w-xl mx-auto">
              Cozinha, bar, drinks e chopeira recebem somente os pedidos que são deles. Nada de confusão.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { emoji: '🍳', label: 'Cozinha', desc: 'Pratos, entradas e tudo que sai do fogão' },
              { emoji: '🍺', label: 'Bar', desc: 'Cervejas, doses e bebidas simples' },
              { emoji: '🍹', label: 'Drinks', desc: 'Coquetéis e bebidas elaboradas' },
              { emoji: '🍻', label: 'Chopeira', desc: 'Controle dedicado para chope' },
            ].map((e) => (
              <div
                key={e.label}
                className="rounded-2xl p-6 text-center border border-slate-100 hover:shadow-md transition-all"
                style={{ background: '#F0FAFA' }}
              >
                <span className="text-5xl">{e.emoji}</span>
                <p className="font-black text-slate-800 text-lg mt-3">{e.label}</p>
                <p className="text-slate-500 text-xs mt-1">{e.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PREÇO ── */}
      <section
        className="py-24 px-6"
        style={{ background: 'linear-gradient(135deg, #0d6b5e 0%, #1A9B8A 55%, #26c6b5 100%)' }}
      >
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-widest mb-3 text-teal-400">
            Investimento
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Preço fixo, sem surpresa no mês
          </h2>
          <p className="text-teal-200/70 text-lg max-w-xl mx-auto mb-4">
            Você paga pelo tamanho da sua equipe conectada — garçons, cozinha, bar, estações e admin.
          </p>
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-12"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#5EEAD4', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            💡 Usuários = cada tela conectada: garçom, cozinha, bar, drinks, chopeira, admin
          </div>

          {/* Implementação */}
          <div
            className="max-w-sm mx-auto rounded-2xl p-6 mb-8 text-left"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)' }}
          >
            <p className="text-teal-300 text-xs font-bold uppercase tracking-widest mb-3">Implementação · única vez</p>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-white font-black text-4xl">R$ 2.000</span>
            </div>
            <ul className="space-y-2 text-sm text-teal-100/70">
              {[
                'Configuração completa da plataforma',
                'Cadastro dos produtos (sem fotos)',
                'QR codes das mesas',
                'Treinamento da equipe no sistema',
                'Suporte no 1º mês',
              ].map((i) => (
                <li key={i} className="flex items-start gap-2"><span className="text-teal-400">✓</span>{i}</li>
              ))}
            </ul>
            <div
              className="mt-4 flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <span className="text-yellow-400 shrink-0">📸</span>
              <span className="text-teal-200/60">
                Cadastro <strong className="text-teal-200/90">com fotos</strong> dos produtos é orçado à parte — consulte nossa equipe.
              </span>
            </div>
          </div>

          {/* Planos mensais */}
          <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto mb-6">
            {[
              { nome: 'Starter',  mesas: 'Até 15 mesas',  preco: 397,  destaque: false, desc: 'Para bares e restaurantes que estão começando a digitalizar a operação.' },
              { nome: 'Pro',      mesas: 'Até 30 mesas',  preco: 697,  destaque: true,  desc: 'Para operações em crescimento que precisam de visibilidade e controle.' },
              { nome: 'Business', mesas: 'Até 60 mesas',  preco: 1197, destaque: false, desc: 'Para grandes operações com múltiplas estações e equipes completas.' },
            ].map((p) => (
              <div
                key={p.nome}
                className="relative rounded-2xl p-6 text-left"
                style={{
                  background: p.destaque ? 'rgba(26,155,138,0.25)' : 'rgba(255,255,255,0.06)',
                  border: p.destaque ? '1px solid rgba(26,155,138,0.5)' : '1px solid rgba(255,255,255,0.12)',
                }}
              >
                {p.destaque && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-white text-xs font-bold"
                    style={{ background: '#1A9B8A' }}
                  >
                    mais popular
                  </div>
                )}
                <p className="text-white font-black text-base mb-0.5">{p.nome}</p>
                <p className="text-teal-300/60 text-xs mb-1">{p.mesas} · usuários ilimitados</p>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-white font-black text-3xl">R$ {p.preco}</span>
                  <span className="text-teal-300/50 text-sm">/mês</span>
                </div>
                <p className="text-teal-200/50 text-xs leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>

          {/* Enterprise */}
          <div
            className="max-w-4xl mx-auto rounded-2xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 mb-10"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)' }}
          >
            <div className="text-left">
              <p className="text-white font-bold text-sm">Mais de 60 mesas ou precisa de algo sob medida?</p>
              <p className="text-teal-300/50 text-xs mt-0.5">Redes, franquias e grandes operações — montamos um plano personalizado.</p>
            </div>
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              📲 Falar com a gente
            </a>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/registro"
              className="flex items-center gap-2 px-10 py-4 rounded-2xl text-base font-black transition-all hover:opacity-90 shadow-xl"
              style={{ background: '#1A9B8A', color: '#fff' }}
            >
              🚀 Criar minha conta agora
            </Link>
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold transition-all hover:bg-white/10"
              style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              📲 Falar com consultor
            </a>
          </div>
          <p className="mt-4 text-teal-300/40 text-sm">
            Já tem conta?{' '}
            <Link href="/login" className="text-teal-300/70 hover:text-teal-300 underline underline-offset-2 transition-colors">
              Entrar
            </Link>
          </p>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-800">
            Pronto para modernizar<br />seu restaurante?
          </h2>
          <p className="text-slate-500 text-lg">
            Converse com a gente. Mostramos o sistema funcionando em uma demonstração gratuita e sem compromisso.
          </p>
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-lg font-black text-white transition-all hover:opacity-90 shadow-xl shadow-teal-200"
            style={{ background: '#1A9B8A' }}
          >
            📲 Falar no WhatsApp
          </a>
          <p className="text-slate-400 text-sm">
            Demonstração gratuita · Implantação em até 1 dia útil
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="py-8 px-6 text-center"
        style={{ background: '#0d6b5e' }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            <span className="text-white font-black text-xs">M+</span>
          </div>
          <span className="text-white font-bold">Menuê+</span>
        </div>
        <p className="text-teal-200/60 text-xs">
          © {new Date().getFullYear()} Menuê+ · Cardápio digital para restaurantes
        </p>
        <Link href="/parceiros" className="text-teal-200/60 text-xs hover:text-teal-200 underline underline-offset-2 mt-1 inline-block transition-colors">
          Programa de Parceiros →
        </Link>
      </footer>
    </div>
  )
}
