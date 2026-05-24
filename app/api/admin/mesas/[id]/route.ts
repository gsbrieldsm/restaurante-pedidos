export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'

// GET — pedidos ativos de uma comanda (por sessao_id)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const supabase = createServiceClient()

  const url = new URL(req.url)
  const por = url.searchParams.get('por') ?? 'sessao'

  let pedidos, error

  if (por === 'sessao') {
    ;({ data: pedidos, error } = await supabase
      .from('pedidos')
      .select('*, pedido_itens(*)')
      .eq('sessao_id', id)
      .eq('tenant_id', tenantId)
      .not('status_geral', 'in', '(cancelado)')
      .order('criado_em', { ascending: true }))
  } else {
    ;({ data: pedidos, error } = await supabase
      .from('pedidos')
      .select('*, pedido_itens(*)')
      .eq('mesa_id', id)
      .eq('tenant_id', tenantId)
      .not('status_geral', 'in', '(cancelado)')
      .order('criado_em', { ascending: true }))
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ pedidos: pedidos ?? [] })
}

// DELETE — fecha comanda (encerra sessão, libera mesa se vazia)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const supabase = createServiceClient()

  const { data: sessao } = await supabase
    .from('sessoes_mesa')
    .select('id, mesa_id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('ativa', true)
    .single()

  if (!sessao) {
    return NextResponse.json({ error: 'Comanda não encontrada' }, { status: 404 })
  }

  await supabase
    .from('sessoes_mesa')
    .update({ ativa: false, fechada_em: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  const { data: outrasAtivas } = await supabase
    .from('sessoes_mesa')
    .select('id')
    .eq('mesa_id', sessao.mesa_id)
    .eq('tenant_id', tenantId)
    .eq('ativa', true)

  if (!outrasAtivas || outrasAtivas.length === 0) {
    await supabase.from('mesas').update({ status: 'livre' }).eq('id', sessao.mesa_id).eq('tenant_id', tenantId)
  }

  return NextResponse.json({ ok: true })
}
