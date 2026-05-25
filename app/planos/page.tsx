'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2, Loader2, QrCode, BarChart2,
  Smartphone, ShieldCheck, Headphones,
  Sparkles, Clock, CreditCard, ChefHat,
  X, Utensils, MessageCircle, UtensilsCrossed,
  ShoppingBag, Hash, Tv2, Zap,
} from 'lucide-react'

const COR = '#1A9B8A'

// ── Planos Mesa ──────────────────────────────────────────────────────────────
const PLANOS_MESA = [
  {
    id:       'starter',
    nome:     'Starter',
    mesas:    'Até 15 mesas',
    preco:    397,
    destaque: false,
    cor:      '#0f3d35',
    desc:     'Para bares e restaurantes que estão começando a digitalizar a operação.',
  },
  {
    id:       'pro',
    nome:     'Pro',
    mesas:    'Até 30 mesas',
    preco:    597,
    destaque: true,
    cor:      COR,
    desc:     'Para operações em crescimento que precisam de visibilidade e controle.',
  },
  {
    id:       'business',
    nome:     'Business',
    mesas:    'Até 60 mesas',
    preco:    799,
    destaque: false,
    cor:      '#7c3aed',
    desc:     'Para grandes operações com múltiplas estações e equipes completas.',
  },
]

// ── Feature matrix Mesa ──────────────────────────────────────────────────────
type TierMesa = 'starter' | 'pro' | 'business'

const FEATURES_MESA: {
  categoria: string
  itens: { texto: string; starter: boolean | string; pro: boolean | string; business: boolean | string; destaque?: boolean }[]
}[] = [
  {
    categoria: 'Operação',
    itens: [
      { texto: 'Cardápio digital com QR Code',       starter: true,         pro: true,          business: true },
      { texto: 'Pedidos em tempo real',               starter: true,         pro: true,          business: true },
      { texto: 'Gestão de garçons',                   starter: true,         pro: true,          business: true },
      { texto: 'Estações (cozinha, bar, drinks…)',    starter: '2 estações', pro: '4 estações',  business: 'Ilimitadas' },
      { texto: 'Mesas',                               starter: 'Até 15',     pro: 'Até 30',      business: 'Até 60' },
      { texto: 'Usuários',                            starter: 'Ilimitado',  pro: 'Ilimitado',   business: 'Ilimitado' },
    ],
  },
  {
    categoria: 'Inteligência & Performance',
    itens: [
      { texto: 'Relatórios de vendas',                starter: true,  pro: true,  business: true },
      { texto: 'Painel de Performance',               starter: false, pro: true,  business: true, destaque: true },
      { texto: 'Histórico de pedidos avançado',       starter: false, pro: true,  business: true },
    ],
  },
  {
    categoria: 'Marketing & Personalização',
    itens: [
      { texto: 'Logo e cores do restaurante',         starter: true,  pro: true,  business: true },
      { texto: 'Banner de promoções no cardápio',     starter: false, pro: true,  business: true },
      { texto: 'Multi-cardápio (almoço / jantar)',    starter: false, pro: false, business: true },
    ],
  },
  {
    categoria: 'Suporte',
    itens: [
      { texto: 'Suporte via WhatsApp',                starter: true,  pro: true,  business: true },
      { texto: 'Suporte prioritário',                 starter: false, pro: false, business: true },
      { texto: 'Treinamento da equipe (onboarding)',  starter: true,  pro: true,  business: true },
    ],
  },
]

// ── Features Balcão ──────────────────────────────────────────────────────────
const FEATURES_BALCAO_ESSENCIAL = [
  'Totem de pedidos touch (tablet / PC)',
  'Geração automática de senha de retirada',
  'Painel TV do balcão em tempo real',
  'Pedidos vão direto para a cozinha',
  'Pagamento via PIX integrado',
  'Bip sonoro quando senha fica pronta',
  'Cardápio digital com fotos e categorias',
  'Reinício automático após cada pedido',
  'Relatório de vendas do dia',
  'Suporte via WhatsApp',
]

const FEATURES_BALCAO_MAQUININHA = [
  'Tudo do plano Essencial',
  'Integração com maquininha parceira',
  'Pagamento em cartão débito e crédito',
  'Relatório financeiro completo',
  'Conciliação automática de pagamentos',
  'Suporte prioritário',
]

const IMPL_INCLUSOS = [
  { ok: true,  texto: 'Configuração completa da plataforma' },
  { ok: true,  texto: 'Cadastro dos produtos (sem fotos)' },
  { ok: true,  texto: 'Arquivo de QR codes de todas as mesas (pronto para impressão)' },
  { ok: true,  texto: 'Treinamento da equipe no sistema' },
  { ok: true,  texto: 'Suporte dedicado no 1º mês' },
  { ok: false, texto: 'Cadastro com fotos dos produtos — orçado à parte' },
]

function CelulaFeature({ valor }: { valor: boolean | string }) {
  if (valor === true)  return <CheckCircle2 className="w-4 h-4 mx-auto" style={{ color: COR }} />
  if (valor === false) return <X className="w-4 h-4 mx-auto text-slate-200" />
  return <span className="text-xs font-semibold text-slate-600">{valor}</span>
}

type TipoNegocio = 'mesa' | 'balcao'

export default function PlanosPage() {
  const router = useRouter()
  const [tipoNegocio, setTipoNegocio] = useState<TipoNegocio>('mesa')
  const [planoSelecionado, setPlanoSelecionado] = useState<TierMesa>('pro')
  const [aceitando, setAceitando] = useState(false)
  const [aceito,    setAceito]    = useState(false)

  const plano = PLANOS_MESA.find((p) => p.id === planoSelecionado)!

  async function iniciarTrial() {
    setAceitando(true)
    const resp = await fetch('/api/tenant/plano', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ plano: planoSelecionado }),
    })
    const data = await resp.json()
    if (!resp.ok) { alert(data.error || 'Erro ao ativar conta.'); setAceitando(false); return }
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
      <div className="w-full max-w-3xl">

        {/* ── Seletor de tipo de negócio ── */}
        <div className="mb-6">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
            Que tipo de negócio você tem?
          </p>
          <div className="grid grid-cols-2 gap-3">
            {/* Mesa */}
            <button
              onClick={() => setTipoNegocio('mesa')}
              className="relative rounded-2xl p-5 text-left transition-all border-2"
              style={{
                background: '#fff',
                borderColor: tipoNegocio === 'mesa' ? COR : '#e2e8f0',
                boxShadow:   tipoNegocio === 'mesa' ? `0 0 0 4px ${COR}18` : undefined,
              }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: tipoNegocio === 'mesa' ? `${COR}15` : '#f1f5f9' }}>
                  <UtensilsCrossed className="w-5 h-5" style={{ color: tipoNegocio === 'mesa' ? COR : '#94a3b8' }} />
                </div>
                <div>
                  <p className="font-black text-slate-800">Restaurante com mesas</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Cardápio via QR, pedidos por mesa, garçom e cozinha
                  </p>
                </div>
              </div>
              {tipoNegocio === 'mesa' && (
                <div className="absolute top-3 right-3">
                  <CheckCircle2 className="w-4 h-4" style={{ color: COR }} />
                </div>
              )}
            </button>

            {/* Balcão */}
            <button
              onClick={() => setTipoNegocio('balcao')}
              className="relative rounded-2xl p-5 text-left transition-all border-2"
              style={{
                background: '#fff',
                borderColor: tipoNegocio === 'balcao' ? '#f59e0b' : '#e2e8f0',
                boxShadow:   tipoNegocio === 'balcao' ? '0 0 0 4px #f59e0b18' : undefined,
              }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: tipoNegocio === 'balcao' ? '#fef3c7' : '#f1f5f9' }}>
                  <ShoppingBag className="w-5 h-5" style={{ color: tipoNegocio === 'balcao' ? '#f59e0b' : '#94a3b8' }} />
                </div>
                <div>
                  <p className="font-black text-slate-800">Balcão / Totem</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Lanchonete, açaí, food truck — pedido e senha de retirada
                  </p>
                </div>
              </div>
              {tipoNegocio === 'balcao' && (
                <div className="absolute top-3 right-3">
                  <CheckCircle2 className="w-4 h-4 text-amber-500" />
                </div>
              )}
              <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full text-white text-[10px] font-bold bg-amber-500">
                Novo
              </div>
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════
            FLUXO: RESTAURANTE COM MESAS
        ════════════════════════════════════════ */}
        {tipoNegocio === 'mesa' && (
          <>
            {/* Header */}
            <div
              className="rounded-2xl px-8 pt-10 pb-8 text-white mb-6 shadow-xl"
              style={{ background: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 50%, #1A9B8A 100%)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <ChefHat className="w-5 h-5 text-teal-400" />
                <p className="text-xs font-bold tracking-widest uppercase text-teal-400">Menuê+ · Mesas</p>
              </div>
              <h1 className="text-3xl font-black leading-tight">
                7 dias grátis.<br />Sem cobrança. Sem cartão.
              </h1>
              <p className="text-white/60 text-sm mt-3 leading-relaxed">
                Explore tudo sem compromisso. Depois do trial, você escolhe se quer continuar com a implementação e o plano mensal.
              </p>
              <div className="flex flex-wrap gap-2 mt-5">
                {[
                  { icon: Sparkles,   text: 'Acesso completo por 7 dias' },
                  { icon: CreditCard, text: 'Sem cartão de crédito' },
                  { icon: Clock,      text: 'Cancele quando quiser' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}>
                    <Icon className="w-3.5 h-3.5 text-teal-300" />
                    {text}
                  </div>
                ))}
              </div>
            </div>

            {/* Cards de plano */}
            <div className="grid sm:grid-cols-3 gap-4 mb-5">
              {PLANOS_MESA.map((p) => {
                const ativo = planoSelecionado === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => setPlanoSelecionado(p.id as TierMesa)}
                    className="relative rounded-2xl p-5 text-left transition-all hover:shadow-md"
                    style={{
                      background: '#fff',
                      border:     ativo ? `2px solid ${p.cor}` : '2px solid #e2e8f0',
                      boxShadow:  ativo ? `0 0 0 4px ${p.cor}18` : undefined,
                    }}
                  >
                    {p.destaque && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-white text-xs font-bold whitespace-nowrap"
                        style={{ background: p.cor }}>
                        mais popular
                      </div>
                    )}
                    <p className="font-black text-slate-800 text-base">{p.nome}</p>
                    <p className="text-xs text-slate-500 mb-3">{p.mesas} · usuários ilimitados</p>
                    <div className="mb-3">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black" style={{ color: ativo ? p.cor : '#0f172a' }}>
                          R$ {p.preco}
                        </span>
                        <span className="text-slate-400 text-xs">/mês</span>
                      </div>
                      <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                        7 dias grátis
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{p.desc}</p>
                    {ativo && (
                      <div className="mt-4 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold text-white"
                        style={{ background: p.cor }}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Selecionado
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Tabela de funcionalidades */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-5 overflow-hidden">
              <div className="px-6 pt-5 pb-3">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">O que está incluso em cada plano</p>
              </div>
              <div className="grid grid-cols-4 px-6 pb-3 border-b border-slate-100">
                <div />
                {PLANOS_MESA.map((p) => (
                  <div key={p.id} className="text-center">
                    <p className="text-xs font-black text-slate-700">{p.nome}</p>
                    <p className="text-xs text-slate-400">{p.mesas}</p>
                  </div>
                ))}
              </div>
              {FEATURES_MESA.map((cat) => (
                <div key={cat.categoria}>
                  <div className="px-6 py-2 bg-slate-50 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{cat.categoria}</p>
                  </div>
                  {cat.itens.map((item) => (
                    <div
                      key={item.texto}
                      className={`grid grid-cols-4 items-center px-6 py-2.5 border-b border-slate-50 ${item.destaque ? 'bg-teal-50/60' : ''}`}
                    >
                      <div className="flex items-center gap-2 pr-4">
                        {item.destaque && (
                          <span className="shrink-0 text-xs font-bold text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded">destaque</span>
                        )}
                        <span className={`text-sm ${item.destaque ? 'font-bold text-slate-800' : 'text-slate-600'}`}>{item.texto}</span>
                      </div>
                      <div className="text-center"><CelulaFeature valor={item.starter} /></div>
                      <div className="text-center"><CelulaFeature valor={item.pro} /></div>
                      <div className="text-center"><CelulaFeature valor={item.business} /></div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Enterprise */}
            <div className="rounded-2xl px-6 py-4 flex items-center justify-between mb-5"
              style={{ background: '#fff', border: '2px dashed #e2e8f0' }}>
              <div>
                <p className="font-bold text-slate-700 text-sm">Mais de 60 mesas ou precisa de desenvolvimento sob medida?</p>
                <p className="text-slate-400 text-xs mt-0.5">Redes, franquias e grandes operações — montamos um plano personalizado.</p>
              </div>
              <a href="https://wa.me/5547988194822?text=Ol%C3%A1%2C%20preciso%20de%20um%20plano%20enterprise%20personalizado"
                target="_blank" rel="noopener noreferrer"
                className="shrink-0 ml-4 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: '#0f3d35' }}>
                <MessageCircle className="w-4 h-4" /> Falar no WhatsApp
              </a>
            </div>

            {/* Confirmação */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-100">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Plano selecionado</p>
                    <p className="text-xl font-black text-slate-800">{plano.nome} — {plano.mesas}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Usuários ilimitados</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-baseline gap-1 justify-end">
                      <span className="text-3xl font-black" style={{ color: plano.cor }}>R$ {plano.preco}</span>
                      <span className="text-slate-400">/mês</span>
                    </div>
                    <p className="text-xs text-teal-600 font-semibold mt-0.5">após os 7 dias de trial</p>
                  </div>
                </div>
              </div>

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
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-black text-white mt-0.5"
                        style={{ background: cor }}>{n}</div>
                      <p className="text-sm text-slate-600 leading-relaxed">{texto}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-8 py-5 border-b border-slate-100">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                  Implementação · R$ 2.000 — cobrada apenas se continuar
                </p>
                <div className="space-y-2">
                  {IMPL_INCLUSOS.map(({ ok, texto }) => (
                    <div key={texto} className="flex items-center gap-3">
                      {ok ? <span className="text-teal-500 text-sm shrink-0">✓</span>
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

              <div className="px-8 pt-4 pb-2">
                <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 leading-relaxed">
                  Ao clicar em <strong className="text-slate-700">"Começar trial gratuito"</strong> você confirma que está ciente dos valores acima e concorda com os termos de uso do Menuê+. O trial dura 7 dias sem nenhuma cobrança.
                </div>
              </div>

              <div className="px-8 pb-8 pt-4">
                <Button
                  onClick={iniciarTrial}
                  disabled={aceitando || aceito}
                  className="w-full text-base font-bold text-white hover:opacity-90"
                  style={{ background: aceito ? '#16a34a' : plano.cor, height: '52px' }}
                >
                  {aceito ? (
                    <><CheckCircle2 className="w-5 h-5 mr-2" /> Trial ativado! Abrindo seu painel...</>
                  ) : aceitando ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Ativando trial...</>
                  ) : (
                    <><Sparkles className="w-5 h-5 mr-2" /> Começar trial gratuito — Plano {plano.nome}</>
                  )}
                </Button>
                <p className="text-center text-xs text-slate-400 mt-3">
                  🔒 Sem cartão de crédito · 7 dias grátis · Cancele quando quiser
                </p>
              </div>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════
            FLUXO: BALCÃO / TOTEM
        ════════════════════════════════════════ */}
        {tipoNegocio === 'balcao' && (
          <>
            {/* Header Balcão */}
            <div
              className="rounded-2xl px-8 pt-10 pb-8 text-white mb-6 shadow-xl"
              style={{ background: 'linear-gradient(135deg, #451a03 0%, #92400e 50%, #f59e0b 100%)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <ShoppingBag className="w-5 h-5 text-amber-300" />
                <p className="text-xs font-bold tracking-widest uppercase text-amber-300">Menuê+ · Balcão</p>
              </div>
              <h1 className="text-3xl font-black leading-tight">
                Pedido no totem.<br />Senha na TV. Pronto.
              </h1>
              <p className="text-white/60 text-sm mt-3 leading-relaxed">
                Ideal para lanchonetes, açaís, food trucks e cafeterias. Cliente pede, paga e aguarda a senha ser chamada.
              </p>
              <div className="flex flex-wrap gap-2 mt-5">
                {[
                  { icon: Hash,  text: 'Senha de retirada automática' },
                  { icon: Tv2,   text: 'Painel TV em tempo real' },
                  { icon: Zap,   text: 'Vai direto para a cozinha' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                    <Icon className="w-3.5 h-3.5 text-amber-300" />
                    {text}
                  </div>
                ))}
              </div>
            </div>

            {/* Cards Balcão */}
            <div className="grid sm:grid-cols-2 gap-4 mb-6">

              {/* Essencial */}
              <div className="relative rounded-2xl p-6 bg-white border-2 flex flex-col"
                style={{ borderColor: '#f59e0b', boxShadow: '0 0 0 4px #f59e0b18' }}>
                <div className="absolute -top-3 left-6 px-3 py-1 rounded-full text-white text-xs font-bold bg-amber-500">
                  mais popular
                </div>
                <div className="mb-4">
                  <p className="font-black text-slate-800 text-lg">Balcão Essencial</p>
                  <p className="text-xs text-slate-500">PIX · Sem maquininha</p>
                </div>
                <div className="mb-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-amber-500">R$ 299</span>
                    <span className="text-slate-400 text-sm">/mês</span>
                  </div>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    7 dias grátis
                  </span>
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {FEATURES_BALCAO_ESSENCIAL.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className="w-full py-3.5 rounded-xl text-white font-black text-sm transition-all hover:opacity-90"
                  style={{ background: '#f59e0b' }}
                  onClick={() => alert('Em breve! Entre em contato via WhatsApp para acesso antecipado.')}
                >
                  <Sparkles className="w-4 h-4 inline mr-1.5" />
                  Quero testar grátis
                </button>
              </div>

              {/* Com Maquininha */}
              <div className="relative rounded-2xl p-6 bg-white border-2 border-slate-200 flex flex-col">
                <div className="mb-4">
                  <p className="font-black text-slate-800 text-lg">Balcão + Maquininha</p>
                  <p className="text-xs text-slate-500">Cartão débito e crédito integrado</p>
                </div>
                <div className="mb-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-700">R$ 550</span>
                    <span className="text-slate-400 text-sm">/mês</span>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    + taxa da maquininha
                  </span>
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {FEATURES_BALCAO_MAQUININHA.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: COR }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="https://wa.me/5547988194822?text=Ol%C3%A1%2C%20tenho%20interesse%20no%20Plano%20Balc%C3%A3o%20com%20Maquininha"
                  target="_blank" rel="noopener noreferrer"
                  className="w-full py-3.5 rounded-xl font-black text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2"
                  style={{ background: '#0f3d35', color: '#fff' }}
                >
                  <MessageCircle className="w-4 h-4" />
                  Falar com consultor
                </a>
              </div>
            </div>

            {/* Comparativo rápido */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                Para qual negócio é ideal?
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { emoji: '🧃', nome: 'Açaí / Sorvetes' },
                  { emoji: '🥪', nome: 'Lanchonete' },
                  { emoji: '🚚', nome: 'Food Truck' },
                  { emoji: '☕', nome: 'Cafeteria' },
                  { emoji: '🍕', nome: 'Pizzaria (retirada)' },
                  { emoji: '🥐', nome: 'Padaria / Confeitaria' },
                ].map(({ emoji, nome }) => (
                  <div key={nome} className="flex items-center gap-2 text-sm text-slate-600">
                    <span>{emoji}</span>
                    <span>{nome}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Aviso em breve */}
            <div className="rounded-2xl px-6 py-4 border-2 border-dashed border-amber-200 bg-amber-50">
              <p className="text-sm font-bold text-amber-800">🚀 Lançamento em breve</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                O Plano Balcão está em fase final de desenvolvimento. Entre na lista de espera e seja um dos primeiros a ter acesso com condição especial de lançamento.
              </p>
              <a
                href="https://wa.me/5547988194822?text=Quero%20entrar%20na%20lista%20de%20espera%20do%20Plano%20Balc%C3%A3o"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: '#f59e0b' }}
              >
                <MessageCircle className="w-4 h-4" /> Entrar na lista de espera
              </a>
            </div>
          </>
        )}

        <p className="text-center text-xs text-slate-400 mt-6">
          Dúvidas antes de começar?{' '}
          <a href="https://wa.me/5547988194822" target="_blank" rel="noopener noreferrer"
            className="text-teal-600 underline underline-offset-2">
            Fale com a gente no WhatsApp
          </a>
        </p>

      </div>
    </div>
  )
}
