import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('cardapio_itens')
    .select(`
      *,
      grupos_opcao:cardapio_grupos_opcao (
        id, nome, obrigatorio, multiplo, ordem,
        opcoes:cardapio_opcoes ( id, nome, preco_adicional, ordem )
      )
    `)
    .eq('disponivel', true)
    .order('categoria')
    .order('ordem')

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar cardápio' }, { status: 500 })
  }

  // Ordena as opções dentro de cada grupo
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
  const body = await req.json()
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('cardapio_itens')
    .insert(body)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ item: data }, { status: 201 })
}
