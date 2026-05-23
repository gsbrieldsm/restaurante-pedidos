interface ConviteProps {
  nomeConvidado:    string
  nomeRestaurante:  string
  cargoLabel:       string
  token:            string
}

export function emailConvite({ nomeConvidado, nomeRestaurante, cargoLabel, token }: ConviteProps): string {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.menue.com.br'
  const link    = `${APP_URL}/aceitar-convite?token=${token}`

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Você foi convidado — Menuê+</title>
</head>
<body style="margin:0;padding:0;background:#f0fafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fafa;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Hero claro -->
        <tr>
          <td style="background:#ffffff;border-radius:16px 16px 0 0;padding:36px 40px 28px;border-bottom:3px solid #1A9B8A;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#1A9B8A;">Menuê+</p>
            <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#0f172a;line-height:1.2;">
              Você foi convidado! 🎉
            </h1>
            <p style="margin:0;font-size:15px;color:#475569;">
              Olá, <strong style="color:#0f172a;">${nomeConvidado}</strong>!
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:32px 40px 36px;border-radius:0 0 16px 16px;">

            <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7;">
              Você foi adicionado como <strong style="color:#0f172a;">${cargoLabel}</strong> no
              <strong style="color:#0f172a;">${nomeRestaurante}</strong> no sistema Menuê+.
            </p>

            <!-- Cargo box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:28px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0 0 2px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;">Seu acesso</p>
                <p style="margin:4px 0 2px;font-size:15px;font-weight:700;color:#0f172a;">${nomeRestaurante}</p>
                <p style="margin:0;font-size:13px;color:#64748b;">${cargoLabel}</p>
              </td></tr>
            </table>

            <p style="margin:0 0 28px;font-size:15px;color:#334155;line-height:1.7;">
              Clique no botão abaixo para criar sua senha e ativar seu acesso.
              O link é válido por <strong style="color:#0f172a;">7 dias</strong>.
            </p>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr><td align="center">
                <a href="${link}"
                   style="display:inline-block;background:#1A9B8A;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:15px 36px;border-radius:12px;letter-spacing:0.3px;">
                  Criar minha senha →
                </a>
              </td></tr>
            </table>

            <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;text-align:center;">
              Ou copie e cole o link no navegador:
            </p>
            <p style="margin:0 0 28px;font-size:11px;font-family:monospace;color:#1A9B8A;text-align:center;word-break:break-all;">
              ${link}
            </p>

            <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;">
              Se você não esperava este convite, ignore este e-mail.
            </p>

            <hr style="border:none;border-top:1px solid #f1f5f9;margin:28px 0;" />
            <p style="margin:0;font-size:12px;color:#cbd5e1;text-align:center;">
              Menuê+ — Sistema de pedidos por QR Code
            </p>

          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()
}
