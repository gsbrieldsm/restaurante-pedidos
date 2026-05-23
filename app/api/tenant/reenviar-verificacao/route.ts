import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { emailVerificacao } from '@/lib/email/verificacao'

export const dynamic = 'force-dynamic'

// POST /api/tenant/reenviar-verificacao  { email }
export async function POST(req: Request) {
  const { email } = await req.json()

  if (!email) {
    return NextResponse.json({ error: 'E-mail obrigatório.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, nome, email, email_verificado')
    .eq('email', email.toLowerCase().trim())
    .single()

  // Responde ok mesmo se não encontrou (evita enumeração de e-mails)
  if (!tenant || tenant.email_verificado) {
    return NextResponse.json({ ok: true })
  }

  const verificacao_token = randomBytes(32).toString('hex')

  await supabase
    .from('tenants')
    .update({ verificacao_token })
    .eq('id', tenant.id)

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    resend.emails.send({
      from:    process.env.RESEND_FROM ?? 'Menuê+ <noreply@menue.com.br>',
      to:      tenant.email,
      subject: 'Confirme seu e-mail no Menuê+',
      html:    emailVerificacao({ nome: tenant.nome, token: verificacao_token }),
    }).catch((err) => console.error('[resend] erro ao reenviar verificação:', err))
  }

  return NextResponse.json({ ok: true })
}
