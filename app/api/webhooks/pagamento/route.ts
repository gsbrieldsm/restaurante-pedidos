/**
 * POST /api/webhooks/pagamento
 *
 * Recebe notificações do Mercado Pago e ativa o plano do tenant.
 *
 * ── Configuração no MP ──────────────────────────────────────────────────────
 * developers.mercadopago.com → sua app → Webhooks → Adicionar URL:
 *   https://www.menue.com.br/api/webhooks/pagamento
 * Eventos: preapproval, payment
 */

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createHmac }   from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'

// ─── Valida assinatura HMAC-SHA256 do Mercado Pago ───────────────────────────
// Header x-signature: "ts=...,v1=..."
// Payload assinado:   "id:{data.id};request-id:{x-request-id};ts:{ts};"
function validarAssinaturaMp(req: Request, body: string, dataId?: string): boolean {
  const secret    = process.env.MP_WEBHOOK_SECRET
  if (!secret) return true // sem secret configurado → aceita (não recomendado em prod)

  const xSig     = req.headers.get('x-signature') ?? ''
  const xReqId   = req.headers.get('x-request-id') ?? ''

  const tsMatch  = xSig.match(/ts=([^,]+)/)
  const v1Match  = xSig.match(/v1=([^,]+)/)
  if (!tsMatch || !v1Match) return false

  const ts       = tsMatch[1]
  const v1       = v1Match[1]

  const template = `id:${dataId ?? ''};request-id:${xReqId};ts:${ts};`
  const expected = createHmac('sha256', secret).update(template).digest('hex')

  return expected === v1
}

// ─── Ativa plano no banco ────────────────────────────────────────────────────
async function ativarPlanoTenant(tenantId: string, plano?: string) {
  const supabase = createServiceClient()

  const update: Record<string, unknown> = {
    status:          'ativo',
    trial_expira_em: null,
    plano_aceito_em: new Date().toISOString(),
  }
  if (plano) update.plano = plano

  const { error } = await supabase
    .from('tenants')
    .update(update)
    .eq('id', tenantId)

  if (error) {
    console.error('[webhook] erro ao ativar plano:', error.message)
    return false
  }
  console.log(`[webhook] plano "${plano}" ativado para tenant ${tenantId}`)
  return true
}

// ─── Extrai tenant_id e plano do external_reference ─────────────────────────
function parsarRef(ref: string | null | undefined): { tenantId: string; plano: string } | null {
  if (!ref) return null
  const [tenantId, plano] = ref.split('|')
  if (!tenantId) return null
  return { tenantId, plano: plano ?? 'starter' }
}

export async function POST(req: Request) {
  const body = await req.text()

  // ── Mercado Pago ────────────────────────────────────────────────────────────
  if (process.env.MP_ACCESS_TOKEN) {
    try {
      const payload = JSON.parse(body)
      const token   = process.env.MP_ACCESS_TOKEN

      // ── Valida assinatura ────────────────────────────────────────────────────
      if (!validarAssinaturaMp(req, body, payload.data?.id)) {
        console.warn('[webhook/mp] assinatura inválida')
        return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
      }

      // ── Evento de assinatura (preapproval) ──────────────────────────────────
      if (payload.type === 'preapproval' && payload.data?.id) {
        const res          = await fetch(`https://api.mercadopago.com/preapproval/${payload.data.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const preapproval  = await res.json()

        if (preapproval.status === 'authorized') {
          const parsed = parsarRef(preapproval.external_reference)
          if (parsed) await ativarPlanoTenant(parsed.tenantId, parsed.plano)
        }

        return NextResponse.json({ received: true })
      }

      // ── Evento de pagamento individual (cobrança mensal da assinatura) ───────
      if (payload.type === 'payment' && payload.data?.id) {
        const res     = await fetch(`https://api.mercadopago.com/v1/payments/${payload.data.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const payment = await res.json()

        if (payment.status === 'approved') {
          const parsed = parsarRef(payment.external_reference)
          if (parsed) await ativarPlanoTenant(parsed.tenantId, parsed.plano)
        }

        return NextResponse.json({ received: true })
      }

      // Outros eventos (ignorar silenciosamente)
      return NextResponse.json({ received: true, ignored: true })

    } catch (err) {
      console.error('[webhook/mp] erro:', err)
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }
  }

  // Nenhum gateway configurado
  console.warn('[webhook] MP_ACCESS_TOKEN não definido, evento ignorado.')
  return NextResponse.json({ received: true, configurado: false })
}
