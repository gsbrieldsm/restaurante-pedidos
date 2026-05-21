export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { StatusItem } from '@/lib/supabase/types'

// PATCH /api/pedidos/[id] — atualizar status de um item
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Erro ao atualizar item' }, { status: 500 })
  }

  return NextResponse.json({ item: data })
}

// GET /api/pedidos/[id] — buscar pedido completo com itens
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: pedido, error } = await supabase
    .from('pedidos')
    .select('*, pedido_itens(*)')
    .eq('id', id)
    .single()

  if (error || !pedido) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  }

  return NextResponse.json({ pedido })
}
