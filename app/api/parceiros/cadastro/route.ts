import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

// POST /api/parceiros/cadastro — rota pública, salva lead do programa de parceiros
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })

  const { nome, email, whatsapp, cidade, como } = body

  if (!nome?.trim() || !email?.trim() || !whatsapp?.trim()) {
    return NextResponse.json({ error: 'Nome, e-mail e WhatsApp são obrigatórios.' }, { status: 422 })
  }

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('parceiros_leads')
    .insert({
      nome:     nome.trim(),
      email:    email.trim().toLowerCase(),
      whatsapp: whatsapp.replace(/\D/g, ''),
      cidade:   cidade?.trim() || null,
      como:     como || null,
      status:   'novo',
    })

  if (error) {
    console.error('[parceiros/cadastro]', error)
    return NextResponse.json({ error: 'Erro ao salvar cadastro.' }, { status: 500 })
  }

  // Notifica superadmin por e-mail (não bloqueia)
  if (process.env.RESEND_API_KEY && process.env.SUPERADMIN_EMAIL) {
    const resend     = new Resend(process.env.RESEND_API_KEY)
    const adminUrl   = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.menue.com.br'}/superadmin`
    const wppUrl     = whatsapp ? `https://wa.me/55${whatsapp.replace(/\D/g, '')}` : null

    resend.emails.send({
      from:    process.env.RESEND_FROM ?? 'Menuê+ <noreply@menue.com.br>',
      to:      process.env.SUPERADMIN_EMAIL,
      subject: `🤝 Novo parceiro — ${nome.trim()}`,
      html: `
<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f0fafa;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#f0fafa;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;">
        <tr><td style="background:#0a2420;border-radius:16px 16px 0 0;padding:20px 28px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td width="44" height="44" align="center" valign="middle" style="background:#1A9B8A;border-radius:10px;color:#fff;font-size:15px;font-weight:900;">M+</td>
            <td style="padding-left:12px;">
              <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#5eead4;">Menuê+ · Parceiros</p>
              <p style="margin:3px 0 0;font-size:16px;font-weight:800;color:#fff;">Novo pedido de parceria 🤝</p>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="background:#fff;padding:24px 28px 28px;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none;">
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr>
              <td width="48%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;">
                <p style="margin:0 0 3px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;">Nome</p>
                <p style="margin:0;font-size:14px;font-weight:700;color:#0f172a;">${nome.trim()}</p>
              </td>
              <td width="4%"></td>
              <td width="48%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;">
                <p style="margin:0 0 3px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;">Cidade</p>
                <p style="margin:0;font-size:14px;font-weight:700;color:#0f172a;">${cidade?.trim() || '—'}</p>
              </td>
            </tr>
          </table>
          <p style="margin:0 0 6px;font-size:13px;color:#64748b;">📧 <strong>${email.trim()}</strong></p>
          ${wppUrl ? `<p style="margin:0 0 6px;font-size:13px;color:#64748b;">📱 <a href="${wppUrl}" style="color:#1A9B8A;">${whatsapp}</a></p>` : ''}
          ${como ? `<p style="margin:12px 0 0;font-size:13px;color:#64748b;">Como pretende indicar: <strong>${como}</strong></p>` : ''}
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
            <tr><td align="center">
              <a href="${adminUrl}" style="display:inline-block;background:#1A9B8A;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 32px;border-radius:12px;">
                Ver no Painel Master →
              </a>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim(),
    }).catch((err: unknown) => console.error('[parceiros/cadastro] erro email:', err))
  }

  return NextResponse.json({ ok: true })
}
