export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'

/**
 * GET /api/entrega
 * Retorna sessões de delivery ativas que têm pelo menos um item pronto.
 * Estrutura: sessão com todos os seus pedidos e itens.
 */
export async function GET() {
  const supabase  = createServiceClient()
  const tenantId  = await getTenantId()

  let q = supabase
    .from('sessoes_mesa')
    .select(`
      id, cliente_nome, aberta_em,
      is_delivery,
      delivery_nome, delivery_telefone,
      delivery_endereco, delivery_numero, delivery_complemento,
      delivery_bairro, delivery_cidade, delivery_uf, delivery_cep,
      delivery_taxa, delivery_distancia_km,
      delivery_forma_pagamento, delivery_status,
      pedidos (
        id, total, criado_em,
        pedido_itens (
          id, item_nome, quantidade, observacao, estacao, status, pronto_em, item_preco
        )
      )
    `)
    .eq('is_delivery', true)
    .eq('ativa', true)
    .order('aberta_em', { ascending: true })

  if (tenantId) q = (q as any).eq('tenant_id', tenantId)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filtra: apenas sessões que têm pelo menos 1 item com status='pronto'
  const sessoes = (data ?? []).filter((s: any) => {
    const todosItens = (s.pedidos ?? []).flatMap((p: any) => p.pedido_itens ?? [])
    return todosItens.some((i: any) => i.status === 'pronto')
  })

  return NextResponse.json({ sessoes })
}

/**
 * PATCH /api/entrega
 * Atualiza o status de entrega de uma sessão.
 *
 * Body: { sessao_id, acao }
 * acao: 'saiu_entrega' → atualiza delivery_status (sessão continua aberta)
 * acao: 'entregue'     → marca todos os itens prontos como entregues,
 *                        registra pagamento e fecha a sessão
 */
export async function PATCH(req: Request) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { sessao_id, acao } = await req.json()
  if (!sessao_id || !acao) {
    return NextResponse.json({ error: 'sessao_id e acao são obrigatórios.' }, { status: 422 })
  }

  const supabase = createServiceClient()

  // Busca a sessão
  const { data: sessao, error: errSessao } = await supabase
    .from('sessoes_mesa')
    .select(`
      id, cliente_nome, mesa_id, tenant_id,
      delivery_taxa, delivery_forma_pagamento,
      pedidos (
        id, total,
        pedido_itens (id, status, item_preco, quantidade)
      )
    `)
    .eq('id', sessao_id)
    .eq('is_delivery', true)
    .eq('tenant_id', tenantId)
    .eq('ativa', true)
    .single()

  if (errSessao || !sessao) {
    return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })
  }

  /* ─── saiu_entrega ────────────────────────────────────────── */
  if (acao === 'saiu_entrega') {
    await supabase
      .from('sessoes_mesa')
      .update({ delivery_status: 'saiu_entrega' })
      .eq('id', sessao_id)

    return NextResponse.json({ ok: true })
  }

  /* ─── entregue ────────────────────────────────────────────── */
  if (acao === 'entregue') {
    const pedidos  = (sessao as any).pedidos ?? []
    const agora    = new Date().toISOString()

    // Marca todos os itens prontos como entregues
    const itensProntos = pedidos
      .flatMap((p: any) => p.pedido_itens ?? [])
      .filter((i: any) => i.status === 'pronto')
      .map((i: any) => i.id)

    if (itensProntos.length > 0) {
      await supabase
        .from('pedido_itens')
        .update({ status: 'entregue', entregue_em: agora })
        .in('id', itensProntos)
    }

    // Calcula total (subtotal dos pedidos + taxa de entrega)
    const subtotal   = pedidos.reduce((acc: number, p: any) => acc + (p.total ?? 0), 0)
    const taxaEntrega = (sessao as any).delivery_taxa ?? 0
    const totalFinal  = subtotal + taxaEntrega
    const forma       = (sessao as any).delivery_forma_pagamento ?? 'dinheiro'

    // Busca número da mesa (delivery usa numero=0)
    const { data: mesa } = await supabase
      .from('mesas')
      .select('numero')
      .eq('id', (sessao as any).mesa_id)
      .single()

    // Registra pagamento no financeiro
    await supabase
      .from('pagamentos')
      .insert({
        sessao_id:    sessao_id,
        mesa_id:      (sessao as any).mesa_id,
        mesa_numero:  mesa?.numero ?? 0,
        cliente_nome: (sessao as any).cliente_nome,
        forma,
        valor:        totalFinal,
        tenant_id:    tenantId,
      })

    // Fecha a sessão
    await supabase
      .from('sessoes_mesa')
      .update({
        ativa:           false,
        fechada_em:      agora,
        delivery_status: 'entregue',
      })
      .eq('id', sessao_id)

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação inválida.' }, { status: 422 })
}
