import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getPlanoConfig } from '@/lib/planos'

// ─── Constantes de auth de staff (admin interno do restaurante) ───────────────
const SESSION_TOKEN = 'mmu-admin-v1'

const STAFF_PUBLIC = [
  '/admin/login',    // mantido como redirect para /operador/login
  '/admin/setup',
  '/operador/login',
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
  '/admin/equipe',
  '/api/admin/usuarios',
]

// ─── Rotas públicas de tenant (sem auth de staff exigida) ────────────────────
// Todas as rotas /api/tenant/* gerenciam sua própria auth via cookie tenant_id
const TENANT_PUBLIC = [
  '/registro',
  '/login',
  '/planos',
  '/verificar-email',
  '/recuperar-senha',
  '/nova-senha',
  '/aguardando-verificacao',
  '/aceitar-convite',
  '/api/tenant/',
]

// Domínio raiz de produção — só reconhece subdomínio nesse domínio
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'menue.com.br'

// ─── Helper: extrai subdomínio do host ────────────────────────────────────────
function extrairSubdominio(host: string): string | null {
  // Remove porta se houver (ex: localhost:3000)
  const hostSemPorta = host.split(':')[0]

  // Só considera subdomínio se o host terminar com o ROOT_DOMAIN
  // Ex: joao.menue.com.br → 'joao'
  // menue.vercel.app → null (não é nosso domínio)
  // localhost → null
  if (!hostSemPorta.endsWith(`.${ROOT_DOMAIN}`)) return null

  const sub = hostSemPorta.slice(0, -(ROOT_DOMAIN.length + 1))
  if (!sub || sub === 'www' || sub === 'app') return null
  return sub
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') ?? ''

  // ── 0. Superadmin — fluxo totalmente separado ────────────────────────────────
  if (pathname.startsWith('/superadmin') || pathname.startsWith('/api/superadmin')) {
    // Login é público
    if (pathname === '/superadmin/login' || pathname === '/api/superadmin/auth') {
      return NextResponse.next()
    }
    // Demais rotas exigem cookie superadmin_auth
    const saToken = request.cookies.get('superadmin_auth')?.value
    if (saToken !== 'sa-ok') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/superadmin/login', request.url))
    }
    return NextResponse.next()
  }

  // ── 1. Rotas públicas de tenant e páginas públicas — sempre passam ───────────
  if (TENANT_PUBLIC.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Páginas e APIs de parceiros — sistema de auth próprio (não exige staff auth)
  if (pathname.startsWith('/parceiros') || pathname.startsWith('/api/parceiros/')) {
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

  // ── 4. Trial expirado — página pública ───────────────────────────────────────
  if (pathname === '/trial-expirado') {
    return NextResponse.next()
  }

  // ── 5. Painel admin do staff (rotas /admin, /estacao, /garcom) ───────────────
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
    const loginUrl = new URL('/operador/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const cargo = request.cookies.get('mmu_cargo')?.value
  const isOperador = cargo === 'operador'

  if (isOperador && ADMIN_ONLY.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // ── Trial expirado? Bloqueia acesso ao painel ─────────────────────────────
  if (pathname.startsWith('/admin') && !pathname.startsWith('/api/')) {
    const trialExpira = request.cookies.get('trial_expira_em')?.value
    const planoAtivo  = request.cookies.get('plano_ativo')?.value === 'sim'

    if (trialExpira) {
      const expirou = new Date(trialExpira) < new Date()
      if (expirou && !planoAtivo) {
        return NextResponse.redirect(new URL('/trial-expirado', request.url))
      }
    }

    // ── Restrição por plano (só aplica após plano confirmado — não no trial) ──
    if (planoAtivo && pathname !== '/admin/bloqueado') {
      const plano  = request.cookies.get('tenant_plano')?.value
      const config = getPlanoConfig(plano)
      if (config.bloqueado.some((rota) => pathname.startsWith(rota))) {
        const url = new URL('/admin/bloqueado', request.url)
        url.searchParams.set('recurso', pathname)
        return NextResponse.redirect(url)
      }
    }
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
    '/operador',
    '/operador/:path*',
    '/estacao/:path*',
    '/garcom',
    '/registro',
    '/login',
    '/planos',
    '/verificar-email',
    '/recuperar-senha',
    '/nova-senha',
    '/aguardando-verificacao',
    '/aceitar-convite',
    '/api/tenant/:path*',
    '/parceiros',
    '/parceiros/:path*',
    '/api/parceiros/:path*',
    '/trial-expirado',
    '/superadmin',
    '/superadmin/:path*',
    '/api/superadmin/:path*',
  ],
}
