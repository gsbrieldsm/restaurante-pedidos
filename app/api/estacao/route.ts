import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { EstacaoTipo } from '@/lib/supabase/types'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const estacao = searchParams.get('estacao') as EstacaoTipo | null

  if (!estacao) {
    return NextResponse.json({ error: 'Estação obrigatória' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('view_fila_estacoes')
    .select('*')
    .eq('estacao', estacao)
    .order('criado_em', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ itens: data })
}
