import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// POST /api/admin/chamados — abre um novo chamado
export async function POST(req: Request) {
  const cookieStore = await cookies()
  const tenantId    = cookieStore.get('tenant_id')?.value

  if (!tenantId) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const { tipo, mensagem, anonimo, nome_autor } = await req.json() as {
    tipo:       string
    mensagem:   string
    anonimo:    boolean
    nome_autor: string | null
  }

  if (!mensagem?.trim()) {
    return NextResponse.json({ error: 'Mensagem obrigatória.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('chamados')
    .insert({
      tenant_id:  tenantId,
      tipo:       tipo ?? 'sugestao',
      mensagem:   mensagem.trim(),
      anonimo:    anonimo ?? false,
      nome_autor: anonimo ? null : (nome_autor?.trim() || null),
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, id: data.id })
}
