import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verificarSenha } from '@/lib/auth-utils'

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge:   60 * 60 * 24 * 7,
  path:     '/',
}

const CARGO_OPTS = {
  httpOnly: false,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge:   60 * 60 * 24 * 7,
  path:     '/',
}

function setLoginCookies(
  resp: NextResponse,
  usuario: { id: string; cargo: string; tenant_id: string | null; tenant_slug?: string | null }
) {
  resp.cookies.set('admin_auth', `mmu:${usuario.id}`, COOKIE_OPTS)
  resp.cookies.set('mmu_cargo', usuario.cargo, CARGO_OPTS)
  if (usuario.tenant_id) {
    resp.cookies.set('tenant_id', usuario.tenant_id, COOKIE_OPTS)
  }
  if (usuario.tenant_slug) {
    resp.cookies.set('tenant_slug', usuario.tenant_slug, { ...CARGO_OPTS }) // não-httpOnly para JS
  }
}

// ── POST /api/admin/auth — login ─────────────────────────────────────────────
export async function POST(req: Request) {
  const { email, senha } = await req.json() as { email?: string; senha: string }

  if (!senha) {
    return NextResponse.json({ error: 'Senha obrigatória' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // ── Autenticação via tabela de usuários ──────────────────────────────────
  if (email) {
    // Busca TODOS os registros com esse e-mail (pode estar em vários tenants)
    const { data: candidatos } = await supabase
      .from('usuarios')
      .select('id, nome, cargo, senha_hash, ativo, tenant_id, convite_aceito, email')
      .eq('email', email.toLowerCase().trim())

    if (!candidatos || candidatos.length === 0) {
      return NextResponse.json({ error: 'Email ou senha incorretos' }, { status: 401 })
    }

    // Filtra: ativo + senha correta + convite aceito
    const validos = candidatos.filter(
      (u) => u.ativo && u.convite_aceito && u.senha_hash && verificarSenha(senha, u.senha_hash)
    )

    if (validos.length === 0) {
      return NextResponse.json({ error: 'Email ou senha incorretos' }, { status: 401 })
    }

    // ── Busca slug de todos os tenants envolvidos ──────────────────────
    const tenantIds = validos.map((u) => u.tenant_id).filter(Boolean) as string[]

    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, nome_restaurante, slug')
      .in('id', tenantIds)

    const tenantMap     = Object.fromEntries(tenants?.map((t) => [t.id, t.nome_restaurante]) ?? [])
    const tenantSlugMap = Object.fromEntries(tenants?.map((t) => [t.id, t.slug]) ?? [])

    // ── Apenas 1 restaurante → login direto ─────────────────────────────
    if (validos.length === 1) {
      const u = validos[0]
      const resp = NextResponse.json({ ok: true, nome: u.nome, cargo: u.cargo })
      setLoginCookies(resp, { ...u, tenant_slug: u.tenant_id ? tenantSlugMap[u.tenant_id] : null })
      return resp
    }

    // ── Múltiplos restaurantes → retorna lista para escolha ─────────────
    const opcoes = validos.map((u) => ({
      usuario_id:      u.id,
      nome:            u.nome,
      cargo:           u.cargo,
      tenant_id:       u.tenant_id,
      nome_restaurante: u.tenant_id ? (tenantMap[u.tenant_id] ?? 'Restaurante') : 'Restaurante',
    }))

    return NextResponse.json({ ok: true, multiplos_tenants: true, opcoes })
  }

  // ── Fallback: senha única via env var ────────────────────────────────────
  const { count } = await supabase
    .from('usuarios')
    .select('id', { count: 'exact', head: true })

  const semUsuarios = !count || count === 0

  if (!semUsuarios) {
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

// ── DELETE /api/admin/auth — logout ─────────────────────────────────────────
export async function DELETE() {
  const resp = NextResponse.json({ ok: true })
  resp.cookies.delete('admin_auth')
  resp.cookies.delete('mmu_cargo')
  resp.cookies.delete('tenant_id')
  resp.cookies.delete('tenant_slug')
  return resp
}
