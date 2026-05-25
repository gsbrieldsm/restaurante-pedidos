export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/tenant'

// POST — cria pedido de balcão com senha de retirada
export async function POST(req: Request) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { cliente_nome, itens, observacao_geral } = await req.json() as {
    cliente_nome?: string
    observacao_geral?: string
    itens: {
      item_id: string
      item_nome: string
      quantidade: number
      item_preco: number
      estacao: string
      observacao?: string
      opcoes_escolhidas?: Record<string, string>
    }[]
  }

  if (!itens?.length) {
    return NextResponse.json({ error: 'Nenhum item no pedido' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Gera próxima senha do dia
  const { data: senhaData } = await supabase
    .rpc('proxima_senha_balcao', { p_tenant_id: tenantId })
  const senha = senhaData as number

  // Calcula total
  const total = itens.reduce((acc, i) => acc + i.item_preco * i.quantidade, 0)

  // Cria pedido
  const { data: pedido, error: errPedido } = await supabase
    .from('pedidos')
    .insert({
      tenant_id:       tenantId,
      tipo_pedido:     'balcao',
      senha_balcao:    senha,
      cliente_nome:    cliente_nome?.trim() || 'Balcão',
      observacao_geral: observacao_geral?.trim() || null,
      total,
      status_geral:    'aguardando',
      mesa_numero:     0,
    })
    .select('id, senha_balcao')
    .single()

  if (errPedido) return NextResponse.json({ error: errPedido.message }, { status: 500 })

  // Cria itens do pedido
  const itensBd = itens.map((i) => ({
    tenant_id:        tenantId,
    pedido_id:        pedido.id,
    item_id:          i.item_id,
    item_nome:        i.item_nome,
    quantidade:       i.quantidade,
    item_preco:       i.item_preco,
    estacao:          i.estacao,
    observacao:       i.observacao || null,
    opcoes_escolhidas: i.opcoes_escolhidas || null,
    status:           'aguardando',
  }))

  const { error: errItens } = await supabase.from('pedido_itens').insert(itensBd)
  if (errItens) return NextResponse.json({ error: errItens.message }, { status: 500 })

  return NextResponse.json({ ok: true, pedido_id: pedido.id, senha })
}
