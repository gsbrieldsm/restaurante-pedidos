import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/tenant'
import { Resend } from 'resend'
import { emailConvite } from '@/lib/email/convite'

export const dynamic = 'force-dynamic'

const CARGO_LABEL: Record<string, string> = {
  admin:    'Administrador',
  operador: 'Operador',
}

// ── GET — lista todos os usuários do tenant ──────────────────────────────────
export async function GET() {
  const supabase  = createServiceClient()
  const tenantId  = await getTenantId()

  let q = supabase
    .from('usuarios')
    .select('id, nome, email, cargo, ativo, convite_aceito, convite_expira_em, criado_em')
    .order('criado_em', { ascending: true })

  if (tenantId) q = (q as any).eq('tenant_id', tenantId)

  const { data, error } = await q

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ usuarios: data ?? [] })
}

// ── POST — convida novo usuário (sem senha — ela é criada pelo próprio operador) ─
export async function POST(req: Request) {
  const supabase = createServiceClient()
  const tenantId = await getTenantId()

  const { nome, email, cargo } = await req.json() as {
    nome:  string
    email: string
    cargo: 'admin' | 'operador'
  }

  if (!nome?.trim() || !email?.trim() || !cargo) {
    return NextResponse.json({ error: 'Nome, e-mail e cargo são obrigatórios.' }, { status: 400 })
  }

  // Verifica e-mail duplicado dentro do tenant
  const { data: existente } = await supabase
    .from('usuarios')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .eq('tenant_id', tenantId ?? '')
    .single()

  if (existente) {
    return NextResponse.json({ error: 'Este e-mail já está cadastrado neste restaurante.' }, { status: 409 })
  }

  const convite_token     = randomBytes(32).toString('hex')
  const convite_expira_em = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 dias

  const { data: usuario, error } = await supabase
    .from('usuarios')
    .insert({
      nome:             nome.trim(),
      email:            email.toLowerCase().trim(),
      cargo,
      ativo:            false,    // fica inativo até aceitar o convite
      convite_aceito:   false,
      convite_token,
      convite_expira_em,
      ...(tenantId ? { tenant_id: tenantId } : {}),
    })
    .select('id, nome, email, cargo, ativo, convite_aceito, criado_em')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Busca nome do restaurante para o e-mail
  let nomeRestaurante = 'Seu Restaurante'
  if (tenantId) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('nome_restaurante')
      .eq('id', tenantId)
      .single()
    if (tenant) nomeRestaurante = tenant.nome_restaurante
  }

  // Envia e-mail de convite
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    try {
      await resend.emails.send({
        from:    process.env.RESEND_FROM ?? 'Menue+ <noreply@menue.com.br>',
        to:      email.toLowerCase().trim(),
        subject: `Você foi convidado para o Menuê+ — ${nomeRestaurante}`,
        html:    emailConvite({
          nomeConvidado:   nome.trim(),
          nomeRestaurante,
          cargoLabel:      CARGO_LABEL[cargo] ?? cargo,
          token:           convite_token,
        }),
      })
    } catch (err) {
      console.error('[resend] erro ao enviar convite:', err)
    }
  }

  return NextResponse.json({ usuario }, { status: 201 })
}
