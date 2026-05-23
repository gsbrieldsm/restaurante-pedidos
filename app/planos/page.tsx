'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2, Loader2, QrCode, BarChart2,
  Users, Smartphone, ShieldCheck, Headphones,
  Sparkles, Clock, CreditCard, ChefHat,
} from 'lucide-react'

const INCLUSOS = [
  { icon: QrCode,       texto: 'Cardápio digital com QR Code por mesa' },
  { icon: Smartphone,   texto: 'Pedidos em tempo real para cozinha e bar' },
  { icon: Users,        texto: 'Gestão de garçons e estações' },
  { icon: BarChart2,    texto: 'Relatórios de vendas e performance' },
  { icon: ShieldCheck,  texto: 'Dados seguros e backup automático' },
  { icon: Headphones,   texto: 'Suporte via WhatsApp' },
]

const IMPL_INCLUSOS = [
  { ok: true,  texto: 'Configuração completa da plataforma' },
  { ok: true,  texto: 'Cadastro dos produtos (sem fotos)' },
  { ok: true,  texto: 'QR codes de todas as mesas' },
  { ok: true,  texto: 'Treinamento da equipe no sistema' },
  { ok: true,  texto: 'Suporte dedicado no 1º mês' },
  { ok: false, texto: 'Cadastro com fotos dos produtos — orçado à parte' },
]

const PLANOS = [
  {
    id:       'starter',
    nome:     'Starter',
    usuarios: 'Até 5 usuários',
    preco:    350,
    destaque: false,
    exemplos: ['1 admin', '2 garçons', '1 cozinha', '1 bar'],
  },
  {
    id:       'pro',
    nome:     'Pro',
    usuarios: '6 a 10 usuários',
    preco:    450,
    destaque: true,
    exemplos: ['1 admin', '4 garçons', '1 cozinha', '1 bar', '1 drinks', '+ mais'],
  },
  {
    id:       'business',
    nome:     'Business',
    usuarios: '11 a 20 usuários',
    preco:     650,
    destaque: false,
    exemplos: ['Múltiplos admins', 'Equipe de garçons', 'Várias estações', 'Operação completa'],
  },
]

const COR = '#1A9B8A'

export default function PlanosPage() {
  const router = useRouter()
  const [planoSelecionado, setPlanoSelecionado] = useState('pro')
  const [aceitando, setAceitando] = useState(false)
  const [aceito,    setAceito]    = useState(false)

  const plano = PLANOS.find((p) => p.id === planoSelecionado)!

  async function iniciarTrial() {
    setAceitando(true)

    const resp = await fetch('/api/tenant/plano', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ plano: planoSelecionado }),
    })
    const data = await resp.json()

    if (!resp.ok) {
      alert(data.error || 'Erro ao ativar conta.')
      setAceitando(false)
      return
    }

    await fetch('/api/tenant/setup', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ qtd_mesas: 10 }),
    })

    setAceito(true)
    setTimeout(() => router.push('/admin'), 1200)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 py-12" style={{ background: '#F0FAFA' }}>
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div
          className="rounded-2xl px-8 pt-10 pb-8 text-white mb-6 shadow-xl"
          style={{ background: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 50%, #1A9B8A 100%)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <ChefHat className="w-5 h-5 text-teal-400" />
            <p className="text-xs font-bold tracking-widest uppercase text-teal-400">Menuê+</p>
          </div>
          <h1 className="text-3xl font-black leading-tight">
            7 dias grátis.<br />Sem cobrança. Sem cartão.
          </h1>
          <p className="text-white/60 text-sm mt-3 leading-relaxed">
            Explore tudo sem compromisso. Depois do trial, você escolhe se quer continuar com a implementação e o plano mensal.
          </p>

          {/* Badges do trial */}
          <div className="flex flex-wrap gap-2 mt-5">
            {[
              { icon: Sparkles, text: 'Acesso completo por 7 dias' },
              { icon: CreditCard, text: 'Sem cartão de crédito' },
              { icon: Clock, text: 'Cancele quando quiser' },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
              >
                <Icon className="w-3.5 h-3.5 text-teal-300" />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Aviso de plano — escolha agora, paga só depois */}
        <div
          className="rounded-2xl px-6 py-4 mb-5 flex items-center gap-3"
          style={{ background: '#fff', border: '2px solid #e2e8f0' }}
        >
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-teal-500" />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">Escolha seu plano agora, pague só se gostar</p>
            <p className="text-slate-500 text-xs mt-0.5">
              Seu trial começa com o plano selecionado. Ao final dos 7 dias, nossa equipe entra em contato para combinar a implementação e o pagamento.
            </p>
          </div>
        </div>

        {/* Cards de plano */}
        <div className="grid sm:grid-cols-3 gap-4 mb-5">
          {PLANOS.map((p) => {
            const ativo = planoSelecionado === p.id
            return (
              <button
                key={p.id}
                onClick={() => setPlanoSelecionado(p.id)}
                className="relative rounded-2xl p-5 text-left transition-all hover:shadow-md"
                style={{
                  background: '#fff',
                  border:     ativo ? `2px solid ${COR}` : '2px solid #e2e8f0',
                  boxShadow:  ativo ? `0 0 0 4px ${COR}22` : undefined,
                }}
              >
                {p.destaque && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-white text-xs font-bold whitespace-nowrap"
                    style={{ background: COR }}
                  >
                    mais popular
                  </div>
                )}
                <p className="font-black text-slate-800 text-base">{p.nome}</p>
                <p className="text-xs text-slate-500 mb-3">{p.usuarios}</p>

                {/* Preço com destaque no trial */}
                <div className="mb-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black" style={{ color: ativo ? COR : '#0f172a' }}>
                      R$ {p.preco}
                    </span>
                    <span className="text-slate-400 text-xs">/mês</span>
                  </div>
                  <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                    7 dias grátis
                  </span>
                </div>

                <ul className="space-y-1.5">
                  {p.exemplos.map((ex) => (
                    <li key={ex} className="flex items-center gap-2 text-xs text-slate-600">
                      <span style={{ color: COR }}>✓</span>
                      {ex}
                    </li>
                  ))}
                </ul>

                {ativo && (
                  <div
                    className="mt-4 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold text-white"
                    style={{ background: COR }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Selecionado
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Enterprise */}
        <div
          className="rounded-2xl px-6 py-4 flex items-center justify-between mb-5"
          style={{ background: '#fff', border: '2px dashed #e2e8f0' }}
        >
          <div>
            <p className="font-bold text-slate-700 text-sm">Mais de 20 usuários?</p>
            <p className="text-slate-400 text-xs mt-0.5">Redes, franquias e grandes operações — montamos um plano sob medida.</p>
          </div>
          <a
            href="https://wa.me/5547988194822?text=Ol%C3%A1%2C%20preciso%20de%20um%20plano%20enterprise%20para%20mais%20de%2020%20usu%C3%A1rios"
            target="_blank" rel="noopener noreferrer"
            className="shrink-0 ml-4 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: '#0f3d35' }}
          >
            Falar no WhatsApp →
          </a>
        </div>

        {/* Card de confirmação */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

          {/* Resumo */}
          <div className="px-8 py-5 border-b border-slate-100">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Plano selecionado</p>
                <p className="text-xl font-black text-slate-800">{plano.nome} — {plano.usuarios}</p>
              </div>
              <div className="text-right">
                <div className="flex items-baseline gap-1 justify-end">
                  <span className="text-3xl font-black" style={{ color: COR }}>R$ {plano.preco}</span>
                  <span className="text-slate-400">/mês</span>
                </div>
                <p className="text-xs text-teal-600 font-semibold mt-0.5">após os 7 dias de trial</p>
              </div>
            </div>
          </div>

          {/* O que acontece nos 7 dias */}
          <div className="px-8 py-5 border-b border-slate-100">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">O que acontece agora</p>
            <div className="space-y-3">
              {[
                { n: '1', texto: 'Você acessa o painel completo imediatamente — hoje mesmo.', cor: COR },
                { n: '2', texto: 'Tem 7 dias para testar com sua equipe, montar o cardápio e explorar tudo.', cor: COR },
                { n: '3', texto: 'No final do trial, nossa equipe entra em contato para combinar a implementação (R$ 2.000) e o pagamento mensal.', cor: COR },
                { n: '4', texto: 'Sem surpresas. Só continua quem quiser.', cor: '#16a34a' },
              ].map(({ n, texto, cor }) => (
                <div key={n} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-black text-white mt-0.5" style={{ background: cor }}>
                    {n}
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{texto}</p>
                </div>
              ))}
            </div>
          </div>

          {/* O que está incluso */}
          <div className="px-8 py-6 border-b border-slate-100">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Acesso completo durante o trial</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {INCLUSOS.map(({ icon: Icon, texto }) => (
                <div key={texto} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-teal-600" />
                  </div>
                  <span className="text-sm text-slate-700">{texto}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Implementação */}
          <div className="px-8 py-5 border-b border-slate-100">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
              Implementação · R$ 2.000 — cobrada apenas se continuar
            </p>
            <div className="space-y-2">
              {IMPL_INCLUSOS.map(({ ok, texto }) => (
                <div key={texto} className="flex items-center gap-3">
                  {ok
                    ? <span className="text-teal-500 text-sm shrink-0">✓</span>
                    : <span className="text-amber-400 text-sm shrink-0">📸</span>}
                  <span className={`text-sm ${ok ? 'text-slate-700' : 'text-slate-500'}`}>{texto}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
              <p className="text-xs text-amber-700">
                📸 <strong>Fotos dos produtos:</strong> o cadastro com fotos é orçado à parte, conforme volume e complexidade do cardápio.
              </p>
            </div>
          </div>

          {/* Aviso */}
          <div className="px-8 pt-4 pb-2">
            <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 leading-relaxed">
              Ao clicar em <strong className="text-slate-700">"Começar trial gratuito"</strong> você confirma que está ciente dos valores acima e concorda com os termos de uso do Menuê+. O trial dura 7 dias sem nenhuma cobrança.
            </div>
          </div>

          {/* Botão */}
          <div className="px-8 pb-8 pt-4">
            <Button
              onClick={iniciarTrial}
              disabled={aceitando || aceito}
              className="w-full text-base font-bold text-white hover:opacity-90"
              style={{ background: aceito ? '#16a34a' : COR, height: '52px' }}
            >
              {aceito ? (
                <><CheckCircle2 className="w-5 h-5 mr-2" /> Trial ativado! Abrindo seu painel...</>
              ) : aceitando ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Ativando trial...</>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Começar trial gratuito — Plano {plano.nome}
                </>
              )}
            </Button>
            <p className="text-center text-xs text-slate-400 mt-3">
              🔒 Sem cartão de crédito · 7 dias grátis · Cancele quando quiser
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Dúvidas antes de começar?{' '}
          <a
            href="https://wa.me/5547988194822"
            target="_blank" rel="noopener noreferrer"
            className="text-teal-600 underline underline-offset-2"
          >
            Fale com a gente no WhatsApp
          </a>
        </p>

      </div>
    </div>
  )
}
