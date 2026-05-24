export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const cookieStore = await cookies()
  const authCookie  = cookieStore.get('admin_auth')?.value

  if (!authCookie?.startsWith('mmu:')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const tenantId = cookieStore.get('tenant_id')?.value
  if (!tenantId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('plano, nome_restaurante, nome, trial_expira_em')
    .eq('id', tenantId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  }

  return NextResponse.json(data)
}
