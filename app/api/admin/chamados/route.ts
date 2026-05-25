import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const TIPO_LABEL: Record<string, string> = {
  sugestao: '💡 Sugestão',
  bug:      '🐛 Bug',
  duvida:   '❓ Dúvida',
  outro:    '💬 Outro',
}

// POST /api/admin/chamados — abre um novo chamado
export async function POST(req: Request) {
  const cookieStore = await cookies()
  const tenantId    = cookieStore.get('tenant_id')?.value

  if (!tenantId) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const { tipo, mensagem, anonimo, nome_autor } = await req.json() as {
    tipo:       string
    mensagem:   string
    anonimo:    boolean
    nome_autor: string | null
  }

  if (!mensagem?.trim()) {
    return NextResponse.json({ error: 'Mensagem obrigatória.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Busca nome do restaurante
  const { data: tenant } = await supabase
    .from('tenants')
    .select('nome_restaurante')
    .eq('id', tenantId)
    .single()

  const { data, error } = await supabase
    .from('chamados')
    .insert({
      tenant_id:  tenantId,
      tipo:       tipo ?? 'sugestao',
      mensagem:   mensagem.trim(),
      anonimo:    anonimo ?? false,
      nome_autor: anonimo ? null : (nome_autor?.trim() || null),
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Envia notificação por e-mail (não bloqueia a resposta)
  if (process.env.RESEND_API_KEY && process.env.SUPERADMIN_EMAIL) {
    const resend      = new Resend(process.env.RESEND_API_KEY)
    const tipoLabel   = TIPO_LABEL[tipo] ?? TIPO_LABEL.outro
    const restaurante = tenant?.nome_restaurante ?? 'Restaurante desconhecido'
    const autor       = anonimo ? 'Anônimo' : (nome_autor?.trim() || 'Não identificado')
    const adminUrl    = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.menue.com.br'}/superadmin`

    resend.emails.send({
      from:    process.env.RESEND_FROM ?? 'Menuê+ <noreply@menue.com.br>',
      to:      process.env.SUPERADMIN_EMAIL,
      subject: `${tipoLabel} — ${restaurante}`,
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Nova mensagem — Menuê+</title>
</head>
<body style="margin:0;padding:0;background:#f0fafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fafa;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:500px;">

        <!-- HEADER -->
        <tr>
          <td style="background:#0a2420;border-radius:16px 16px 0 0;padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <!-- Ícone M+ -->
                <td width="44" valign="middle">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="44" height="44" align="center" valign="middle"
                          style="background:#1A9B8A;border-radius:10px;color:#ffffff;font-size:15px;font-weight:900;letter-spacing:-0.5px;">
                        M+
                      </td>
                    </tr>
                  </table>
                </td>
                <!-- Texto -->
                <td valign="middle" style="padding-left:14px;">
                  <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#5eead4;">Menuê+</p>
                  <p style="margin:3px 0 0;font-size:17px;font-weight:800;color:#ffffff;line-height:1.2;">Nova mensagem recebida</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="background:#ffffff;padding:28px 32px 32px;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none;">

            <!-- Tipo + Restaurante inline -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
              <tr>
                <td width="48%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;">
                  <p style="margin:0 0 3px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;">Tipo</p>
                  <p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">${tipoLabel}</p>
                </td>
                <td width="4%"></td>
                <td width="48%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;">
                  <p style="margin:0 0 3px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;">Restaurante</p>
                  <p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${restaurante}</p>
                </td>
              </tr>
            </table>

            <!-- Autor -->
            <p style="margin:0 0 16px;font-size:13px;color:#64748b;">
              Enviado por: <strong style="color:#334155;">${autor}</strong>
            </p>

            <!-- Mensagem -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;border-left:4px solid #1A9B8A;border-radius:0 10px 10px 0;margin-bottom:28px;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#1A9B8A;">Mensagem</p>
                  <p style="margin:0;font-size:15px;color:#0f172a;line-height:1.75;">${mensagem.trim().replace(/\n/g, '<br/>')}</p>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
              <tr>
                <td align="center">
                  <a href="${adminUrl}"
                     style="display:inline-block;background:#1A9B8A;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:12px;letter-spacing:0.2px;">
                    Ver no Painel Master →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:11px;color:#cbd5e1;text-align:center;">
              Menuê+ · Notificação automática de chamados
            </p>

          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim(),
    }).catch((err: unknown) => console.error('[chamados] erro ao enviar email:', err))
  }

  return NextResponse.json({ ok: true, id: data.id })
}
