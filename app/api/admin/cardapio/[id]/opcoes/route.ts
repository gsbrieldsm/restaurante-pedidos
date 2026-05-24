export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/tenant'

type Params = { params: Promise<{ id: string }> }

// GET — lista todos os grupos e suas opções para um item
export async function GET(_req: Request, { params }: Params) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id: item_id } = await params
  const supabase = createServiceClient()

  // Verifica que o item pertence ao tenant antes de retornar os grupos
  const { data: item } = await supabase
    .from('cardapio_itens')
    .select('id')
    .eq('id', item_id)
    .eq('tenant_id', tenantId)
    .single()

  if (!item) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })

  const { data, error } = await supabase
    .from('cardapio_grupos_opcao')
    .select('*, opcoes:cardapio_opcoes(*)')
    .eq('item_id', item_id)
    .order('ordem')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ grupos: data ?? [] })
}

// POST — cria um novo grupo
export async function POST(req: Request, { params }: Params) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id: item_id } = await params
  const body = await req.json() as { nome: string; obrigatorio: boolean; multiplo: boolean }
  const supabase = createServiceClient()

  // Verifica que o item pertence ao tenant
  const { data: item } = await supabase
    .from('cardapio_itens')
    .select('id')
    .eq('id', item_id)
    .eq('tenant_id', tenantId)
    .single()

  if (!item) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })

  const { data, error } = await supabase
    .from('cardapio_grupos_opcao')
    .insert({ item_id, nome: body.nome, obrigatorio: body.obrigatorio, multiplo: body.multiplo })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ grupo: data }, { status: 201 })
}

// PATCH — atualiza grupo ou adiciona/remove opção
export async function PATCH(req: Request) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const supabase = createServiceClient()

  // Criar opção em um grupo
  if (body.acao === 'criar_opcao') {
    // Verifica ownership via grupo → item → tenant
    const { data: grupo } = await supabase
      .from('cardapio_grupos_opcao')
      .select('item_id, cardapio_itens!inner(tenant_id)')
      .eq('id', body.grupo_id)
      .single()

    if (!grupo || (grupo.cardapio_itens as any)?.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('cardapio_opcoes')
      .insert({ grupo_id: body.grupo_id, nome: body.nome, preco_adicional: body.preco_adicional ?? 0 })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ opcao: data }, { status: 201 })
  }

  // Deletar opção
  if (body.acao === 'deletar_opcao') {
    const { data: opcao } = await supabase
      .from('cardapio_opcoes')
      .select('grupo_id, cardapio_grupos_opcao!inner(item_id, cardapio_itens!inner(tenant_id))')
      .eq('id', body.opcao_id)
      .single()

    if (!opcao || (opcao.cardapio_grupos_opcao as any)?.cardapio_itens?.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { error } = await supabase.from('cardapio_opcoes').delete().eq('id', body.opcao_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Atualizar grupo
  if (body.acao === 'atualizar_grupo') {
    const { data: grupo } = await supabase
      .from('cardapio_grupos_opcao')
      .select('item_id, cardapio_itens!inner(tenant_id)')
      .eq('id', body.grupo_id)
      .single()

    if (!grupo || (grupo.cardapio_itens as any)?.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('cardapio_grupos_opcao')
      .update({ nome: body.nome, obrigatorio: body.obrigatorio, multiplo: body.multiplo })
      .eq('id', body.grupo_id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ grupo: data })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}

// DELETE — remove um grupo inteiro
export async function DELETE(req: Request) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { grupo_id } = await req.json()
  const supabase = createServiceClient()

  // Verifica ownership
  const { data: grupo } = await supabase
    .from('cardapio_grupos_opcao')
    .select('item_id, cardapio_itens!inner(tenant_id)')
    .eq('id', grupo_id)
    .single()

  if (!grupo || (grupo.cardapio_itens as any)?.tenant_id !== tenantId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { error } = await supabase.from('cardapio_grupos_opcao').delete().eq('id', grupo_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
