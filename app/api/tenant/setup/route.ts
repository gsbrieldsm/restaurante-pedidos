import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/tenant'
import { randomBytes } from 'crypto'
import { getPlanoConfig } from '@/lib/planos'

// POST /api/tenant/setup — cria estrutura inicial para um novo tenant
// (mesas, configuração padrão)
export async function POST(req: Request) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const supabase = createServiceClient()

  // Descobre o plano atual do tenant para saber quantas mesas criar
  const { data: tenant } = await supabase
    .from('tenants')
    .select('plano')
    .eq('id', tenantId)
    .single()

  const planoConfig = getPlanoConfig(tenant?.plano)
  // Se o plano tem mesas: 0 (ilimitado/free), usa o valor do body ou 15 como padrão
  const limitePlano = planoConfig.mesas > 0 ? planoConfig.mesas : 15
  const qtd_mesas: number = body.qtd_mesas ?? limitePlano

  // Verifica se já tem mesas (evita setup duplo)
  const { count } = await supabase
    .from('mesas')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  if (count && count > 0) {
    return NextResponse.json({ ok: true, ja_configurado: true })
  }

  // Cria mesas conforme plano
  const mesas = Array.from({ length: qtd_mesas }, (_, i) => ({
    numero:      i + 1,
    capacidade:  4,
    status:      'livre',
    qr_token:    randomBytes(16).toString('hex'),
    tenant_id:   tenantId,
  }))

  const { error: errMesas } = await supabase.from('mesas').insert(mesas)
  if (errMesas) return NextResponse.json({ error: errMesas.message }, { status: 500 })

  // Cria configuração padrão
  await supabase.from('configuracoes').upsert({
    tenant_id:        tenantId,
    banner_ativo:     false,
    restaurante_nome: 'Meu Restaurante',
    cor_primaria:     '#1A9B8A',
  })

  return NextResponse.json({ ok: true, mesas_criadas: qtd_mesas })
}
