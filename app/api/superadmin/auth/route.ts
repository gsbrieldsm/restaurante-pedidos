import { NextResponse } from 'next/server'

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 8, // 8 horas
  path: '/',
}

export async function POST(req: Request) {
  const { senha } = await req.json() as { senha: string }

  const senhaCorreta = process.env.SUPERADMIN_PASSWORD
  if (!senhaCorreta) {
    return NextResponse.json({ error: 'Superadmin não configurado' }, { status: 500 })
  }

  if (senha !== senhaCorreta) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
  }

  const resp = NextResponse.json({ ok: true })
  resp.cookies.set('superadmin_auth', 'sa-ok', COOKIE_OPTS)
  return resp
}

export async function DELETE() {
  const resp = NextResponse.json({ ok: true })
  resp.cookies.delete('superadmin_auth')
  return resp
}
