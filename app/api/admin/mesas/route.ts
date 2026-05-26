export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { getPlanoConfig } from '@/lib/planos'

export async function GET() {
  const supabase  = createServiceClient()
  const tenantId  = await getTenantId()

  // Busca mesas e plano do tenant em paralelo
  const [mesasRes, tenantRes] = await Promise.all([
    (() => {
      let q = supabase.from('view_mesas_status').select('*').order('numero')
      if (tenantId) q = (q as any).eq('tenant_id', tenantId)
      return q
    })(),
    tenantId
      ? supabase.from('tenants').select('plano').eq('id', tenantId).single()
      : Promise.resolve({ data: null, error: null }),
  ])

  if (mesasRes.error) return NextResponse.json({ error: mesasRes.error.message }, { status: 500 })

  const plano       = (tenantRes as { data: { plano: string } | null }).data?.plano ?? 'starter'
  const config      = getPlanoConfig(plano)
  const limiteMesas = config.mesas > 0 ? config.mesas : 999

  return NextResponse.json({ mesas: mesasRes.data, plano, limite_mesas: limiteMesas })
}

// PATCH — atualiza nome personalizado (Business+)
export async function PATCH(req: Request) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const supabase = createServiceClient()

  // Verifica se o plano permite nome_mesa
  const { data: tenant } = await supabase
    .from('tenants')
    .select('plano')
    .eq('id', tenantId)
    .single()

  const config = getPlanoConfig(tenant?.plano)
  if (!config.nome_mesa) {
    return NextResponse.json({ error: 'Recurso disponível apenas no plano Business ou superior.' }, { status: 403 })
  }

  const { mesa_id, nome } = await req.json()
  if (!mesa_id) return NextResponse.json({ error: 'mesa_id obrigatório.' }, { status: 422 })

  const { data, error } = await supabase
    .from('mesas')
    .update({ nome: nome?.trim() || null })
    .eq('id', mesa_id)
    .eq('tenant_id', tenantId)
    .select('id, numero, nome')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, mesa: data })
}
