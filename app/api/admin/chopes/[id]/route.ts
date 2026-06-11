export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('chopes')
    .update({
      nome: body.nome,
      estilo: body.estilo,
      torneira: body.torneira === '' || body.torneira == null ? null : Number(body.torneira),
      fornecedor: body.fornecedor || null,
      unidade: body.unidade || 'L',
      capacidade_barril: Number(body.capacidade_barril),
      estoque_atual: Number(body.estoque_atual),
      estoque_minimo: Number(body.estoque_minimo),
      estoque_critico: Number(body.estoque_critico),
      ativo: body.ativo ?? true,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { id } = await params
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('chopes')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
