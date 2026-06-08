import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { criarSessaoAdmin, validarSessaoAdmin, revogarSessaoAdmin } from '@/lib/auth-session'

export const dynamic = 'force-dynamic'

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

// POST /api/admin/auth/selecionar  { usuario_id }
// Chamado após o usuário escolher o restaurante na tela de login ou no switch da sidebar
export async function POST(req: Request) {
  const { usuario_id } = await req.json() as { usuario_id: string }

  if (!usuario_id) {
    return NextResponse.json({ error: 'usuario_id obrigatório.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, nome, cargo, ativo, convite_aceito, senha_hash, tenant_id, email')
    .eq('id', usuario_id)
    .single()

  // Aceita tanto operadores convidados (convite_aceito) quanto donos diretos (senha_hash)
  if (!usuario || !usuario.ativo || (!usuario.convite_aceito && !usuario.senha_hash)) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 })
  }

  // Segurança: garante que o usuario_id pertence ao mesmo e-mail da sessão atual
  // (a sessão é validada no banco — não confiamos em IDs vindos do cookie/cliente)
  const cookieStore  = await cookies()
  const authCookie   = cookieStore.get('admin_auth')?.value
  const sessaoAtual  = await validarSessaoAdmin(authCookie)

  if (sessaoAtual?.usuarioId) {
    const { data: usuarioAtual } = await supabase
      .from('usuarios')
      .select('email')
      .eq('id', sessaoAtual.usuarioId)
      .single()

    const emailAtual = usuarioAtual?.email

    if (emailAtual && usuario.email && emailAtual !== usuario.email) {
      return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 })
    }
  }

  // Busca slug do tenant para cookie não-httpOnly (usado em CardSubdominio)
  let tenantSlug: string | null = null
  if (usuario.tenant_id) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('slug')
      .eq('id', usuario.tenant_id)
      .single()
    tenantSlug = tenant?.slug ?? null
  }

  // Revoga a sessão anterior (troca de restaurante = nova sessão dedicada)
  await revogarSessaoAdmin(authCookie)

  const novoToken = await criarSessaoAdmin({
    usuarioId: usuario.id,
    tenantId: usuario.tenant_id,
    cargo: usuario.cargo,
    userAgent: req.headers.get('user-agent'),
    ip: req.headers.get('x-forwarded-for'),
  })

  const resp = NextResponse.json({ ok: true, cargo: usuario.cargo, nome: usuario.nome })
  resp.cookies.set('admin_auth', novoToken, COOKIE_OPTS)
  resp.cookies.set('mmu_cargo',  usuario.cargo, CARGO_OPTS)
  if (usuario.tenant_id) {
    resp.cookies.set('tenant_id', usuario.tenant_id, COOKIE_OPTS)
  }
  if (tenantSlug) {
    resp.cookies.set('tenant_slug', tenantSlug, { ...CARGO_OPTS }) // não-httpOnly para JS
  }
  return resp
}
