import { NextResponse } from 'next/server'

// Token fixo gravado no cookie — a senha só é comparada no POST
const SESSION_TOKEN = 'mmu-admin-v1'

export async function POST(req: Request) {
  const { senha } = await req.json() as { senha: string }

  if (senha !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
  }

  const resp = NextResponse.json({ ok: true })
  resp.cookies.set('admin_auth', SESSION_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    path: '/',
  })
  return resp
}

export async function DELETE() {
  const resp = NextResponse.json({ ok: true })
  resp.cookies.delete('admin_auth')
  return resp
}
