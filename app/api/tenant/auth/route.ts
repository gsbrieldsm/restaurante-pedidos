import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { hashSenha, verificarSenha } from '@/lib/auth-utils'
import { Resend } from 'resend'
import { emailBoasVindas } from '@/lib/email/boas-vindas'
import { emailVerificacao } from '@/lib/email/verificacao'

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
  const { acao, nome, nome_restaurante, email, senha, ref_codigo } = await req.json()

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
    const verificacao_token = randomBytes(32).toString('hex')

    const { data: tenant, error } = await supabase
      .from('tenants')
      .insert({
        slug,
        nome:               nome.trim(),
        nome_restaurante:   nome_restaurante.trim(),
        email:              email.toLowerCase().trim(),
        senha_hash,
        status:             'pendente', // ativo após aceitar o plano
        email_verificado:   false,
        verificacao_token,
        ...(ref_codigo ? { indicado_por: ref_codigo } : {}),
      })
      .select('id, slug, nome, nome_restaurante, email, status')
      .single()

    if (error || !tenant) {
      return NextResponse.json({ error: 'Erro ao criar conta. Tente novamente.' }, { status: 500 })
    }

    // Dispara apenas o e-mail de verificação no cadastro.
    // O e-mail de boas-vindas é enviado após a confirmação (verificar-email/route.ts)
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const from = process.env.RESEND_FROM ?? 'Menue+ <noreply@menue.com.br>'

      try {
        await resend.emails.send({
          from,
          to:      tenant.email,
          subject: `Confirme seu e-mail no Menuê+`,
          html:    emailVerificacao({ nome: tenant.nome, token: verificacao_token }),
        })
      } catch (err) {
        console.error('[resend] erro ao enviar verificação:', err)
      }
    }

    // Após registro, NÃO definimos cookies de auth ainda (e-mail precisa ser verificado)
    // O frontend vai redirecionar para a página de verificação
    return NextResponse.json({ ok: true, aguardando_verificacao: true, tenant: { email: tenant.email } })
  }

  // ── LOGIN ──
  if (acao === 'login') {
    if (!email || !senha) {
      return NextResponse.json({ error: 'E-mail e senha obrigatórios.' }, { status: 400 })
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, slug, nome, nome_restaurante, email, status, senha_hash, plano_aceito_em, email_verificado, trial_expira_em, plano')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (!tenant || !verificarSenha(senha, tenant.senha_hash)) {
      return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 401 })
    }

    if (!tenant.email_verificado) {
      return NextResponse.json({ error: 'email_nao_verificado', email: tenant.email }, { status: 403 })
    }

    if (tenant.status === 'suspenso') {
      return NextResponse.json({ error: 'Conta suspensa. Entre em contato com o suporte.' }, { status: 403 })
    }

    const TRIAL_OPTS = {
      httpOnly: false,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge:   60 * 60 * 24 * 8,
      path:     '/',
    }

    const resp = NextResponse.json({
      ok: true,
      tenant: { id: tenant.id, slug: tenant.slug, nome: tenant.nome, status: tenant.status, plano_aceito_em: tenant.plano_aceito_em },
    })
    // tenant_id: não-httpOnly para permitir filtro Realtime no cliente (UUID, não é segredo)
    resp.cookies.set('tenant_id',   tenant.id,   { ...COOKIE_OPTS, httpOnly: false })
    resp.cookies.set('tenant_slug', tenant.slug, { ...COOKIE_OPTS, httpOnly: false })
    resp.cookies.set('admin_auth',  `mmu:${tenant.id}`, COOKIE_OPTS)
    resp.cookies.set('mmu_cargo',    'admin',              { ...COOKIE_OPTS, httpOnly: false })
    resp.cookies.set('tenant_plano', tenant.plano ?? 'starter', { ...COOKIE_OPTS, httpOnly: false })

    // ── Cookies de trial / plano ativo ──────────────────────────────────────
    if (tenant.trial_expira_em === null) {
      // Plano confirmado (superadmin ativou após pagamento)
      resp.cookies.set('plano_ativo', 'sim', { ...TRIAL_OPTS, maxAge: 60 * 60 * 24 * 365 })
      resp.cookies.delete('trial_expira_em')
    } else {
      // Trial ativo ou expirado — seta cookie para middleware verificar
      resp.cookies.set('trial_expira_em', tenant.trial_expira_em, TRIAL_OPTS)
      resp.cookies.delete('plano_ativo')
    }

    return resp
  }

  // ── LOGOUT ──
  if (acao === 'logout') {
    const resp = NextResponse.json({ ok: true })
    resp.cookies.delete('tenant_id')
    resp.cookies.delete('tenant_slug')
    resp.cookies.delete('admin_auth')
    resp.cookies.delete('mmu_cargo')
    resp.cookies.delete('tenant_plano')
    resp.cookies.delete('trial_expira_em')
    resp.cookies.delete('plano_ativo')
    return resp
  }

  return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
}
