/**
 * POST /api/webhooks/pagamento
 *
 * Recebe eventos do gateway de pagamento e ativa o plano do tenant.
 *
 * ── Configuração no gateway ─────────────────────────────────────────────────
 * Aponte o webhook para:  https://menue.com.br/api/webhooks/pagamento
 *
 * ── Stripe ──────────────────────────────────────────────────────────────────
 * Eventos relevantes:
 *   checkout.session.completed  → pagamento único confirmado
 *   invoice.paid                → recorrência mensal confirmada
 *
 * ── Asaas ───────────────────────────────────────────────────────────────────
 * Eventos relevantes:
 *   PAYMENT_CONFIRMED           → pagamento confirmado
 *   PAYMENT_RECEIVED            → pagamento recebido (PIX/boleto)
 */

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

async function ativarPlanoTenant(tenantId: string) {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('tenants')
    .update({ status: 'ativo', trial_expira_em: null })
    .eq('id', tenantId)

  if (error) {
    console.error('[webhook] erro ao ativar plano:', error.message)
    return false
  }
  console.log(`[webhook] plano ativado para tenant ${tenantId}`)
  return true
}

export async function POST(req: Request) {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature') ?? req.headers.get('asaas-access-token') ?? ''

  // ── Stripe ─────────────────────────────────────────────────────────────────
  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) {
    try {
      // Descomente quando instalar: npm install stripe
      // const Stripe = (await import('stripe')).default
      // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
      // const event  = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
      //
      // if (event.type === 'checkout.session.completed' || event.type === 'invoice.paid') {
      //   const obj       = event.data.object as { metadata?: Record<string, string>; subscription?: string }
      //   const tenantId  = obj.metadata?.tenant_id
      //   if (tenantId) await ativarPlanoTenant(tenantId)
      // }
      //
      // return NextResponse.json({ received: true })
    } catch (err) {
      console.error('[webhook/stripe] erro:', err)
      return NextResponse.json({ error: 'Webhook inválido' }, { status: 400 })
    }
  }

  // ── Asaas ──────────────────────────────────────────────────────────────────
  if (process.env.ASAAS_API_KEY) {
    // Validação simples por token (Asaas não usa assinatura criptografada)
    if (signature !== process.env.ASAAS_API_KEY) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    try {
      // const payload   = JSON.parse(body)
      // const evento    = payload.event
      // const pagamento = payload.payment
      //
      // if (['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(evento)) {
      //   const ref = JSON.parse(pagamento.externalReference ?? '{}')
      //   if (ref.tenant_id) await ativarPlanoTenant(ref.tenant_id)
      // }
      //
      // return NextResponse.json({ received: true })
    } catch (err) {
      console.error('[webhook/asaas] erro:', err)
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }
  }

  // Nenhum gateway configurado — confirma recebimento sem processar
  console.warn('[webhook] nenhum gateway configurado, evento ignorado.')
  return NextResponse.json({ received: true, configurado: false })
}
