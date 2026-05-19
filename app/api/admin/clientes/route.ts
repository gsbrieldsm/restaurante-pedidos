import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createServiceClient()

  // Sessões completas (histórico de acessos)
  const { data: sessoes, error: errSessoes } = await supabase
    .from('sessoes_mesa')
    .select('id, cliente_nome, cliente_whatsapp, aberta_em, fechada_em, ativa, mesas(numero)')
    .order('aberta_em', { ascending: false })

  if (errSessoes) {
    return NextResponse.json({ error: errSessoes.message }, { status: 500 })
  }

  // Pedidos para agregar por cliente
  const { data: pedidos, error: errPedidos } = await supabase
    .from('pedidos')
    .select('cliente_nome, cliente_whatsapp, total, criado_em')
    .not('status_geral', 'eq', 'cancelado')

  if (errPedidos) {
    return NextResponse.json({ error: errPedidos.message }, { status: 500 })
  }

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

  const clientes = Array.from(mapa.values())
    .sort((a, b) => b.total_consumido - a.total_consumido)

  return NextResponse.json({ sessoes: sessoes ?? [], clientes })
}
