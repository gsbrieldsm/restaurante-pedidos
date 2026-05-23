import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { hashSenha, verificarSenha } from '@/lib/auth-utils'
import { Resend } from 'resend'
import { emailBoasVindas } from '@/lib/email/boas-vindas'

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge:   60 * 60 * 24 * 30, // 30 dias
  path:     '/',
}

// ── Gera slug a partir do nome do restaurante ──
function gerarSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30)
}

// ── POST /api/tenant/auth — registro ──
export async function POST(req: Request) {
  const { acao, nome, nome_restaurante, email, senha } = await req.json()

  const supabase = createServiceClient()

  // ── REGISTRO ──
  if (acao === 'registrar') {
    if (!nome || !nome_restaurante || !email || !senha) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 })
    }
    if (senha.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres.' }, { status: 400 })
    }

    // Verifica e-mail duplicado
    const { data: existente } = await supabase
      .from('tenants')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existente) {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado.' }, { status: 409 })
    }

    // Gera slug único
    let slug = gerarSlug(nome_restaurante)
    const { data: slugExiste } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .single()

    if (slugExiste) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    const senha_hash = hashSenha(senha)

    const { data: tenant, error } = await supabase
      .from('tenants')
      .insert({
        slug,
        nome:             nome.trim(),
        nome_restaurante: nome_restaurante.trim(),
        email:            email.toLowerCase().trim(),
        senha_hash,
        status:           'pendente', // ativo após aceitar o plano
      })
      .select('id, slug, nome, nome_restaurante, email, status')
      .single()

    if (error || !tenant) {
      return NextResponse.json({ error: 'Erro ao criar conta. Tente novamente.' }, { status: 500 })
    }

    // Dispara e-mail de boas-vindas (não bloqueia a resposta se falhar)
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      resend.emails.send({
        from:    process.env.RESEND_FROM ?? 'Menuê+ <noreply@menue.com.br>',
        to:      tenant.email,
        subject: `Bem-vindo ao Menuê+, ${tenant.nome}! 🎉`,
        html:    emailBoasVindas({
          nome:             tenant.nome,
          nome_restaurante: tenant.nome_restaurante,
          email:            tenant.email,
          slug:             tenant.slug,
        }),
      }).catch((err) => console.error('[resend] erro ao enviar e-mail:', err))
    }

    const resp = NextResponse.json({ ok: true, tenant })
    resp.cookies.set('tenant_id',   tenant.id,   COOKIE_OPTS)
    resp.cookies.set('tenant_slug', tenant.slug, { ...COOKIE_OPTS, httpOnly: false })
    // Garante acesso ao painel /admin
    resp.cookies.set('admin_auth', `mmu:${tenant.id}`, COOKIE_OPTS)
    resp.cookies.set('mmu_cargo',  'admin', { ...COOKIE_OPTS, httpOnly: false })
    return resp
  }

  // ── LOGIN ──
  if (acao === 'login') {
    if (!email || !senha) {
      return NextResponse.json({ error: 'E-mail e senha obrigatórios.' }, { status: 400 })
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, slug, nome, nome_restaurante, email, status, senha_hash, plano_aceito_em')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (!tenant || !verificarSenha(senha, tenant.senha_hash)) {
      return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 401 })
    }

    if (tenant.status === 'suspenso') {
      return NextResponse.json({ error: 'Conta suspensa. Entre em contato com o suporte.' }, { status: 403 })
    }

    const resp = NextResponse.json({
      ok: true,
      tenant: { id: tenant.id, slug: tenant.slug, nome: tenant.nome, status: tenant.status, plano_aceito_em: tenant.plano_aceito_em },
    })
    resp.cookies.set('tenant_id',   tenant.id,   COOKIE_OPTS)
    resp.cookies.set('tenant_slug', tenant.slug, { ...COOKIE_OPTS, httpOnly: false })
    // Garante acesso ao painel /admin
    resp.cookies.set('admin_auth', `mmu:${tenant.id}`, COOKIE_OPTS)
    resp.cookies.set('mmu_cargo',  'admin', { ...COOKIE_OPTS, httpOnly: false })
    return resp
  }

  // ── LOGOUT ──
  if (acao === 'logout') {
    const resp = NextResponse.json({ ok: true })
    resp.cookies.delete('tenant_id')
    resp.cookies.delete('tenant_slug')
    resp.cookies.delete('admin_auth')
    resp.cookies.delete('mmu_cargo')
    return resp
  }

  return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
}
