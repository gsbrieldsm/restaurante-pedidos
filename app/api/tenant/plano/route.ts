import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// POST /api/tenant/plano — aceita o plano e ativa o tenant
export async function POST() {
  const cookieStore = await cookies()
  const tenantId = cookieStore.get('tenant_id')?.value

  if (!tenantId) {
    return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const { data: tenant, error } = await supabase
    .from('tenants')
    .update({ status: 'ativo', plano_aceito_em: new Date().toISOString() })
    .eq('id', tenantId)
    .select('id, slug')
    .single()

  if (error || !tenant) {
    return NextResponse.json({ error: 'Erro ao ativar conta.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, slug: tenant.slug })
}
