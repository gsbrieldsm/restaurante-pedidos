export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/tenant'

// GET — cardápio ativo do tenant para o totem
export async function GET() {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ itens: [] })

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('cardapio_itens')
    .select('id, nome, descricao, preco, categoria, estacao, foto_url, tempo_preparo_min, disponivel, destaque')
    .eq('tenant_id', tenantId)
    .eq('disponivel', true)
    .order('categoria')
    .order('nome')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ itens: data ?? [] })
}
