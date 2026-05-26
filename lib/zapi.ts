/**
 * Envio de mensagens WhatsApp via Z-API
 * Docs: https://developer.z-api.io/
 *
 * Env vars necessárias:
 *   ZAPI_INSTANCE_ID  — ID da instância (ex: "3B0A1C...")
 *   ZAPI_TOKEN        — Token da instância
 *   ZAPI_CLIENT_TOKEN — Client-Token do workspace (Security → Client-Token)
 */

const ZAPI_BASE = 'https://api.z-api.io'

function getCredentials() {
  const instanceId   = process.env.ZAPI_INSTANCE_ID
  const token        = process.env.ZAPI_TOKEN
  const clientToken  = process.env.ZAPI_CLIENT_TOKEN

  if (!instanceId || !token) {
    throw new Error('ZAPI_INSTANCE_ID e ZAPI_TOKEN são obrigatórios.')
  }

  return { instanceId, token, clientToken }
}

/**
 * Normaliza número para formato internacional sem +
 * Ex: "47999998888" → "5547999998888"
 * Ex: "5547999998888" → "5547999998888"
 */
export function normalizarParaWhatsApp(tel: string): string {
  const digits = tel.replace(/\D/g, '')
  // Já tem código do país (55)
  if (digits.startsWith('55') && digits.length >= 12) return digits
  // Adiciona DDI Brasil
  return `55${digits}`
}

/**
 * Envia mensagem de texto via WhatsApp
 */
export async function enviarWhatsApp(
  telefone: string,
  mensagem: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { instanceId, token, clientToken } = getCredentials()
    const numero = normalizarParaWhatsApp(telefone)

    const url = `${ZAPI_BASE}/instances/${instanceId}/token/${token}/send-text`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (clientToken) {
      headers['Client-Token'] = clientToken
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        phone:   numero,
        message: mensagem,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('[zapi] erro ao enviar:', res.status, body)
      return { ok: false, error: `Z-API erro ${res.status}` }
    }

    return { ok: true }
  } catch (err: any) {
    console.error('[zapi] exceção:', err?.message)
    return { ok: false, error: err?.message ?? 'Erro desconhecido' }
  }
}

/**
 * Envia OTP de verificação de celular
 */
export async function enviarOTPVerificacao(
  telefone: string,
  codigo: string,
  restauranteNome: string
): Promise<{ ok: boolean; error?: string }> {
  const mensagem =
    `🔐 *${restauranteNome}*\n\n` +
    `Seu código de verificação é:\n\n` +
    `*${codigo}*\n\n` +
    `_Válido por 10 minutos. Não compartilhe com ninguém._`

  return enviarWhatsApp(telefone, mensagem)
}
