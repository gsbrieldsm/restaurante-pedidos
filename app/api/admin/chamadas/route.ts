import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET — chamadas pendentes
export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('chamadas_garcom')
    .select('*')
    .eq('atendida', false)
    .order('criado_em', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ chamadas: data ?? [] })
}

// PATCH — marcar chamada como atendida
export async function PATCH(req: Request) {
  const supabase = createServiceClient()
  const { id } = await req.json() as { id: string }

  const { error } = await supabase
    .from('chamadas_garcom')
    .update({ atendida: true })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
