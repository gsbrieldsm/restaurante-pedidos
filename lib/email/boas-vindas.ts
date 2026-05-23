interface BoasVindasProps {
  nome:             string
  nome_restaurante: string
  email:            string
  slug:             string
}

export function emailBoasVindas({ nome, nome_restaurante }: BoasVindasProps): string {
  const APP_URL   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.menue.com.br'
  const painelUrl = `${APP_URL}/login`

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bem-vindo ao Menuê+</title>
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
              Bem-vindo, ${nome}! 🎉
            </h1>
            <p style="margin:0;font-size:15px;color:#475569;">
              Sua conta foi criada com sucesso.
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:32px 40px 36px;border-radius:0 0 16px 16px;">

            <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7;">
              O <strong style="color:#0f172a;">${nome_restaurante}</strong> já está configurado no Menuê+.
              Seu cardápio digital com QR Code está pronto para receber os primeiros pedidos.
            </p>

            <!-- Resumo do plano -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:28px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;">Plano contratado</p>
                <table width="100%">
                  <tr>
                    <td style="font-size:14px;color:#64748b;padding:4px 0;">Implementação</td>
                    <td align="right" style="font-size:14px;font-weight:700;color:#0f172a;">R$ 2.000,00</td>
                  </tr>
                  <tr>
                    <td style="font-size:14px;color:#64748b;padding:4px 0;border-top:1px solid #e2e8f0;">Mensalidade</td>
                    <td align="right" style="font-size:14px;font-weight:700;color:#0f172a;border-top:1px solid #e2e8f0;">R$ 550,00 / mês</td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr><td align="center">
                <a href="${painelUrl}"
                   style="display:inline-block;background:#1A9B8A;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:15px 36px;border-radius:12px;letter-spacing:0.3px;">
                  Acessar meu painel →
                </a>
              </td></tr>
            </table>

            <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;text-align:center;">
              Seu painel está em:
            </p>
            <p style="margin:0 0 0;font-size:13px;font-family:monospace;color:#1A9B8A;text-align:center;">
              ${painelUrl}
            </p>

            <hr style="border:none;border-top:1px solid #f1f5f9;margin:28px 0;" />
            <p style="margin:0;font-size:12px;color:#cbd5e1;text-align:center;line-height:1.6;">
              Dúvidas? Fale com a gente pelo WhatsApp.<br />
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
