export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'

export async function GET(req: Request) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const chopeId = searchParams.get('chopeId')

  const supabase = createServiceClient()
  let query = supabase
    .from('chopes_movimentacoes')
    .select('*, chope:chopes(nome, torneira)')
    .eq('tenant_id', tenantId)
    .order('criado_em', { ascending: false })
    .limit(50)

  if (chopeId) query = query.eq('chope_id', chopeId)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const body = await req.json()
  const { chopeId, tipo, quantidade, observacao } = body

  if (!chopeId || !tipo || quantidade === undefined) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: chopeId, tipo, quantidade' },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase.rpc('registrar_movimentacao_chope', {
    p_chope_id: chopeId,
    p_tenant_id: tenantId,
    p_tipo: tipo,
    p_quantidade: Number(quantidade),
    p_observacao: observacao || null,
    p_importacao_id: null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ chope: data }, { status: 201 })
}
