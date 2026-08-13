import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { obterTenantIdAutenticado } from '@/lib/auth-session'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

// GET /api/admin/cardapio/[id]/insumos — ficha técnica do item
export async function GET(_req: Request, { params }: Params) {
  const tenantId = await obterTenantIdAutenticado()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id: itemId } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('cardapio_item_insumos')
    .select('id, quantidade, insumos(id, nome, unidade, custo_unit)')
    .eq('item_id', itemId)
    .eq('tenant_id', tenantId)
    .order('criado_em')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ insumos: data ?? [] })
}

// POST /api/admin/cardapio/[id]/insumos — adiciona insumo à ficha técnica
// Body: { insumo_id?, nome, unidade, custo_unit, quantidade }
// Se insumo_id não vier, cria/atualiza o insumo no catálogo primeiro
export async function POST(req: Request, { params }: Params) {
  const tenantId = await obterTenantIdAutenticado()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id: itemId } = await params
  const body = await req.json()
  const { nome, unidade, custo_unit, quantidade } = body
  let { insumo_id } = body

  if (!nome?.trim()) return NextResponse.json({ error: 'Nome do insumo obrigatório' }, { status: 400 })
  if (!quantidade || quantidade <= 0) return NextResponse.json({ error: 'Quantidade inválida' }, { status: 400 })

  const supabase = createServiceClient()

  // Upsert no catálogo de insumos
  const { data: insumo, error: errInsumo } = await supabase
    .from('insumos')
    .upsert(
      { tenant_id: tenantId, nome: nome.trim(), unidade: unidade ?? 'un', custo_unit: custo_unit ?? 0 },
      { onConflict: 'tenant_id,nome' }
    )
    .select()
    .single()

  if (errInsumo || !insumo) return NextResponse.json({ error: 'Erro ao salvar insumo' }, { status: 500 })
  insumo_id = insumo.id

  // Upsert na ficha técnica
  const { error: errFicha } = await supabase
    .from('cardapio_item_insumos')
    .upsert(
      { item_id: itemId, insumo_id, tenant_id: tenantId, quantidade },
      { onConflict: 'item_id,insumo_id' }
    )

  if (errFicha) return NextResponse.json({ error: errFicha.message }, { status: 500 })

  // Recalcula e atualiza custo total do item
  await recalcularCusto(supabase, itemId, tenantId)

  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/cardapio/[id]/insumos — remove insumo da ficha técnica
// Body: { ficha_id } — id da linha em cardapio_item_insumos
export async function DELETE(req: Request, { params }: Params) {
  const tenantId = await obterTenantIdAutenticado()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id: itemId } = await params
  const { ficha_id } = await req.json()
  if (!ficha_id) return NextResponse.json({ error: 'ficha_id obrigatório' }, { status: 400 })

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('cardapio_item_insumos')
    .delete()
    .eq('id', ficha_id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recalcularCusto(supabase, itemId, tenantId)
  return NextResponse.json({ ok: true })
}

async function recalcularCusto(supabase: ReturnType<typeof import('@/lib/supabase/server').createServiceClient>, itemId: string, tenantId: string) {
  const { data } = await supabase
    .from('cardapio_item_insumos')
    .select('quantidade, insumos(custo_unit)')
    .eq('item_id', itemId)
    .eq('tenant_id', tenantId)

  const total = (data ?? []).reduce((acc, row) => {
    const custo = (row.insumos as unknown as { custo_unit: number } | null)?.custo_unit ?? 0
    return acc + row.quantidade * custo
  }, 0)

  await supabase
    .from('cardapio_itens')
    .update({ custo: Number(total.toFixed(2)) })
    .eq('id', itemId)
}
