import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { hashSenha } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

// POST /api/tenant/nova-senha  { token, senha }
export async function POST(req: Request) {
  const { token, senha } = await req.json()

  if (!token || !senha) {
    return NextResponse.json({ error: 'Token e senha são obrigatórios.' }, { status: 400 })
  }

  if (senha.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, reset_expira_em')
    .eq('reset_token', token)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 404 })
  }

  if (!tenant.reset_expira_em || new Date(tenant.reset_expira_em) < new Date()) {
    return NextResponse.json({ error: 'Este link de redefinição expirou. Solicite um novo.' }, { status: 410 })
  }

  const senha_hash = hashSenha(senha)

  const { error } = await supabase
    .from('tenants')
    .update({ senha_hash, reset_token: null, reset_expira_em: null })
    .eq('id', tenant.id)

  if (error) {
    return NextResponse.json({ error: 'Erro ao atualizar senha.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
