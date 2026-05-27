export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { getPlanoConfig } from '@/lib/planos'
import { geocodificar } from '@/lib/geocodigo'

/** GET — retorna config de delivery do tenant */
export async function GET() {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const supabase = createServiceClient()

  const [configRes, zonaRes, planoRes] = await Promise.all([
    supabase.from('delivery_config').select('*').eq('tenant_id', tenantId).maybeSingle(),
    supabase.from('delivery_zonas').select('*').eq('tenant_id', tenantId).order('km_min'),
    supabase.from('tenants').select('plano').eq('id', tenantId).single(),
  ])

  const plano  = planoRes.data?.plano ?? 'starter'
  const config = getPlanoConfig(plano)

  return NextResponse.json({
    config: configRes.data ?? null,
    zonas:  zonaRes.data  ?? [],
    plano,
    habilitado: config.delivery,
  })
}

/** PUT — salva/atualiza config de delivery (upsert) */
export async function PUT(req: Request) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const supabase = createServiceClient()

  // Verifica plano
  const { data: tenant } = await supabase.from('tenants').select('plano').eq('id', tenantId).single()
  const config = getPlanoConfig(tenant?.plano)
  if (!config.delivery) {
    return NextResponse.json({ error: 'Delivery disponível apenas no plano Business ou superior.' }, { status: 403 })
  }

  const body = await req.json()
  const {
    ativo, endereco, numero, bairro, cidade, uf, cep,
    tempo_estimado, pedido_minimo, taxa_padrao, raio_maximo, observacoes,
  } = body

  // Tenta geocodificar o endereço do restaurante se tiver CEP
  let lat: number | null = null
  let lng: number | null = null
  if (cep && endereco) {
    const coords = await geocodificar(
      endereco, numero ?? '', cidade ?? '', uf ?? '', cep
    )
    if (coords) {
      lat = coords.lat
      lng = coords.lng
    }
  }

  const payload: Record<string, unknown> = {
    tenant_id: tenantId,
    ativo: ativo ?? false,
    endereco, numero, bairro, cidade, uf, cep,
    tempo_estimado: tempo_estimado ?? 45,
    pedido_minimo:  pedido_minimo  ?? 0,
    taxa_padrao:    taxa_padrao    ?? 5,
    raio_maximo:    raio_maximo    ?? 15,
    observacoes,
  }
  if (lat !== null) { payload.lat = lat; payload.lng = lng }

  const { data, error } = await supabase
    .from('delivery_config')
    .upsert(payload, { onConflict: 'tenant_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, config: data })
}
