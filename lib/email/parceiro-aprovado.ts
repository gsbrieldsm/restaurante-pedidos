interface ParceiroAprovadoProps {
  nome:               string
  email:              string
  codigo_indicacao:   string
}

export function emailParceiroAprovado({ nome, email, codigo_indicacao }: ParceiroAprovadoProps): string {
  const APP_URL   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.menue.com.br'
  const painelUrl = `${APP_URL}/parceiros/login`

  const primeiroNome = nome.split(' ')[0]

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Você foi aprovado como parceiro Menuê+</title>
</head>
<body style="margin:0;padding:0;background:#f0fafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fafa;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

        <!-- HEADER -->
        <tr>
          <td style="background:#0a2420;border-radius:16px 16px 0 0;padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
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
                <td valign="middle" style="padding-left:14px;">
                  <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#5eead4;">Menuê+ · Parceiros</p>
                  <p style="margin:3px 0 0;font-size:17px;font-weight:800;color:#ffffff;line-height:1.2;">Sua parceria foi aprovada! 🎉</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="background:#ffffff;padding:28px 32px 32px;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none;">

            <!-- Saudação -->
            <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.6;">
              Olá, <strong>${primeiroNome}</strong>!<br/>
              Sua solicitação de parceria com o <strong>Menuê+</strong> foi <strong style="color:#1A9B8A;">aprovada</strong>. A partir de agora você pode acompanhar suas indicações e comissões diretamente no painel de parceiros.
            </p>

            <!-- Código de indicação -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#16a34a;">Seu código de indicação</p>
                  <p style="margin:0;font-size:26px;font-weight:900;color:#0f172a;letter-spacing:2px;">${codigo_indicacao}</p>
                  <p style="margin:6px 0 0;font-size:12px;color:#64748b;">Compartilhe este código com os restaurantes que você indicar. Cada um que contratar usando seu código conta como sua indicação.</p>
                </td>
              </tr>
            </table>

            <!-- Como acessar -->
            <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;">Como acessar o painel</p>

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
              <!-- Passo 1 -->
              <tr>
                <td valign="top" width="32" style="padding-bottom:14px;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="26" height="26" align="center" valign="middle"
                          style="background:#1A9B8A;border-radius:50%;color:#fff;font-size:12px;font-weight:900;">
                        1
                      </td>
                    </tr>
                  </table>
                </td>
                <td valign="top" style="padding-left:10px;padding-bottom:14px;">
                  <p style="margin:0;font-size:14px;font-weight:700;color:#0f172a;">Acesse o painel de parceiros</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#64748b;">
                    Entre em: <a href="${painelUrl}" style="color:#1A9B8A;font-weight:700;text-decoration:none;">${painelUrl}</a>
                  </p>
                </td>
              </tr>
              <!-- Passo 2 -->
              <tr>
                <td valign="top" width="32" style="padding-bottom:14px;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="26" height="26" align="center" valign="middle"
                          style="background:#1A9B8A;border-radius:50%;color:#fff;font-size:12px;font-weight:900;">
                        2
                      </td>
                    </tr>
                  </table>
                </td>
                <td valign="top" style="padding-left:10px;padding-bottom:14px;">
                  <p style="margin:0;font-size:14px;font-weight:700;color:#0f172a;">Faça login com seu e-mail</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#64748b;">
                    Digite o e-mail cadastrado: <strong style="color:#334155;">${email}</strong><br/>
                    Não precisa de senha — só o e-mail já é suficiente para entrar.
                  </p>
                </td>
              </tr>
              <!-- Passo 3 -->
              <tr>
                <td valign="top" width="32">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="26" height="26" align="center" valign="middle"
                          style="background:#1A9B8A;border-radius:50%;color:#fff;font-size:12px;font-weight:900;">
                        3
                      </td>
                    </tr>
                  </table>
                </td>
                <td valign="top" style="padding-left:10px;">
                  <p style="margin:0;font-size:14px;font-weight:700;color:#0f172a;">Acompanhe suas indicações</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#64748b;">
                    No painel você vê todos os restaurantes indicados, o status de cada um e suas comissões acumuladas.
                  </p>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
              <tr>
                <td align="center">
                  <a href="${painelUrl}"
                     style="display:inline-block;background:#1A9B8A;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:12px;letter-spacing:0.2px;">
                    Acessar Painel de Parceiros →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:11px;color:#cbd5e1;text-align:center;">
              Menuê+ · Dúvidas? Fale conosco pelo WhatsApp
            </p>

          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()
}
