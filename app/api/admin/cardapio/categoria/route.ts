export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/tenant'

// PATCH — renomeia uma categoria inteira (atualiza todos os itens do tenant)
export async function PATCH(req: Request) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { categoria_antiga, categoria_nova } = await req.json() as {
    categoria_antiga: string
    categoria_nova: string
  }

  if (!categoria_antiga?.trim() || !categoria_nova?.trim()) {
    return NextResponse.json({ error: 'Nomes inválidos' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('cardapio_itens')
    .update({ categoria: categoria_nova.trim() })
    .eq('tenant_id', tenantId)
    .eq('categoria', categoria_antiga.trim())

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
