import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  await params
  const supabase = createServiceClient()
  const { sessao_id, motivo } = await req.json() as { sessao_id: string; motivo: string }

  const { data: sessao } = await supabase
    .from('sessoes_mesa')
    .select('id, cliente_nome, mesa_id, mesas(numero)')
    .eq('id', sessao_id)
    .eq('ativa', true)
    .single()

  if (!sessao) {
    return NextResponse.json({ error: 'Sessão inválida' }, { status: 403 })
  }

  const mesa = sessao.mesas as unknown as { numero: number }

  const { error } = await supabase.from('chamadas_garcom').insert({
    sessao_id:    sessao.id,
    mesa_id:      sessao.mesa_id,
    mesa_numero:  mesa.numero,
    cliente_nome: sessao.cliente_nome,
    motivo:       motivo ?? 'conta',
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
