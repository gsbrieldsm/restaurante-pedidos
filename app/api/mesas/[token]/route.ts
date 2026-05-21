export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: mesa, error } = await supabase
    .from('mesas')
    .select('*')
    .eq('qr_token', token)
    .single()

  if (error || !mesa) {
    return NextResponse.json({ error: 'Mesa não encontrada' }, { status: 404 })
  }

  // Buscar sessão ativa
  const { data: sessao } = await supabase
    .from('sessoes_mesa')
    .select('*')
    .eq('mesa_id', mesa.id)
    .eq('ativa', true)
    .single()

  return NextResponse.json({ mesa, sessao })
}
