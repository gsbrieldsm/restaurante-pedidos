import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const COOKIE = 'parceiro_auth'
const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge:   60 * 60 * 24 * 30, // 30 dias
  path:     '/',
}

// POST /api/parceiros/auth — login por e-mail
export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}))
  if (!email) return NextResponse.json({ error: 'E-mail obrigatório.' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: parceiro } = await supabase
    .from('parceiros_leads')
    .select('id, nome, status, codigo_indicacao')
    .eq('email', email.trim().toLowerCase())
    .single()

  if (!parceiro) {
    return NextResponse.json(
      { error: 'E-mail não encontrado. Verifique se você se cadastrou como parceiro.' },
      { status: 404 },
    )
  }

  if (parceiro.status !== 'aprovado') {
    return NextResponse.json(
      { error: 'Seu cadastro ainda está em análise. Em até 24h você recebe a confirmação pelo WhatsApp.' },
      { status: 403 },
    )
  }

  const resp = NextResponse.json({ ok: true, nome: parceiro.nome })
  resp.cookies.set(COOKIE, parceiro.id, COOKIE_OPTS)
  return resp
}

// DELETE /api/parceiros/auth — logout
export async function DELETE() {
  const resp = NextResponse.json({ ok: true })
  resp.cookies.delete(COOKIE)
  return resp
}
