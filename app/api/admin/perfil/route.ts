export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { obterTenantIdAutenticado } from '@/lib/auth-session'

export async function GET() {
  const tenantId = await obterTenantIdAutenticado()
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
