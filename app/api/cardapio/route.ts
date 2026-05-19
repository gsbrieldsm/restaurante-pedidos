import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('cardapio_itens')
    .select('*')
    .eq('disponivel', true)
    .order('categoria')
    .order('ordem')

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar cardápio' }, { status: 500 })
  }

  return NextResponse.json({ itens: data })
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
