import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Detalhes da mesa: pedidos + itens ativos
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: pedidos, error } = await supabase
    .from('pedidos')
    .select('*, pedido_itens(*)')
    .eq('mesa_id', id)
    .not('status_geral', 'in', '(cancelado,entregue)')
    .order('criado_em', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ pedidos: pedidos ?? [] })
}

// Fechar mesa
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  await (supabase as any)
    .from('sessoes_mesa')
    .update({ ativa: false, fechada_em: new Date().toISOString() })
    .eq('mesa_id', id)
    .eq('ativa', true)

  await (supabase as any)
    .from('mesas')
    .update({ status: 'livre' })
    .eq('id', id)

  return NextResponse.json({ ok: true })
}
