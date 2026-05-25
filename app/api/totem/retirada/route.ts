export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/tenant'

// GET — pedidos prontos para retirada (painel da TV)
export async function GET() {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ prontos: [], em_preparo: [] })

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('pedidos')
    .select('id, senha_balcao, status_geral, cliente_nome, criado_em')
    .eq('tenant_id', tenantId)
    .eq('tipo_pedido', 'balcao')
    .in('status_geral', ['aguardando', 'em_preparo', 'pronto'])
    .gte('criado_em', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
    .order('senha_balcao', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const prontos    = (data ?? []).filter(p => p.status_geral === 'pronto')
  const em_preparo = (data ?? []).filter(p => p.status_geral !== 'pronto')

  return NextResponse.json({ prontos, em_preparo })
}
