import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_TOKEN = 'mmu-admin-v1'

const PUBLIC_PREFIXES = [
  '/admin/login',
  '/admin/setup',
  '/api/admin/auth',
  '/api/admin/setup',
]

// Rotas bloqueadas para operadores (somente admins)
const ADMIN_ONLY = [
  '/admin/clientes',
  '/admin/cardapio',
  '/admin/configuracoes',
  '/admin/faturamento',
  '/admin/tempo',
  '/admin/mesas',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = request.cookies.get('admin_auth')?.value

  const valido =
    token === SESSION_TOKEN ||
    (!!token && /^mmu:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(token))

  if (!valido) {
    // APIs retornam 401 JSON — não faz sentido redirecionar uma chamada fetch
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Verifica cargo para rotas restritas
  const cargo = request.cookies.get('mmu_cargo')?.value
  // Token legado sem cargo cookie = admin (acesso total)
  const isOperador = cargo === 'operador'

  if (isOperador && ADMIN_ONLY.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  const response = NextResponse.next()
  response.headers.set('x-pathname', pathname)
  return response
}

export const config = {
  // Protege painel, APIs admin, estações e view do garçom
  matcher: ['/admin/:path*', '/api/admin/:path*', '/estacao/:path*', '/garcom'],
}
