import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { obterTenantIdAutenticado } from '@/lib/auth-session'

export const dynamic = 'force-dynamic'

export async function GET() {
  const tenantId = await obterTenantIdAutenticado()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('promocoes')
    .select('*, cardapio_itens(nome)')
    .eq('tenant_id', tenantId)
    .order('criado_em', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ promocoes: data ?? [] })
}

export async function POST(req: Request) {
  const tenantId = await obterTenantIdAutenticado()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { nome, descricao, tipo, desconto_tipo, desconto_valor, aplica_em, item_id, categoria,
    hora_inicio, hora_fim, dias_semana, data_inicio, data_fim, codigo_cupom, uso_maximo } = body

  if (!nome?.trim() || !tipo) return NextResponse.json({ error: 'Nome e tipo obrigatórios' }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('promocoes')
    .insert({
      tenant_id: tenantId,
      nome: nome.trim(),
      descricao: descricao?.trim() || null,
      tipo,
      desconto_tipo: desconto_tipo || null,
      desconto_valor: desconto_valor || null,
      aplica_em: aplica_em || 'total',
      item_id: item_id || null,
      categoria: categoria || null,
      hora_inicio: hora_inicio || null,
      hora_fim: hora_fim || null,
      dias_semana: dias_semana || null,
      data_inicio: data_inicio || null,
      data_fim: data_fim || null,
      codigo_cupom: codigo_cupom?.toUpperCase().trim() || null,
      uso_maximo: uso_maximo || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, promocao: data })
}

export async function PATCH(req: Request) {
  const tenantId = await obterTenantIdAutenticado()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  if (updates.codigo_cupom) updates.codigo_cupom = updates.codigo_cupom.toUpperCase().trim()
  if (updates.nome) updates.nome = updates.nome.trim()

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('promocoes')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, promocao: data })
}

export async function DELETE(req: Request) {
  const tenantId = await obterTenantIdAutenticado()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const supabase = createServiceClient()
  const { error } = await supabase.from('promocoes').delete().eq('id', id).eq('tenant_id', tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
