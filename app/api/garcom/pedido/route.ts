import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// POST — garçom abre comanda informando número da mesa + nome do cliente
export async function POST(req: Request) {
  const { mesa_numero, cliente_nome, cliente_whatsapp } = await req.json() as {
    mesa_numero: number
    cliente_nome: string
    cliente_whatsapp?: string
  }

  if (!mesa_numero || !cliente_nome?.trim()) {
    return NextResponse.json({ error: 'Mesa e nome são obrigatórios' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: mesa, error: mesaError } = await supabase
    .from('mesas')
    .select('*')
    .eq('numero', mesa_numero)
    .single()

  if (mesaError || !mesa) {
    return NextResponse.json({ error: 'Mesa não encontrada' }, { status: 404 })
  }

  const { data: sessao, error: sessaoError } = await supabase
    .from('sessoes_mesa')
    .insert({
      mesa_id: mesa.id,
      cliente_nome: cliente_nome.trim(),
      cliente_whatsapp: cliente_whatsapp?.trim() || null,
      ativa: true,
    })
    .select()
    .single()

  if (sessaoError || !sessao) {
    return NextResponse.json({ error: 'Erro ao criar comanda' }, { status: 500 })
  }

  await supabase.from('mesas').update({ status: 'ocupada' }).eq('id', mesa.id)

  return NextResponse.json({ sessao_id: sessao.id, token: mesa.qr_token }, { status: 201 })
}
