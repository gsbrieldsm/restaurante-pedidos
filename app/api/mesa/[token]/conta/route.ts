export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET — todos os pedidos da sessão ativa
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { searchParams } = new URL(req.url)
  const sessaoId = searchParams.get('sessao_id')

  if (!sessaoId) {
    return NextResponse.json({ error: 'sessao_id obrigatório' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Valida que a sessão pertence a essa mesa
  const { data: sessao } = await supabase
    .from('sessoes_mesa')
    .select('id, cliente_nome, mesas(numero, nome)')
    .eq('id', sessaoId)
    .eq('ativa', true)
    .single()

  if (!sessao) {
    return NextResponse.json({ error: 'Sessão inválida' }, { status: 403 })
  }

  // Busca todos os pedidos com itens
  const { data: pedidos, error } = await supabase
    .from('pedidos')
    .select('*, pedido_itens(*)')
    .eq('sessao_id', sessaoId)
    .not('status_geral', 'eq', 'cancelado')
    .order('criado_em', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const mesa = sessao.mesas as unknown as { numero: number; nome: string | null }

  return NextResponse.json({
    pedidos:      pedidos ?? [],
    cliente_nome: sessao.cliente_nome,
    mesa_numero:  mesa?.numero,
    mesa_nome:    mesa?.nome ?? null,
  })
}
