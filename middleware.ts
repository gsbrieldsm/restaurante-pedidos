import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_TOKEN = 'mmu-admin-v1'

// Rotas que nunca precisam de autenticação
const PUBLIC_PREFIXES = [
  '/admin/login',
  '/api/admin/auth',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Sempre libera rotas públicas
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = request.cookies.get('admin_auth')?.value

  // Aceita token legado (env var) ou novo formato por usuário (mmu:UUID)
  const valido =
    token === SESSION_TOKEN ||
    (!!token && /^mmu:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(token))

  if (!valido) {
    // Redireciona para login, guardando a rota de destino
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Autenticado — repassa a pathname como header para o layout poder lê-la
  const response = NextResponse.next()
  response.headers.set('x-pathname', pathname)
  return response
}

export const config = {
  // Protege painel, estações e view do garçom
  matcher: ['/admin/:path*', '/estacao/:path*', '/garcom'],
}
