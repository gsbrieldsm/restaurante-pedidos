import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { ItemCarrinho } from '@/lib/supabase/types'

export async function POST(req: Request) {
  const body = await req.json()
  const { sessao_id, itens, observacao_geral, cliente_saldo_id } = body as {
    sessao_id: string
    itens: ItemCarrinho[]
    observacao_geral?: string
    cliente_saldo_id?: string   // presente quando tenant usa saldo pré-pago
  }

  if (!sessao_id || !itens?.length) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Buscar sessão e mesa
  const { data: sessao, error: sessaoError } = await supabase
    .from('sessoes_mesa')
    .select('*, mesas(*)')
    .eq('id', sessao_id)
    .eq('ativa', true)
    .single()

  if (sessaoError || !sessao) {
    return NextResponse.json({ error: 'Sessão inválida' }, { status: 400 })
  }

  const mesa = (sessao as any).mesas

  const total = itens.reduce(
    (acc, i) => acc + i.preco_unitario * i.quantidade,
    0
  )

  const tenantId   = mesa.tenant_id ?? null
  const isDelivery = (sessao as any).is_delivery === true

  // Criar pedido
  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .insert({
      sessao_id,
      mesa_id:          mesa.id,
      mesa_numero:      mesa.numero,
      cliente_nome:     sessao.cliente_nome,
      cliente_whatsapp: sessao.cliente_whatsapp,
      status_geral:     'aguardando',
      observacao_geral: observacao_geral || null,
      total,
      tenant_id:        tenantId,
      is_delivery:      isDelivery,
    })
    .select()
    .single()

  if (pedidoError || !pedido) {
    return NextResponse.json({ error: 'Erro ao criar pedido' }, { status: 500 })
  }

  // Criar itens do pedido
  const pedidoItens = itens.map((i) => ({
    pedido_id:              pedido.id,
    item_id:                i.item.id,
    item_nome:              i.item.nome,
    item_preco:             i.preco_unitario,
    quantidade:             i.quantidade,
    observacao:             i.observacao || null,
    estacao:                i.item.estacao,
    tempo_preparo_estimado: i.item.tempo_preparo_estimado,
    status:                 'aguardando' as const,
    opcoes_selecionadas:    i.opcoes_selecionadas ?? [],
    tenant_id:              tenantId,
    is_delivery:            isDelivery,
  }))

  const { error: itensError } = await supabase
    .from('pedido_itens')
    .insert(pedidoItens)

  if (itensError) {
    await supabase.from('pedidos').delete().eq('id', pedido.id)
    return NextResponse.json({ error: 'Erro ao criar itens' }, { status: 500 })
  }

  // ── Débito atômico no saldo do cliente (se aplicável) ───────────────────
  if (cliente_saldo_id && tenantId) {
    const { error: debitError } = await supabase.rpc('debitar_saldo', {
      p_cliente_id: cliente_saldo_id,
      p_tenant_id:  tenantId,
      p_valor:      total,
      p_pedido_id:  pedido.id,
      p_descricao:  `Pedido #${pedido.id.slice(0, 8)}`,
    })

    if (debitError) {
      // Desfaz o pedido se não puder debitar
      await supabase.from('pedido_itens').delete().eq('pedido_id', pedido.id)
      await supabase.from('pedidos').delete().eq('id', pedido.id)

      const msg = debitError.message?.includes('saldo_insuficiente')
        ? 'Saldo insuficiente para realizar este pedido.'
        : 'Erro ao debitar saldo. Tente novamente.'

      return NextResponse.json({ error: msg, code: 'saldo_insuficiente' }, { status: 402 })
    }
  }

  return NextResponse.json({ pedido }, { status: 201 })
}
