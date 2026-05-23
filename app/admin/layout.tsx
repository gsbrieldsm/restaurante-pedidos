import type { Metadata } from 'next'
import { headers, cookies } from 'next/headers'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export const metadata: Metadata = {
  title: 'Gestão — Menuê+',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''

  if (!pathname) {
    return <>{children}</>
  }

  const cookieStore = await cookies()
  const cargo = (cookieStore.get('mmu_cargo')?.value ?? 'admin') as 'admin' | 'operador'

  return (
    <div className="flex min-h-screen bg-slate-100">
      <AdminSidebar cargo={cargo} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">{children}</main>
    </div>
  )
}
