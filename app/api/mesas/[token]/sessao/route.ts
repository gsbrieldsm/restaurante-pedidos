import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST — cria nova comanda nesta mesa
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

  // Cria nova comanda — NÃO fecha outras (múltiplas pessoas por mesa é permitido)
  const { data: sessao, error: sessaoError } = await supabase
    .from('sessoes_mesa')
    .insert({
      mesa_id:          mesa.id,
      cliente_nome:     cliente_nome.trim(),
      cliente_whatsapp: cliente_whatsapp?.trim() || null,
      ativa:            true,
      tenant_id:        mesa.tenant_id ?? null,
    })
    .select()
    .single()

  if (sessaoError) {
    return NextResponse.json({ error: 'Erro ao criar comanda' }, { status: 500 })
  }

  // Mesa fica ocupada
  await supabase.from('mesas').update({ status: 'ocupada' }).eq('id', mesa.id)

  return NextResponse.json({ sessao, mesa })
}

// PATCH — transfere comanda existente para esta mesa
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { sessao_id } = await req.json() as { sessao_id: string }

  if (!sessao_id) {
    return NextResponse.json({ error: 'sessao_id obrigatório' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Mesa destino
  const { data: mesaNova, error: mesaError } = await supabase
    .from('mesas')
    .select('*')
    .eq('qr_token', token)
    .single()

  if (mesaError || !mesaNova) {
    return NextResponse.json({ error: 'Mesa não encontrada' }, { status: 404 })
  }

  // Busca comanda atual
  const { data: sessao, error: sessaoError } = await supabase
    .from('sessoes_mesa')
    .select('id, mesa_id, cliente_nome')
    .eq('id', sessao_id)
    .eq('ativa', true)
    .single()

  if (sessaoError || !sessao) {
    return NextResponse.json({ error: 'Comanda não encontrada ou encerrada' }, { status: 404 })
  }

  const mesaAntigaId = sessao.mesa_id

  // Transfere comanda para a nova mesa
  await supabase
    .from('sessoes_mesa')
    .update({ mesa_id: mesaNova.id })
    .eq('id', sessao_id)

  // Nova mesa fica ocupada
  await supabase.from('mesas').update({ status: 'ocupada' }).eq('id', mesaNova.id)

  // Mesa antiga: só libera se não tiver mais ninguém
  if (mesaAntigaId !== mesaNova.id) {
    const { data: outrasAtivas } = await supabase
      .from('sessoes_mesa')
      .select('id')
      .eq('mesa_id', mesaAntigaId)
      .eq('ativa', true)

    if (!outrasAtivas || outrasAtivas.length === 0) {
      await supabase.from('mesas').update({ status: 'livre' }).eq('id', mesaAntigaId)
    }
  }

  return NextResponse.json({ sessao: { ...sessao, mesa_id: mesaNova.id }, mesa: mesaNova })
}
