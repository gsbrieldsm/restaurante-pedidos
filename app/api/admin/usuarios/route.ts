import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { hashSenha } from '@/lib/auth-utils'
import { getTenantId } from '@/lib/tenant'

// GET — lista todos os usuários (sem senha_hash)
export async function GET() {
  const supabase = createServiceClient()
  const tenantId = await getTenantId()

  let q = supabase
    .from('usuarios')
    .select('id, nome, email, cargo, ativo, criado_em')
    .order('criado_em', { ascending: true })

  if (tenantId) q = (q as any).eq('tenant_id', tenantId)

  const { data, error } = await q

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ usuarios: data ?? [] })
}

// POST — cria novo usuário
export async function POST(req: Request) {
  const supabase = createServiceClient()
  const tenantId = await getTenantId()
  const { nome, email, senha, cargo } = await req.json() as {
    nome: string
    email: string
    senha: string
    cargo: 'admin' | 'operador'
  }

  if (!nome?.trim() || !email?.trim() || !senha || !cargo) {
    return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 })
  }

  if (senha.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter ao menos 6 caracteres' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('usuarios')
    .insert({
      nome:       nome.trim(),
      email:      email.toLowerCase().trim(),
      senha_hash: hashSenha(senha),
      cargo,
      ...(tenantId ? { tenant_id: tenantId } : {}),
    })
    .select('id, nome, email, cargo, ativo, criado_em')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Este email já está cadastrado' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ usuario: data }, { status: 201 })
}
