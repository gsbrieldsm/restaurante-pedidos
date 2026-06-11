import type { Metadata } from 'next'
import { headers, cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { TrialBanner } from '@/components/admin/TrialBanner'
import { SugestaoWidget } from '@/components/admin/SugestaoWidget'

export const metadata: Metadata = {
  title: 'Gestão — Menuê+',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const pathname    = headersList.get('x-pathname') ?? ''

  if (!pathname) {
    return <>{children}</>
  }

  const cookieStore = await cookies()
  const cargo    = (cookieStore.get('mmu_cargo')?.value ?? 'admin') as 'admin' | 'operador'
  const tenantId = cookieStore.get('tenant_id')?.value

  // Busca nome do restaurante, plano e logo para exibir na sidebar
  let nomeRestaurante: string | undefined
  let plano: string | undefined
  let logoUrl: string | null | undefined
  if (tenantId) {
    try {
      const supabase = createServiceClient()
      const [{ data: tenant }, { data: config }] = await Promise.all([
        supabase.from('tenants').select('nome_restaurante, plano').eq('id', tenantId).single(),
        supabase.from('configuracoes').select('restaurante_logo_url').eq('tenant_id', tenantId).single(),
      ])
      nomeRestaurante = tenant?.nome_restaurante
      plano           = tenant?.plano ?? 'starter'
      logoUrl         = config?.restaurante_logo_url
    } catch { /* ignora */ }
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <AdminSidebar
        cargo={cargo}
        nomeRestaurante={nomeRestaurante}
        plano={plano}
        logoUrl={logoUrl}
      />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <TrialBanner />
        {children}
      </main>
      <SugestaoWidget />
    </div>
  )
}
