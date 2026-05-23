interface VerificacaoProps {
  nome:  string
  token: string
}

export function emailVerificacao({ nome, token }: VerificacaoProps): string {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.menue.com.br'
  const link = `${APP_URL}/verificar-email?token=${token}`

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirme seu e-mail — Menuê+</title>
</head>
<body style="margin:0;padding:0;background:#F0FAFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0FAFA;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0a2420 0%,#0f3d35 50%,#1A9B8A 100%);border-radius:16px 16px 0 0;padding:40px 40px 32px;">
              <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#5eead4;">Menuê+</p>
              <h1 style="margin:0;font-size:26px;font-weight:900;color:#ffffff;line-height:1.2;">
                Confirme seu e-mail ✉️
              </h1>
              <p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.6);">
                Olá, ${nome}! Só falta um passo.
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:36px 40px;border-radius:0 0 16px 16px;">

              <p style="margin:0 0 24px;font-size:15px;color:#334155;line-height:1.6;">
                Clique no botão abaixo para confirmar seu endereço de e-mail e ativar sua conta no Menuê+.
              </p>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${link}"
                       style="display:inline-block;background:#1A9B8A;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:12px;">
                      Confirmar e-mail →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;text-align:center;">
                Ou copie e cole o link abaixo no seu navegador:
              </p>
              <p style="margin:0 0 24px;font-size:12px;font-family:monospace;color:#1A9B8A;text-align:center;word-break:break-all;">
                ${link}
              </p>

              <p style="margin:0 0 0;font-size:13px;color:#94a3b8;text-align:center;line-height:1.5;">
                Este link expira em <strong>24 horas</strong>.<br />
                Se você não criou uma conta no Menuê+, ignore este e-mail.
              </p>

              <hr style="border:none;border-top:1px solid #f1f5f9;margin:28px 0;" />

              <p style="margin:0;font-size:12px;color:#cbd5e1;text-align:center;line-height:1.6;">
                Menuê+ — Sistema de pedidos por QR Code.
              </p>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
