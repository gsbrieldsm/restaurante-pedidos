import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function autenticar() {
  const cookieStore = await cookies()
  const token = cookieStore.get('superadmin_token')?.value
  const senha = process.env.SUPERADMIN_PASSWORD
  if (!token || !senha || token !== `sa:${senha}`) return false
  return true
}

// GET /api/superadmin/parceiros — lista todos os leads
export async function GET() {
  if (!await autenticar()) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('parceiros_leads')
    .select('*')
    .order('criado_em', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ parceiros: data ?? [] })
}

// PATCH /api/superadmin/parceiros — atualiza status ou notas de um lead
export async function PATCH(req: NextRequest) {
  if (!await autenticar()) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { id, status, notas } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 422 })

  const supabase = createServiceClient()
  const updates: Record<string, string> = {}
  if (status) updates.status = status
  if (notas !== undefined) updates.notas = notas

  const { error } = await supabase
    .from('parceiros_leads')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
