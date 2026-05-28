export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET — todos os pedidos da sessão ativa
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { searchParams } = new URL(req.url)
  const sessaoId = searchParams.get('sessao_id')

  if (!sessaoId) {
    return NextResponse.json({ error: 'sessao_id obrigatório' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Valida que a sessão existe e está ativa
  const { data: sessao, error: sessaoError } = await supabase
    .from('sessoes_mesa')
    .select(`
      id, cliente_nome, mesas(numero, nome),
      is_delivery,
      delivery_nome, delivery_telefone, delivery_endereco, delivery_numero,
      delivery_complemento, delivery_bairro, delivery_cidade, delivery_uf,
      delivery_cep, delivery_taxa, delivery_distancia_km,
      delivery_forma_pagamento, delivery_status
    `)
    .eq('id', sessaoId)
    .eq('ativa', true)
    .single()

  if (sessaoError) {
    // Erro de banco (ex: coluna inexistente por migration não rodada) — não confundir com sessão inativa
    console.error('[conta] Erro ao buscar sessão:', sessaoError.message)
    return NextResponse.json({ error: 'Erro interno ao buscar sessão', detail: sessaoError.message }, { status: 500 })
  }

  if (!sessao) {
    return NextResponse.json({ error: 'Sessão inválida ou encerrada' }, { status: 403 })
  }

  // Busca todos os pedidos com itens
  const { data: pedidos, error } = await supabase
    .from('pedidos')
    .select('*, pedido_itens(*)')
    .eq('sessao_id', sessaoId)
    .not('status_geral', 'eq', 'cancelado')
    .order('criado_em', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const mesa       = sessao.mesas as unknown as { numero: number; nome: string | null }
  const isDelivery = (sessao as any).is_delivery === true

  return NextResponse.json({
    pedidos:      pedidos ?? [],
    cliente_nome: sessao.cliente_nome,
    mesa_numero:  mesa?.numero,
    mesa_nome:    mesa?.nome ?? null,
    // campos de delivery (presentes se is_delivery=true)
    is_delivery:               isDelivery,
    delivery_nome:             (sessao as any).delivery_nome             ?? null,
    delivery_telefone:         (sessao as any).delivery_telefone         ?? null,
    delivery_endereco:         (sessao as any).delivery_endereco         ?? null,
    delivery_numero:           (sessao as any).delivery_numero           ?? null,
    delivery_complemento:      (sessao as any).delivery_complemento      ?? null,
    delivery_bairro:           (sessao as any).delivery_bairro           ?? null,
    delivery_cidade:           (sessao as any).delivery_cidade           ?? null,
    delivery_uf:               (sessao as any).delivery_uf               ?? null,
    delivery_cep:              (sessao as any).delivery_cep              ?? null,
    delivery_taxa:             (sessao as any).delivery_taxa             ?? 0,
    delivery_distancia_km:     (sessao as any).delivery_distancia_km     ?? null,
    delivery_forma_pagamento:  (sessao as any).delivery_forma_pagamento  ?? null,
    delivery_status:           (sessao as any).delivery_status           ?? null,
  })
}
