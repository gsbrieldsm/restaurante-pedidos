import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verificarSenha } from '@/lib/auth-utils'

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge:   60 * 60 * 24 * 7, // 7 dias
  path:     '/',
}

// Cargo cookie não precisa ser httpOnly — não é segredo, middleware lê normalmente
const CARGO_OPTS = {
  httpOnly: false,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge:   60 * 60 * 24 * 7,
  path:     '/',
}

// POST — login com email + senha (ou senha legada via env var)
export async function POST(req: Request) {
  const { email, senha } = await req.json() as { email?: string; senha: string }

  if (!senha) {
    return NextResponse.json({ error: 'Senha obrigatória' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // ── Autenticação via tabela de usuários ──
  if (email) {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, nome, cargo, senha_hash, ativo, tenant_id')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (!usuario || !usuario.ativo) {
      return NextResponse.json({ error: 'Email ou senha incorretos' }, { status: 401 })
    }

    if (!verificarSenha(senha, usuario.senha_hash)) {
      return NextResponse.json({ error: 'Email ou senha incorretos' }, { status: 401 })
    }

    const resp = NextResponse.json({ ok: true, nome: usuario.nome, cargo: usuario.cargo })
    resp.cookies.set('admin_auth', `mmu:${usuario.id}`, COOKIE_OPTS)
    resp.cookies.set('mmu_cargo', usuario.cargo, CARGO_OPTS)
    // Propaga tenant_id para que estação/garçom filtrem pelo tenant correto
    if (usuario.tenant_id) {
      resp.cookies.set('tenant_id', usuario.tenant_id, COOKIE_OPTS)
    }
    return resp
  }

  // ── Fallback: senha única via env var (quando não há usuários cadastrados) ──
  const { count } = await supabase
    .from('usuarios')
    .select('id', { count: 'exact', head: true })

  const semUsuarios = !count || count === 0

  if (!semUsuarios) {
    // Já existem usuários — exige email
    return NextResponse.json({ error: 'Informe o email de acesso' }, { status: 400 })
  }

  if (senha !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
  }

  const resp = NextResponse.json({ ok: true, nome: 'Admin', cargo: 'admin' })
  resp.cookies.set('admin_auth', 'mmu-admin-v1', COOKIE_OPTS)
  resp.cookies.set('mmu_cargo', 'admin', CARGO_OPTS)
  return resp
}

// DELETE — logout
export async function DELETE() {
  const resp = NextResponse.json({ ok: true })
  resp.cookies.delete('admin_auth')
  resp.cookies.delete('mmu_cargo')
  resp.cookies.delete('tenant_id')
  resp.cookies.delete('tenant_slug')
  return resp
}
