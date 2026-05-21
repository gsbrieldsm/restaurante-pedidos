export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/admin/clientes/historico?chave=<whatsapp_ou_nome>
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const chave = searchParams.get('chave')

  if (!chave) return NextResponse.json({ error: 'chave obrigatória' }, { status: 400 })

  const supabase = createServiceClient()

  // Busca todos os pedidos deste cliente com seus itens
  const { data: pedidos, error } = await supabase
    .from('pedidos')
    .select(`
      id, criado_em, total, status_geral, mesa_numero, observacao_geral,
      pedido_itens ( id, item_nome, quantidade, item_preco, status, estacao, observacao, opcoes_selecionadas )
    `)
    .or(
      chave.replace(/\D/g, '').length >= 10
        ? `cliente_whatsapp.eq.${chave}`
        : `cliente_nome.ilike.${chave}`
    )
    .not('status_geral', 'eq', 'cancelado')
    .order('criado_em', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ pedidos: pedidos ?? [] })
}
