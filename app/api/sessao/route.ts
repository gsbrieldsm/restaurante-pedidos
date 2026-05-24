export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/sessao?id=<sessao_id>
// Retorna se a sessão ainda está ativa — usado pelo cardápio para detectar comanda fechada
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: sessao, error } = await supabase
    .from('sessoes_mesa')
    .select('id, ativa, fechada_em, cliente_nome')
    .eq('id', id)
    .single()

  if (error || !sessao) {
    // Sessão não existe — trata como encerrada
    return NextResponse.json({ ativa: false })
  }

  return NextResponse.json({ ativa: sessao.ativa, fechada_em: sessao.fechada_em })
}
