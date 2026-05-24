/**
 * POST /api/tenant/checkout
 *
 * Cria uma sessão de pagamento no gateway configurado.
 *
 * ── Para ativar o Stripe ────────────────────────────────────────────────────
 * 1. npm install stripe
 * 2. Adicionar no Vercel (ou .env.local):
 *      STRIPE_SECRET_KEY=sk_live_...
 *      STRIPE_WEBHOOK_SECRET=whsec_...
 *      STRIPE_PRICE_STARTER=price_...    (id do preço no Stripe)
 *      STRIPE_PRICE_PRO=price_...
 *      STRIPE_PRICE_BUSINESS=price_...
 *      STRIPE_PRICE_ENTERPRISE=price_...
 *
 * ── Para ativar o Asaas ─────────────────────────────────────────────────────
 * 1. npm install @asaas/sdk  (ou usar fetch direto)
 * 2. Adicionar no Vercel:
 *      ASAAS_API_KEY=$aact_...
 *      ASAAS_ENV=production   (ou sandbox)
 *
 * Enquanto nenhuma variável estiver configurada, retorna { configurado: false }
 * e o frontend exibe o botão "em breve".
 */

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'

const PLANOS_PRECO: Record<string, number> = {
  starter:    397,
  pro:        597,
  business:   799,
  enterprise: 0,   // negociado individualmente
}

const PLANOS_NOME: Record<string, string> = {
  starter:    'Starter',
  pro:        'Pro',
  business:   'Business',
  enterprise: 'Enterprise',
}

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const authCookie  = cookieStore.get('admin_auth')?.value

  if (!authCookie?.startsWith('mmu:')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const tenantId = cookieStore.get('tenant_id')?.value
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // Busca dados do tenant
  const supabase = createServiceClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, plano, nome_restaurante, email, nome')
    .eq('id', tenantId)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 })

  const plano = tenant.plano ?? 'starter'
  const preco = PLANOS_PRECO[plano] ?? 350
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://menue.com.br'

  // ── Stripe ─────────────────────────────────────────────────────────────────
  if (process.env.STRIPE_SECRET_KEY) {
    // Descomente quando instalar: npm install stripe
    // const Stripe = (await import('stripe')).default
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    //
    // const priceId = process.env[`STRIPE_PRICE_${plano.toUpperCase()}`]
    // if (!priceId) return NextResponse.json({ error: 'Plano sem preço configurado no Stripe.' }, { status: 400 })
    //
    // const session = await stripe.checkout.sessions.create({
    //   mode: 'subscription',
    //   payment_method_types: ['card'],
    //   line_items: [{ price: priceId, quantity: 1 }],
    //   customer_email: tenant.email,
    //   metadata: { tenant_id: tenantId, plano },
    //   success_url: `${APP_URL}/admin?plano_ativado=1`,
    //   cancel_url:  `${APP_URL}/trial-expirado`,
    // })
    //
    // return NextResponse.json({ url: session.url, configurado: true })
    console.warn('[checkout] STRIPE_SECRET_KEY definida mas integração comentada. Descomente o código acima.')
  }

  // ── Asaas ──────────────────────────────────────────────────────────────────
  if (process.env.ASAAS_API_KEY) {
    // Descomente e ajuste quando quiser usar o Asaas
    // const baseUrl = process.env.ASAAS_ENV === 'production'
    //   ? 'https://api.asaas.com/v3'
    //   : 'https://sandbox.asaas.com/api/v3'
    //
    // // 1. Cria/busca cliente
    // const clienteRes = await fetch(`${baseUrl}/customers`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', 'access_token': process.env.ASAAS_API_KEY },
    //   body: JSON.stringify({ name: tenant.nome_restaurante, email: tenant.email, externalReference: tenantId }),
    // })
    // const cliente = await clienteRes.json()
    //
    // // 2. Cria link de pagamento (assinatura)
    // const cobrancaRes = await fetch(`${baseUrl}/paymentLinks`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', 'access_token': process.env.ASAAS_API_KEY },
    //   body: JSON.stringify({
    //     name: `Menuê+ — Plano ${PLANOS_NOME[plano]}`,
    //     billingType: 'CREDIT_CARD',
    //     chargeType: 'RECURRENT',
    //     value: preco,
    //     subscriptionCycle: 'MONTHLY',
    //     description: `Assinatura Menuê+ — ${tenant.nome_restaurante}`,
    //     externalReference: JSON.stringify({ tenant_id: tenantId, plano }),
    //   }),
    // })
    // const cobranca = await cobrancaRes.json()
    // return NextResponse.json({ url: cobranca.url, configurado: true })
    console.warn('[checkout] ASAAS_API_KEY definida mas integração comentada. Descomente o código acima.')
  }

  // ── Não configurado — modo manual (PIX + WhatsApp) ─────────────────────────
  return NextResponse.json({
    configurado: false,
    plano,
    preco,
    nome_plano: PLANOS_NOME[plano] ?? plano,
  })
}
