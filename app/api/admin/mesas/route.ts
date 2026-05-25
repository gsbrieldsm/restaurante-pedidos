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
