export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

async function checkAuth() {
  const cookieStore = await cookies()
  return cookieStore.get('superadmin_auth')?.value === 'sa-ok'
}

export async function GET() {
  if (!await checkAuth()) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Busca todos os tenants com contagens
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id, slug, nome, nome_restaurante, email, status, plano, plano_aceito_em, criado_em')
    .order('criado_em', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Conta mesas e pedidos por tenant
  const ids = (tenants ?? []).map((t) => t.id)

  const [{ data: mesas }, { data: pedidos }] = await Promise.all([
    supabase.from('mesas').select('tenant_id').in('tenant_id', ids),
    supabase.from('pedidos').select('tenant_id, total').in('tenant_id', ids),
  ])

  const mesasPorTenant: Record<string, number> = {}
  const pedidosPorTenant: Record<string, number> = {}
  const faturamentoPorTenant: Record<string, number> = {}

  for (const m of mesas ?? []) {
    mesasPorTenant[m.tenant_id] = (mesasPorTenant[m.tenant_id] ?? 0) + 1
  }
  for (const p of pedidos ?? []) {
    pedidosPorTenant[p.tenant_id] = (pedidosPorTenant[p.tenant_id] ?? 0) + 1
    faturamentoPorTenant[p.tenant_id] = (faturamentoPorTenant[p.tenant_id] ?? 0) + (p.total ?? 0)
  }

  const resultado = (tenants ?? []).map((t) => ({
    ...t,
    total_mesas: mesasPorTenant[t.id] ?? 0,
    total_pedidos: pedidosPorTenant[t.id] ?? 0,
    faturamento_total: faturamentoPorTenant[t.id] ?? 0,
  }))

  return NextResponse.json({ tenants: resultado })
}

// PATCH — atualiza status de um tenant (ativo/suspenso)
export async function PATCH(req: Request) {
  if (!await checkAuth()) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id, status } = await req.json() as { id: string; status: 'ativo' | 'suspenso' }
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('tenants')
    .update({ status })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
