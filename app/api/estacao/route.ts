export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import type { EstacaoTipo } from '@/lib/supabase/types'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const estacao = searchParams.get('estacao') as EstacaoTipo | null

  if (!estacao) {
    return NextResponse.json({ error: 'Estação obrigatória' }, { status: 400 })
  }

  const supabase  = createServiceClient()
  const tenantId  = await getTenantId()

  let q = supabase
    .from('view_fila_estacoes')
    .select('*')
    .eq('estacao', estacao)
    .order('criado_em', { ascending: true })

  if (tenantId) q = (q as any).eq('tenant_id', tenantId)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ itens: data })
}
