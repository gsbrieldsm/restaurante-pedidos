export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { getPlanoConfig } from '@/lib/planos'

/** POST — cria nova zona de entrega */
export async function POST(req: Request) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const supabase = createServiceClient()

  const { data: tenant } = await supabase.from('tenants').select('plano').eq('id', tenantId).single()
  const config = getPlanoConfig(tenant?.plano)
  if (!config.delivery) {
    return NextResponse.json({ error: 'Delivery disponível apenas no plano Business ou superior.' }, { status: 403 })
  }

  const { nome, km_min, km_max, taxa, ordem } = await req.json()
  if (!nome || km_max === undefined || taxa === undefined) {
    return NextResponse.json({ error: 'nome, km_max e taxa são obrigatórios.' }, { status: 422 })
  }

  const { data, error } = await supabase
    .from('delivery_zonas')
    .insert({ tenant_id: tenantId, nome, km_min: km_min ?? 0, km_max, taxa, ordem: ordem ?? 0 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, zona: data }, { status: 201 })
}

/** DELETE — remove zona */
export async function DELETE(req: Request) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obrigatório.' }, { status: 422 })

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('delivery_zonas')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
