import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { obterTenantIdAutenticado } from '@/lib/auth-session'

export const dynamic = 'force-dynamic'

// GET /api/admin/insumos — catálogo de insumos do tenant
export async function GET() {
  const tenantId = await obterTenantIdAutenticado()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('insumos')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('nome')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ insumos: data ?? [] })
}

// POST /api/admin/insumos — cria ou atualiza insumo no catálogo
export async function POST(req: Request) {
  const tenantId = await obterTenantIdAutenticado()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { nome, unidade, custo_unit } = await req.json()
  if (!nome?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('insumos')
    .upsert(
      { tenant_id: tenantId, nome: nome.trim(), unidade: unidade ?? 'un', custo_unit: custo_unit ?? 0 },
      { onConflict: 'tenant_id,nome' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, insumo: data })
}

// PATCH /api/admin/insumos — atualiza insumo por id e recalcula custo dos itens afetados
export async function PATCH(req: Request) {
  const tenantId = await obterTenantIdAutenticado()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id, nome, unidade, custo_unit } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('insumos')
    .update({ nome: nome?.trim(), unidade, custo_unit })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Recalcula custo de todos os itens que usam esse insumo
  const { data: usos } = await supabase
    .from('cardapio_item_insumos')
    .select('item_id')
    .eq('insumo_id', id)
    .eq('tenant_id', tenantId)

  const itemIds = [...new Set((usos ?? []).map(u => u.item_id))]
  for (const itemId of itemIds) {
    const { data } = await supabase
      .from('cardapio_item_insumos')
      .select('quantidade, insumos(custo_unit)')
      .eq('item_id', itemId)
      .eq('tenant_id', tenantId)

    const total = (data ?? []).reduce((acc, row) => {
      const c = (row.insumos as unknown as { custo_unit: number } | null)?.custo_unit ?? 0
      return acc + row.quantidade * c
    }, 0)

    await supabase
      .from('cardapio_itens')
      .update({ custo: Number(total.toFixed(2)) })
      .eq('id', itemId)
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/insumos — remove insumo do catálogo
export async function DELETE(req: Request) {
  const tenantId = await obterTenantIdAutenticado()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('insumos')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
