import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

// GET /api/admin/test-email?to=seu@email.com
// Rota temporária de diagnóstico — envia um e-mail de teste e retorna o resultado completo
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const to = searchParams.get('to')

  if (!to) {
    return NextResponse.json({ error: 'Parâmetro ?to= obrigatório. Ex: /api/admin/test-email?to=seu@email.com' }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  const from   = process.env.RESEND_FROM ?? 'Menue+ <noreply@menue.com.br>'

  if (!apiKey) {
    return NextResponse.json({
      erro:      'RESEND_API_KEY não está configurada no ambiente.',
      dica:      'Adicione RESEND_API_KEY nas variáveis de ambiente do Vercel e faça redeploy.',
      NODE_ENV:  process.env.NODE_ENV,
    }, { status: 500 })
  }

  const resend = new Resend(apiKey)

  const resultado = await resend.emails.send({
    from,
    to,
    subject: 'Teste de e-mail — Menuê+',
    html:    `<p>Se você recebeu este e-mail, o Resend está funcionando corretamente! ✅</p><p>From: ${from}</p><p>API Key (primeiros 8): ${apiKey.slice(0, 8)}...</p>`,
  })

  return NextResponse.json({
    sucesso:  !resultado.error,
    id:       resultado.data?.id,
    erro:     resultado.error,
    from,
    to,
    apiKeyOk: !!apiKey,
    apiKeyPrefixo: apiKey.slice(0, 8),
  })
}
