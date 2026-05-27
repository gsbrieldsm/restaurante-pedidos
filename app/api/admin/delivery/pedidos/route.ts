export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'

/** GET — lista pedidos de delivery do tenant */
export async function GET(req: Request) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // filtro opcional

  const supabase = createServiceClient()

  let query = supabase
    .from('delivery_pedidos')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('criado_em', { ascending: false })
    .limit(200)

  if (status) query = (query as any).eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ pedidos: data ?? [] })
}

/** PATCH — atualiza status de um pedido de delivery */
export async function PATCH(req: Request) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { id, status } = await req.json()
  if (!id || !status) return NextResponse.json({ error: 'id e status obrigatórios.' }, { status: 422 })

  const STATUS_VALIDOS = ['pendente', 'em_preparo', 'saiu_entrega', 'entregue', 'cancelado']
  if (!STATUS_VALIDOS.includes(status)) {
    return NextResponse.json({ error: 'Status inválido.' }, { status: 422 })
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('delivery_pedidos')
    .update({ status })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, pedido: data })
}
