export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'

export async function GET() {
  const supabase = createServiceClient()
  const tenantId = await getTenantId()

  let q = supabase.from('cardapio_itens').select('*').order('categoria').order('ordem')
  if (tenantId) q = (q as any).eq('tenant_id', tenantId)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ itens: data ?? [] })
}
