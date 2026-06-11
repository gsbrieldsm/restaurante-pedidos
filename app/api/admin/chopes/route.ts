export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'

export async function GET() {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('chopes')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('torneira', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const body = await req.json()
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('chopes')
    .insert({
      tenant_id: tenantId,
      nome: body.nome,
      estilo: body.estilo,
      torneira: body.torneira === '' || body.torneira == null ? null : Number(body.torneira),
      fornecedor: body.fornecedor || null,
      unidade: body.unidade || 'L',
      capacidade_barril: Number(body.capacidade_barril) || 30,
      estoque_atual: Number(body.estoque_atual) || 0,
      estoque_minimo: Number(body.estoque_minimo) || 0,
      estoque_critico: Number(body.estoque_critico) || 0,
      ativo: body.ativo ?? true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
