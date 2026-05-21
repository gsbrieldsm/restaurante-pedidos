export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

// GET — lista todos os grupos e suas opções para um item
export async function GET(_req: Request, { params }: Params) {
  const { id: item_id } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('cardapio_grupos_opcao')
    .select('*, opcoes:cardapio_opcoes(*)')
    .eq('item_id', item_id)
    .order('ordem')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ grupos: data ?? [] })
}

// POST — cria um novo grupo (sem opções; opções são adicionadas depois)
export async function POST(req: Request, { params }: Params) {
  const { id: item_id } = await params
  const body = await req.json() as { nome: string; obrigatorio: boolean; multiplo: boolean }
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('cardapio_grupos_opcao')
    .insert({ item_id, nome: body.nome, obrigatorio: body.obrigatorio, multiplo: body.multiplo })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ grupo: data }, { status: 201 })
}

// PATCH — atualiza um grupo ou adiciona/remove uma opção
// body: { grupo_id, ...campos } para atualizar grupo
// body: { grupo_id, opcao: { nome, preco_adicional } } para criar opção
// body: { opcao_id } para deletar opção
export async function PATCH(req: Request) {
  const body = await req.json()
  const supabase = createServiceClient()

  // Criar opção em um grupo
  if (body.acao === 'criar_opcao') {
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
    const { error } = await supabase.from('cardapio_opcoes').delete().eq('id', body.opcao_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Atualizar grupo
  if (body.acao === 'atualizar_grupo') {
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

// DELETE — remove um grupo inteiro (as opções são deletadas em cascade)
export async function DELETE(req: Request) {
  const { grupo_id } = await req.json()
  const supabase = createServiceClient()

  const { error } = await supabase.from('cardapio_grupos_opcao').delete().eq('id', grupo_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
