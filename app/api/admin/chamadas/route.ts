export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'

// GET — chamadas pendentes
export async function GET() {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('chamadas_garcom')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('atendida', false)
    .order('criado_em', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ chamadas: data ?? [] })
}

// PATCH — marcar chamada como atendida
export async function PATCH(req: Request) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const supabase = createServiceClient()
  const { id } = await req.json() as { id: string }

  const { error } = await supabase
    .from('chamadas_garcom')
    .update({ atendida: true })
    .eq('id', id)
    .eq('tenant_id', tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
