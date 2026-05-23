import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge:   60 * 60 * 24 * 30,
  path:     '/',
}

// GET /api/tenant/verificar-email?token=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token inválido.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, slug, nome, email, status, email_verificado, plano_aceito_em')
    .eq('verificacao_token', token)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 404 })
  }

  if (tenant.email_verificado) {
    // Já verificado — faz login direto
    const resp = NextResponse.json({ ok: true, ja_verificado: true })
    resp.cookies.set('tenant_id',   tenant.id,   COOKIE_OPTS)
    resp.cookies.set('tenant_slug', tenant.slug, { ...COOKIE_OPTS, httpOnly: false })
    resp.cookies.set('admin_auth', `mmu:${tenant.id}`, COOKIE_OPTS)
    resp.cookies.set('mmu_cargo',  'admin', { ...COOKIE_OPTS, httpOnly: false })
    return resp
  }

  // Marca como verificado e limpa o token
  const { error } = await supabase
    .from('tenants')
    .update({ email_verificado: true, verificacao_token: null })
    .eq('id', tenant.id)

  if (error) {
    return NextResponse.json({ error: 'Erro ao verificar e-mail.' }, { status: 500 })
  }

  // Faz login automático após verificação
  const resp = NextResponse.json({
    ok: true,
    precisa_plano: !tenant.plano_aceito_em,
  })
  resp.cookies.set('tenant_id',   tenant.id,   COOKIE_OPTS)
  resp.cookies.set('tenant_slug', tenant.slug, { ...COOKIE_OPTS, httpOnly: false })
  resp.cookies.set('admin_auth', `mmu:${tenant.id}`, COOKIE_OPTS)
  resp.cookies.set('mmu_cargo',  'admin', { ...COOKIE_OPTS, httpOnly: false })
  return resp
}
