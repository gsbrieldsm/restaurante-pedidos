export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'

export async function GET() {
  const supabase = createServiceClient()
  const tenantId = await getTenantId()

  let q = supabase
    .from('pedido_itens')
    .select('id, pedido_id, item_nome, quantidade, observacao, estacao, pronto_em, tenant_id, pedidos(mesa_numero, cliente_nome, mesa_id)')
    .eq('status', 'pronto')
    .eq('is_delivery', false)   // delivery vai pro painel /entrega, não pro garçom
    .order('pronto_em', { ascending: true })

  if (tenantId) q = (q as any).eq('tenant_id', tenantId)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ itens: data })
}
