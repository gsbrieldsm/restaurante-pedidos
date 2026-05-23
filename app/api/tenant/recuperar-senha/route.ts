import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { emailResetSenha } from '@/lib/email/reset-senha'

export const dynamic = 'force-dynamic'

// POST /api/tenant/recuperar-senha  { email }
export async function POST(req: Request) {
  const { email } = await req.json()

  if (!email) {
    return NextResponse.json({ error: 'E-mail obrigatório.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, nome, email')
    .eq('email', email.toLowerCase().trim())
    .single()

  // Responde ok mesmo se não encontrou (evita enumeração de e-mails)
  if (!tenant) {
    return NextResponse.json({ ok: true })
  }

  const reset_token    = randomBytes(32).toString('hex')
  const reset_expira_em = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hora

  await supabase
    .from('tenants')
    .update({ reset_token, reset_expira_em })
    .eq('id', tenant.id)

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    try {
      await resend.emails.send({
        from:    process.env.RESEND_FROM ?? 'Menue+ <noreply@menue.com.br>',
        to:      tenant.email,
        subject: 'Redefinir senha — Menuê+',
        html:    emailResetSenha({ nome: tenant.nome, token: reset_token }),
      })
    } catch (err) {
      console.error('[resend] erro ao enviar reset de senha:', err)
    }
  }

  return NextResponse.json({ ok: true })
}
