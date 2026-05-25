export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'

export async function GET() {
  const supabase = createServiceClient()
  const tenantId = await getTenantId()

  // Sessões completas (histórico de acessos)
  let qSessoes = supabase
    .from('sessoes_mesa')
    .select('id, cliente_nome, cliente_whatsapp, aberta_em, fechada_em, ativa, mesas(numero)')
    .order('aberta_em', { ascending: false })
  if (tenantId) qSessoes = (qSessoes as any).eq('tenant_id', tenantId)

  const { data: sessoes, error: errSessoes } = await qSessoes
  if (errSessoes) return NextResponse.json({ error: errSessoes.message }, { status: 500 })

  // Pedidos para agregar por cliente
  let qPedidos = supabase
    .from('pedidos')
    .select('cliente_nome, cliente_whatsapp, total, criado_em')
    .not('status_geral', 'eq', 'cancelado')
  if (tenantId) qPedidos = (qPedidos as any).eq('tenant_id', tenantId)

  const { data: pedidos, error: errPedidos } = await qPedidos
  if (errPedidos) return NextResponse.json({ error: errPedidos.message }, { status: 500 })

  // Agregar por chave: whatsapp (se tiver) ou nome normalizado
  const mapa = new Map<string, {
    chave: string
    cliente_nome: string
    cliente_whatsapp: string | null
    total_consumido: number
    total_pedidos: number
    ultimo_pedido_em: string
  }>()

  for (const p of pedidos ?? []) {
    const chave = p.cliente_whatsapp?.replace(/\D/g, '') || p.cliente_nome.toLowerCase().trim()
    const existente = mapa.get(chave)
    if (existente) {
      existente.total_consumido += p.total ?? 0
      existente.total_pedidos += 1
      if (p.criado_em > existente.ultimo_pedido_em) {
        existente.ultimo_pedido_em = p.criado_em
        // atualiza nome para o mais recente
        existente.cliente_nome = p.cliente_nome
        if (p.cliente_whatsapp) existente.cliente_whatsapp = p.cliente_whatsapp
      }
    } else {
      mapa.set(chave, {
        chave,
        cliente_nome: p.cliente_nome,
        cliente_whatsapp: p.cliente_whatsapp,
        total_consumido: p.total ?? 0,
        total_pedidos: 1,
        ultimo_pedido_em: p.criado_em,
      })
    }
  }

  // Enriquecer clientes de pedidos com contagem de visitas das sessões
  const visitasPorChave = new Map<string, number>()
  for (const s of sessoes ?? []) {
    const chave = s.cliente_whatsapp?.replace(/\D/g, '') || s.cliente_nome?.toLowerCase().trim()
    if (chave) visitasPorChave.set(chave, (visitasPorChave.get(chave) ?? 0) + 1)
  }

  const clientes = Array.from(mapa.values())
    .sort((a, b) => b.total_consumido - a.total_consumido)
    .map(c => ({ ...c, total_visitas: visitasPorChave.get(c.chave) ?? 1 }))

  // Clientes únicos = union de chaves de pedidos + sessões (mesmo sem pedido)
  const chavesUnicas = new Set([
    ...Array.from(mapa.keys()),
    ...Array.from(visitasPorChave.keys()),
  ])

  // Sessões enriquecidas com número de visita do cliente
  const contadorVisitas = new Map<string, number>()
  const sessoesEnriquecidas = [...(sessoes ?? [])]
    .reverse() // da mais antiga para mais nova para contar ordem
    .map(s => {
      const chave = s.cliente_whatsapp?.replace(/\D/g, '') || s.cliente_nome?.toLowerCase().trim() || ''
      const visita = (contadorVisitas.get(chave) ?? 0) + 1
      contadorVisitas.set(chave, visita)
      return { ...s, numero_visita: visita, total_visitas: visitasPorChave.get(chave) ?? visita }
    })
    .reverse() // volta à ordem original (mais recente primeiro)

  return NextResponse.json({
    sessoes: sessoesEnriquecidas,
    clientes,
    clientes_unicos: chavesUnicas.size,
  })
}
