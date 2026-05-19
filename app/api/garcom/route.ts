import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('pedido_itens')
    .select('id, pedido_id, item_nome, quantidade, observacao, estacao, pronto_em, pedidos(mesa_numero, cliente_nome, mesa_id)')
    .eq('status', 'pronto')
    .order('pronto_em', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ itens: data })
}
