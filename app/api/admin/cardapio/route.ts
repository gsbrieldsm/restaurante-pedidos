export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET — todos os itens, inclusive indisponíveis (apenas para o admin)
export async function GET() {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('cardapio_itens')
    .select('*')
    .order('categoria')
    .order('ordem')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ itens: data ?? [] })
}
