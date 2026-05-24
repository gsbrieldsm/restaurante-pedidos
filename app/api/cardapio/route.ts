export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'

export async function GET(req: Request) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token') // token da mesa para derivar tenant_id

  // Deriva tenant_id a partir do token da mesa (se fornecido)
  let tenantId: string | null = null
  if (token) {
    const { data: mesa } = await supabase
      .from('mesas')
      .select('tenant_id')
      .eq('qr_token', token)
      .single()
    tenantId = mesa?.tenant_id ?? null
  }

  if (!tenantId) return NextResponse.json({ itens: [] })

  const { data, error } = await supabase
    .from('cardapio_itens')
    .select(`
      *,
      grupos_opcao:cardapio_grupos_opcao (
        id, nome, obrigatorio, multiplo, ordem,
        opcoes:cardapio_opcoes ( id, nome, preco_adicional, ordem )
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('disponivel', true)
    .order('categoria')
    .order('ordem')

  if (error) return NextResponse.json({ error: 'Erro ao buscar cardápio' }, { status: 500 })

  const itens = (data ?? []).map((item) => ({
    ...item,
    grupos_opcao: (item.grupos_opcao ?? [])
      .sort((a: { ordem: number }, b: { ordem: number }) => a.ordem - b.ordem)
      .map((g: { opcoes: { ordem: number }[] }) => ({
        ...g,
        opcoes: [...g.opcoes].sort((a, b) => a.ordem - b.ordem),
      })),
  }))

  return NextResponse.json({ itens })
}

export async function POST(req: Request) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('cardapio_itens')
    .insert({ ...body, tenant_id: tenantId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data }, { status: 201 })
}
