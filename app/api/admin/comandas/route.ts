export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createServiceClient()

  const { data: sessoes, error } = await supabase
    .from('sessoes_mesa')
    .select(`
      id, cliente_nome, cliente_whatsapp, aberta_em, mesa_id,
      mesas(numero),
      pedidos(
        id, status_geral,
        pedido_itens(item_preco, quantidade, status)
      )
    `)
    .eq('ativa', true)
    .order('aberta_em', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const comandas = (sessoes ?? []).map((s: any) => {
    const pedidos = s.pedidos ?? []
    const todosItens = pedidos.flatMap((p: any) => p.pedido_itens ?? [])
    const total = todosItens.reduce(
      (acc: number, i: any) => acc + i.item_preco * i.quantidade, 0
    )
    const itensAtivos = todosItens.filter(
      (i: any) => i.status !== 'entregue' && i.status !== 'cancelado'
    ).length

    return {
      id:               s.id,
      cliente_nome:     s.cliente_nome,
      cliente_whatsapp: s.cliente_whatsapp,
      mesa_id:          s.mesa_id,
      mesa_numero:      (s.mesas as any)?.numero ?? '?',
      criado_em:        s.aberta_em,
      pedidos_count:    pedidos.length,
      itens_ativos:     itensAtivos,
      total,
    }
  })

  return NextResponse.json({ comandas })
}
