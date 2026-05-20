import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_TOKEN = 'mmu-admin-v1'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protege apenas /admin/* (não /admin/login)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const cookie = request.cookies.get('admin_auth')?.value

    if (!cookie || cookie !== SESSION_TOKEN) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
