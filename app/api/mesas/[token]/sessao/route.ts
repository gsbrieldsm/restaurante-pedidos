import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const body = await req.json()
  const { cliente_nome, cliente_whatsapp } = body

  if (!cliente_nome?.trim()) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: mesa, error: mesaError } = await supabase
    .from('mesas')
    .select('*')
    .eq('qr_token', token)
    .single()

  if (mesaError || !mesa) {
    return NextResponse.json({ error: 'Mesa não encontrada' }, { status: 404 })
  }

  // Encerrar sessão anterior se existir
  await supabase
    .from('sessoes_mesa')
    .update({ ativa: false, fechada_em: new Date().toISOString() })
    .eq('mesa_id', mesa.id)
    .eq('ativa', true)

  // Criar nova sessão
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

  if (sessaoError) {
    return NextResponse.json({ error: 'Erro ao criar sessão' }, { status: 500 })
  }

  // Atualizar status da mesa para ocupada
  await supabase
    .from('mesas')
    .update({ status: 'ocupada' })
    .eq('id', mesa.id)

  return NextResponse.json({ sessao, mesa })
}
