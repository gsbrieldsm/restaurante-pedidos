/**
 * POST /api/tenant/checkout
 *
 * Cria uma assinatura recorrente no Mercado Pago (Preapproval).
 * Retorna { url, configurado: true } com o link de pagamento MP.
 *
 * Variáveis de ambiente necessárias (Vercel + .env.local):
 *   MP_ACCESS_TOKEN=APP_USR-...
 */

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'

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

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const authCookie  = cookieStore.get('admin_auth')?.value

  if (!authCookie?.startsWith('mmu:')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const tenantId = cookieStore.get('tenant_id')?.value
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, plano, nome_restaurante, email, nome')
    .eq('id', tenantId)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 })

  const plano   = tenant.plano ?? 'starter'
  const preco   = PLANOS_PRECO[plano] ?? 397
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://menue.com.br'

  // ── Mercado Pago Subscriptions (Preapproval) ───────────────────────────────
  if (process.env.MP_ACCESS_TOKEN) {
    try {
      const res = await fetch('https://api.mercadopago.com/preapproval', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          reason:       `Menuê+ — Plano ${PLANOS_NOME[plano] ?? plano}`,
          payer_email:  tenant.email,
          back_url:     `${APP_URL}/admin?plano_ativado=1`,
          auto_recurring: {
            frequency:          1,
            frequency_type:     'months',
            transaction_amount: preco,
            currency_id:        'BRL',
          },
          // Guarda tenant_id e plano para o webhook ativar automaticamente
          external_reference: `${tenantId}|${plano}`,
        }),
      })

      const data = await res.json()

      if (data.init_point) {
        return NextResponse.json({ url: data.init_point, configurado: true })
      }

      console.error('[checkout/mp] resposta inesperada:', JSON.stringify(data))
      return NextResponse.json(
        { error: 'Não foi possível gerar o link de pagamento. Tente novamente.' },
        { status: 502 }
      )
    } catch (err) {
      console.error('[checkout/mp] erro de rede:', err)
      return NextResponse.json({ error: 'Erro ao conectar com o Mercado Pago.' }, { status: 502 })
    }
  }

  // ── Não configurado — modo manual (PIX + WhatsApp) ─────────────────────────
  return NextResponse.json({
    configurado: false,
    plano,
    preco,
    nome_plano: PLANOS_NOME[plano] ?? plano,
  })
}
