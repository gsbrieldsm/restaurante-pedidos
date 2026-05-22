import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ─── Constantes de auth de staff (admin interno do restaurante) ───────────────
const SESSION_TOKEN = 'mmu-admin-v1'

const STAFF_PUBLIC = [
  '/admin/login',
  '/admin/setup',
  '/api/admin/auth',
  '/api/admin/setup',
]

const ADMIN_ONLY = [
  '/admin/clientes',
  '/admin/cardapio',
  '/admin/configuracoes',
  '/admin/faturamento',
  '/admin/tempo',
  '/admin/mesas',
]

// ─── Rotas públicas de tenant (sem auth de tenant exigida) ────────────────────
const TENANT_PUBLIC = [
  '/registro',
  '/login',
  '/planos',
  '/api/tenant/auth',
]

// ─── Helper: extrai subdomínio do host ────────────────────────────────────────
function extrairSubdominio(host: string): string | null {
  // host pode ser: joao.meumenu.com.br, localhost:3000, etc.
  const partes = host.split('.')
  // Se tiver 3+ partes (sub.dominio.tld) → é subdomínio
  if (partes.length >= 3) {
    const sub = partes[0]
    if (sub !== 'www' && sub !== 'app') return sub
  }
  return null
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') ?? ''

  // ── 1. Rotas públicas de tenant — sempre passam ──────────────────────────────
  if (TENANT_PUBLIC.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // ── 2. Rotas de mesa / cardápio do cliente — sempre públicas ─────────────────
  if (pathname.startsWith('/mesa/') || pathname.startsWith('/api/mesas/') || pathname.startsWith('/api/cardapio') || pathname.startsWith('/api/configuracoes/')) {
    return NextResponse.next()
  }

  // ── 3. Subdomínio de tenant detectado ────────────────────────────────────────
  const subdomain = extrairSubdominio(host)
  if (subdomain) {
    // Passa o slug do tenant para o request via header
    const response = NextResponse.next()
    response.headers.set('x-tenant-slug', subdomain)
    return response
  }

  // ── 4. Painel admin do staff (rotas /admin, /estacao, /garcom) ───────────────
  if (STAFF_PUBLIC.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = request.cookies.get('admin_auth')?.value

  const valido =
    token === SESSION_TOKEN ||
    (!!token && /^mmu:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(token))

  if (!valido) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const cargo = request.cookies.get('mmu_cargo')?.value
  const isOperador = cargo === 'operador'

  if (isOperador && ADMIN_ONLY.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  const response = NextResponse.next()
  response.headers.set('x-pathname', pathname)
  return response
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/api/admin/:path*',
    '/estacao/:path*',
    '/garcom',
    '/registro',
    '/login',
    '/planos',
    '/api/tenant/:path*',
  ],
}
