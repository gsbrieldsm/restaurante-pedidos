import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function autenticar() {
  const cookieStore = await cookies()
  return cookieStore.get('superadmin_auth')?.value === 'sa-ok'
}

// GET /api/superadmin/chamados — lista todos os chamados com nome do restaurante
export async function GET() {
  if (!await autenticar()) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('chamados')
    .select(`
      id, tipo, mensagem, anonimo, nome_autor, status, criado_em,
      tenants ( nome_restaurante )
    `)
    .order('criado_em', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ chamados: data ?? [] })
}

// PATCH /api/superadmin/chamados — atualiza status de um chamado
export async function PATCH(req: NextRequest) {
  if (!await autenticar()) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { id, status } = await req.json() as { id: string; status: string }
  if (!id || !status) return NextResponse.json({ error: 'id e status obrigatórios.' }, { status: 422 })

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('chamados')
    .update({ status, atualizado_em: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
