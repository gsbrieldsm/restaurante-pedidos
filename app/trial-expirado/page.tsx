'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChefHat, Clock, MessageCircle, CheckCircle2, Copy, Check, CreditCard, Loader2 } from 'lucide-react'

const PLANOS_PRECO: Record<string, number> = {
  starter:    397,
  pro:        597,
  business:   799,
  enterprise: 0,
}

const PLANOS_NOME: Record<string, string> = {
  starter:    'Starter',
  pro:        'Pro',
  business:   'Business',
  enterprise: 'Enterprise',
}

const PIX_CHAVE  = '54.691.723/0001-03'   // CNPJ PIX
const PIX_NOME   = 'Menuê+ Sistemas de Gestão'
const WPP_NUMERO = '5547988194822'

export default function TrialExpiradoPage() {
  const [plano, setPlano]                 = useState('')
  const [nomeRestaurante, setNomeRestaurante] = useState('')
  const [copiado, setCopiado]             = useState(false)
  const [carregando, setCarregando]       = useState(true)
  const [checkoutDisponivel, setCheckoutDisponivel] = useState(false)
  const [iniciandoCheckout, setIniciandoCheckout]   = useState(false)

  useEffect(() => {
    fetch('/api/admin/perfil')
      .then((r) => r.json())
      .then((d) => {
        if (d.plano)            setPlano(d.plano)
        if (d.nome_restaurante) setNomeRestaurante(d.nome_restaurante)
      })
      .catch(() => {})
      .finally(() => setCarregando(false))

    // Verifica se o gateway de pagamento está configurado (GET, sem auth)
    fetch('/api/tenant/checkout')
      .then((r) => r.json())
      .then((d) => { if (d.configurado) setCheckoutDisponivel(true) })
      .catch(() => {})
  }, [])

  const nomePlano = PLANOS_NOME[plano] ?? (plano ? plano.charAt(0).toUpperCase() + plano.slice(1) : null)
  const preco     = PLANOS_PRECO[plano] ?? null

  const textoWpp = [
    'Olá! Meu trial do Menuê+ expirou.',
    nomeRestaurante ? `Restaurante: ${nomeRestaurante}.` : '',
    nomePlano ? `Plano escolhido: ${nomePlano}${preco ? ` — R$ ${preco}/mês` : ''}.` : '',
    'Quero continuar usando o sistema!',
  ].filter(Boolean).join(' ')

  const wppUrl = `https://wa.me/${WPP_NUMERO}?text=${encodeURIComponent(textoWpp)}`

  async function iniciarCheckout() {
    setIniciandoCheckout(true)
    try {
      const res  = await fetch('/api/tenant/checkout', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      // silencia — botão só aparece se configurado
    } finally {
      setIniciandoCheckout(false)
    }
  }

  function copiarPix() {
    navigator.clipboard.writeText(PIX_CHAVE).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    })
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: '#F0FAFA' }}
    >
      <div className="w-full max-w-md">

        {/* ── Header ── */}
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
            Esperamos que tenha gostado! Para continuar, fale com nossa equipe e ativamos seu plano ainda hoje.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

          {/* ── Plano escolhido ── */}
          {!carregando && nomePlano && preco && (
            <div className="px-8 py-5 border-b border-slate-100 bg-teal-50/60">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                Seu plano escolhido
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-black text-slate-800">Plano {nomePlano}</p>
                  {nomeRestaurante && (
                    <p className="text-xs text-slate-500 mt-0.5">{nomeRestaurante}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-teal-600">R$ {preco}</p>
                  <p className="text-xs text-slate-400">/mês</p>
                </div>
              </div>
            </div>
          )}

          {/* ── O que você testou ── */}
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
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" />
                  <span className="text-sm text-slate-600">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── PIX ── */}
          <div className="px-8 py-6 border-b border-slate-100">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
              Pagamento via PIX
            </p>
            <p className="text-sm text-slate-600 mb-3">
              Após o pagamento, nosso time ativa seu acesso em minutos.
            </p>
            <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Chave PIX (CNPJ)</p>
                <p className="font-mono font-bold text-slate-800 text-base">{PIX_CHAVE}</p>
                <p className="text-xs text-slate-400 mt-0.5">{PIX_NOME}</p>
              </div>
              <button
                onClick={copiarPix}
                className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 transition-colors"
              >
                {copiado
                  ? <><Check className="w-3.5 h-3.5 text-teal-500" /> Copiado!</>
                  : <><Copy className="w-3.5 h-3.5" /> Copiar</>
                }
              </button>
            </div>
            {preco && (
              <p className="text-xs text-slate-400 mt-2 text-center">
                Valor: <span className="font-bold text-slate-600">R$ {preco},00</span> — mensalidade do Plano {nomePlano}
              </p>
            )}
          </div>

          {/* ── CTA ── */}
          <div className="px-8 py-6 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
              Ativar agora
            </p>

            {/* Botão cartão — só aparece quando gateway configurado */}
            {checkoutDisponivel && (
              <button
                onClick={iniciarCheckout}
                disabled={iniciandoCheckout}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-base font-black text-white transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: '#0f3d35' }}
              >
                {iniciandoCheckout
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <CreditCard className="w-5 h-5" />
                }
                {iniciandoCheckout ? 'Aguarde...' : 'Pagar com cartão de crédito'}
              </button>
            )}

            {/* Placeholder "em breve" — só aparece quando gateway NÃO configurado */}
            {!checkoutDisponivel && (
              <div className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-semibold text-slate-400 border-2 border-dashed border-slate-200 cursor-default">
                <CreditCard className="w-4 h-4" />
                Cartão de crédito — em breve
              </div>
            )}

            {/* WhatsApp — sempre disponível */}
            <a
              href={wppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-base font-black text-white transition-all hover:opacity-90"
              style={{ background: '#1A9B8A' }}
            >
              <MessageCircle className="w-5 h-5" />
              {checkoutDisponivel ? 'Pagar via PIX + WhatsApp' : 'Enviar comprovante no WhatsApp'}
            </a>

            {!checkoutDisponivel && (
              <p className="text-center text-xs text-slate-400 pt-1">
                Faça o PIX e mande o comprovante — ativamos em minutos.
              </p>
            )}
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
