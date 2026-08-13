import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// POST — lança todos os itens da sessão na comanda mensal do funcionário
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { sessao_id } = await req.json()

  if (!sessao_id) {
    return NextResponse.json({ error: 'sessao_id obrigatório' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Busca sessão e valida que é de funcionário
  const { data: sessao } = await supabase
    .from('sessoes_mesa')
    .select('id, tenant_id, funcionario_id, ativa, mesas(id)')
    .eq('id', sessao_id)
    .single()

  if (!sessao || !sessao.ativa) {
    return NextResponse.json({ error: 'Sessão inválida ou encerrada' }, { status: 403 })
  }

  if (!sessao.funcionario_id) {
    return NextResponse.json({ error: 'Sessão não é de funcionário' }, { status: 400 })
  }

  const tenantId     = sessao.tenant_id
  const funcionarioId = sessao.funcionario_id

  // Busca desconto atual do funcionário
  const { data: funcionario } = await supabase
    .from('usuarios')
    .select('desconto_funcionario, nome')
    .eq('id', funcionarioId)
    .single()

  const desconto_pct = funcionario?.desconto_funcionario ?? 0

  // Busca todos os itens dos pedidos desta sessão
  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('id, pedido_itens(id, item_nome, item_preco, quantidade)')
    .eq('sessao_id', sessao_id)
    .not('status_geral', 'eq', 'cancelado')

  const itensBrutos = (pedidos ?? []).flatMap(p =>
    (p.pedido_itens as { id: string; item_nome: string; item_preco: number; quantidade: number }[])
  )

  if (itensBrutos.length === 0) {
    return NextResponse.json({ error: 'Nenhum item para lançar' }, { status: 400 })
  }

  // Obtém ou cria comanda do mês
  const mes = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()

  const { data: comandaExistente } = await supabase
    .from('comandas_funcionario')
    .select('id, status')
    .eq('usuario_id', funcionarioId)
    .eq('tenant_id', tenantId)
    .eq('mes_referencia', mes)
    .single()

  let comandaId: string

  if (comandaExistente) {
    if (comandaExistente.status === 'fechada') {
      return NextResponse.json({ error: 'Comanda do mês já foi fechada' }, { status: 409 })
    }
    comandaId = comandaExistente.id
  } else {
    const { data: novaComanda, error } = await supabase
      .from('comandas_funcionario')
      .insert({ tenant_id: tenantId, usuario_id: funcionarioId, mes_referencia: mes })
      .select('id')
      .single()

    if (error || !novaComanda) {
      return NextResponse.json({ error: 'Erro ao criar comanda' }, { status: 500 })
    }
    comandaId = novaComanda.id
  }

  // Insere itens na comanda com desconto aplicado
  const itensParaInserir = itensBrutos.map(item => ({
    tenant_id:      tenantId,
    comanda_id:     comandaId,
    nome_item:      item.item_nome,
    preco_original: item.item_preco,
    desconto_pct,
    preco_cobrado:  Number((item.item_preco * (1 - desconto_pct / 100)).toFixed(2)),
    quantidade:     item.quantidade,
  }))

  await supabase.from('comanda_funcionario_itens').insert(itensParaInserir)

  // Recalcula totais da comanda
  const { data: todosItens } = await supabase
    .from('comanda_funcionario_itens')
    .select('preco_original, preco_cobrado, quantidade')
    .eq('comanda_id', comandaId)

  const bruto   = (todosItens ?? []).reduce((acc, i) => acc + i.preco_original * i.quantidade, 0)
  const liquido = (todosItens ?? []).reduce((acc, i) => acc + i.preco_cobrado  * i.quantidade, 0)

  await supabase.from('comandas_funcionario').update({
    total_bruto:    Number(bruto.toFixed(2)),
    total_desconto: Number((bruto - liquido).toFixed(2)),
    total_liquido:  Number(liquido.toFixed(2)),
  }).eq('id', comandaId)

  // Encerra a sessão e libera a mesa
  await supabase.from('sessoes_mesa').update({ ativa: false }).eq('id', sessao_id)

  const mesa = sessao.mesas as unknown as { id: string } | null
  if (mesa?.id) {
    const { data: outrasAtivas } = await supabase
      .from('sessoes_mesa')
      .select('id')
      .eq('mesa_id', mesa.id)
      .eq('ativa', true)

    if (!outrasAtivas || outrasAtivas.length === 0) {
      await supabase.from('mesas').update({ status: 'livre' }).eq('id', mesa.id)
    }
  }

  return NextResponse.json({ ok: true, itens_lancados: itensBrutos.length, desconto_pct })
}
