export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import type { StatusItem } from '@/lib/supabase/types'

// PATCH /api/pedidos/[id] — atualizar status de um item
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { item_id, status } = body as { item_id: string; status: StatusItem }

  if (!item_id || !status) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const agora = new Date().toISOString()
  const updates: Record<string, unknown> = { status }

  if (status === 'em_preparo') updates.iniciado_em = agora
  if (status === 'pronto') updates.pronto_em = agora
  if (status === 'entregue') updates.entregue_em = agora

  const { data, error } = await supabase
    .from('pedido_itens')
    .update(updates)
    .eq('id', item_id)
    .eq('pedido_id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Erro ao atualizar item' }, { status: 500 })
  }

  return NextResponse.json({ item: data })
}

// GET /api/pedidos/[id] — buscar pedido completo com itens
// Acessível sem auth (o UUID do pedido funciona como token de acesso seguro para o cliente)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  // Se tiver cookie de admin, filtra pelo tenant — caso contrário, busca só pelo ID (acesso público do cliente)
  const tenantId = await getTenantId()

  const query = supabase
    .from('pedidos')
    .select('*, pedido_itens(*)')
    .eq('id', id)

  if (tenantId) {
    query.eq('tenant_id', tenantId)
  }

  const { data: pedido, error } = await query.single()

  if (error || !pedido) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  }

  return NextResponse.json({ pedido })
}
