import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export const metadata: Metadata = {
  title: 'Gestão — Meu Menu+',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''

  // Na página de login o middleware não define x-pathname (retorna cedo)
  // então pathname fica vazio — renderiza sem sidebar
  if (!pathname) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
