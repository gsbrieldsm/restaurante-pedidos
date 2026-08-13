import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { obterTenantIdAutenticado } from '@/lib/auth-session'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

function mesAtual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

async function obterOuCriarComanda(supabase: ReturnType<typeof import('@/lib/supabase/server').createServiceClient>, tenantId: string, usuarioId: string, mes: string) {
  const { data: existente } = await supabase
    .from('comandas_funcionario')
    .select('*')
    .eq('usuario_id', usuarioId)
    .eq('tenant_id', tenantId)
    .eq('mes_referencia', mes)
    .single()

  if (existente) return existente

  const { data, error } = await supabase
    .from('comandas_funcionario')
    .insert({ tenant_id: tenantId, usuario_id: usuarioId, mes_referencia: mes })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

async function recalcularTotais(supabase: ReturnType<typeof import('@/lib/supabase/server').createServiceClient>, comandaId: string) {
  const { data: itens } = await supabase
    .from('comanda_funcionario_itens')
    .select('preco_original, preco_cobrado, quantidade')
    .eq('comanda_id', comandaId)

  const bruto = (itens ?? []).reduce((acc, i) => acc + i.preco_original * i.quantidade, 0)
  const liquido = (itens ?? []).reduce((acc, i) => acc + i.preco_cobrado * i.quantidade, 0)
  const desconto = bruto - liquido

  await supabase
    .from('comandas_funcionario')
    .update({
      total_bruto: Number(bruto.toFixed(2)),
      total_desconto: Number(desconto.toFixed(2)),
      total_liquido: Number(liquido.toFixed(2)),
    })
    .eq('id', comandaId)
}

// GET — comanda do mês atual do funcionário (cria se não existir)
export async function GET(_req: Request, { params }: Params) {
  const tenantId = await obterTenantIdAutenticado()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id: usuarioId } = await params
  const supabase = createServiceClient()

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, nome, desconto_funcionario')
    .eq('id', usuarioId)
    .eq('tenant_id', tenantId)
    .single()

  if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const comanda = await obterOuCriarComanda(supabase, tenantId, usuarioId, mesAtual())

  const { data: itens } = await supabase
    .from('comanda_funcionario_itens')
    .select('*')
    .eq('comanda_id', comanda.id)
    .order('criado_em', { ascending: false })

  return NextResponse.json({ comanda, itens: itens ?? [], desconto_funcionario: usuario.desconto_funcionario })
}

// POST — lança item na comanda do mês atual
export async function POST(req: Request, { params }: Params) {
  const tenantId = await obterTenantIdAutenticado()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id: usuarioId } = await params
  const { nome_item, preco_original, quantidade = 1 } = await req.json()

  if (!nome_item?.trim()) return NextResponse.json({ error: 'Nome do item obrigatório' }, { status: 400 })
  if (!preco_original || preco_original < 0) return NextResponse.json({ error: 'Preço inválido' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('desconto_funcionario')
    .eq('id', usuarioId)
    .eq('tenant_id', tenantId)
    .single()

  if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const comanda = await obterOuCriarComanda(supabase, tenantId, usuarioId, mesAtual())

  if (comanda.status === 'fechada') {
    return NextResponse.json({ error: 'Comanda do mês já foi fechada' }, { status: 409 })
  }

  const desconto_pct = usuario.desconto_funcionario ?? 0
  const preco_cobrado = Number((preco_original * (1 - desconto_pct / 100)).toFixed(2))

  await supabase.from('comanda_funcionario_itens').insert({
    tenant_id: tenantId,
    comanda_id: comanda.id,
    nome_item: nome_item.trim(),
    preco_original,
    desconto_pct,
    preco_cobrado,
    quantidade,
  })

  await recalcularTotais(supabase, comanda.id)

  return NextResponse.json({ ok: true })
}

// DELETE — remove item da comanda
export async function DELETE(req: Request, { params }: Params) {
  const tenantId = await obterTenantIdAutenticado()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id: usuarioId } = await params
  const { item_id } = await req.json()
  if (!item_id) return NextResponse.json({ error: 'item_id obrigatório' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: item } = await supabase
    .from('comanda_funcionario_itens')
    .select('comanda_id')
    .eq('id', item_id)
    .eq('tenant_id', tenantId)
    .single()

  if (!item) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })

  await supabase.from('comanda_funcionario_itens').delete().eq('id', item_id).eq('tenant_id', tenantId)
  await recalcularTotais(supabase, item.comanda_id)

  return NextResponse.json({ ok: true })
}

// PATCH — fecha o mês ou atualiza desconto
export async function PATCH(req: Request, { params }: Params) {
  const tenantId = await obterTenantIdAutenticado()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id: usuarioId } = await params
  const { acao } = await req.json()
  const supabase = createServiceClient()

  if (acao === 'fechar_mes') {
    const { data: comanda } = await supabase
      .from('comandas_funcionario')
      .select('id, status')
      .eq('usuario_id', usuarioId)
      .eq('tenant_id', tenantId)
      .eq('mes_referencia', mesAtual())
      .single()

    if (!comanda) return NextResponse.json({ error: 'Comanda não encontrada' }, { status: 404 })
    if (comanda.status === 'fechada') return NextResponse.json({ error: 'Já fechada' }, { status: 409 })

    await supabase
      .from('comandas_funcionario')
      .update({ status: 'fechada', fechado_em: new Date().toISOString() })
      .eq('id', comanda.id)

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
