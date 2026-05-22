export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'

export async function GET() {
  const supabase   = createServiceClient()
  const tenantId   = await getTenantId()

  const inicioDia = new Date()
  inicioDia.setHours(0, 0, 0, 0)

  function filtrarTenant<T extends object>(q: T): T {
    return tenantId ? (q as any).eq('tenant_id', tenantId) : q
  }

  const [mesas, itens, pedidosHoje] = await Promise.all([
    filtrarTenant(supabase.from('view_mesas_status').select('status, pedidos_ativos, tenant_id')),
    filtrarTenant(supabase.from('pedido_itens').select('status').in('status', ['aguardando', 'em_preparo', 'pronto'])),
    filtrarTenant(
      supabase.from('pedidos').select('total').gte('criado_em', inicioDia.toISOString()).not('status_geral', 'eq', 'cancelado')
    ),
  ])

  const mesasData   = mesas.data ?? []
  const itensData   = itens.data ?? []
  const pedidosData = pedidosHoje.data ?? []

  return NextResponse.json({
    mesas_ocupadas:   mesasData.filter((m) => m.status === 'ocupada').length,
    mesas_livres:     mesasData.filter((m) => m.status === 'livre').length,
    pedidos_ativos:   mesasData.reduce((acc, m) => acc + (m.pedidos_ativos ?? 0), 0),
    itens_aguardando: itensData.filter((i) => i.status === 'aguardando').length,
    itens_em_preparo: itensData.filter((i) => i.status === 'em_preparo').length,
    itens_prontos:    itensData.filter((i) => i.status === 'pronto').length,
    receita_hoje:     pedidosData.reduce((acc, p) => acc + (p.total ?? 0), 0),
    pedidos_hoje:     pedidosData.length,
  })
}
