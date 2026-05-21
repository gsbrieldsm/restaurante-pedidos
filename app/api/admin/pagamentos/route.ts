export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export type FormaPagamento = 'dinheiro' | 'pix' | 'debito' | 'credito'

// POST — registra pagamento e fecha a comanda (sessão individual)
export async function POST(req: Request) {
  const supabase = createServiceClient()
  const { sessao_id, forma, valor } = await req.json() as {
    sessao_id: string
    forma: FormaPagamento
    valor: number
  }

  if (!sessao_id || !forma || valor == null) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Busca a comanda
  const { data: sessao, error: errSessao } = await supabase
    .from('sessoes_mesa')
    .select('id, cliente_nome, mesa_id')
    .eq('id', sessao_id)
    .eq('ativa', true)
    .single()

  if (errSessao || !sessao) {
    console.error('[pagamentos] comanda não encontrada:', errSessao?.message)
    return NextResponse.json({ error: 'Comanda não encontrada ou já encerrada' }, { status: 404 })
  }

  // Numero da mesa
  const { data: mesa } = await supabase
    .from('mesas')
    .select('numero')
    .eq('id', sessao.mesa_id)
    .single()

  // Registra pagamento
  const { error: errPag } = await supabase
    .from('pagamentos')
    .insert({
      sessao_id:    sessao.id,
      mesa_id:      sessao.mesa_id,
      mesa_numero:  mesa?.numero ?? 0,
      cliente_nome: sessao.cliente_nome,
      forma,
      valor,
    })

  if (errPag) {
    return NextResponse.json({ error: errPag.message }, { status: 500 })
  }

  // Fecha apenas esta comanda
  await supabase
    .from('sessoes_mesa')
    .update({ ativa: false, fechada_em: new Date().toISOString() })
    .eq('id', sessao.id)

  // Verifica se ainda há outras comandas ativas nesta mesa
  const { data: outrasAtivas } = await supabase
    .from('sessoes_mesa')
    .select('id')
    .eq('mesa_id', sessao.mesa_id)
    .eq('ativa', true)

  // Só libera a mesa se não tiver mais ninguém
  if (!outrasAtivas || outrasAtivas.length === 0) {
    await supabase.from('mesas').update({ status: 'livre' }).eq('id', sessao.mesa_id)
  }

  return NextResponse.json({ ok: true })
}

// GET — totais por forma de pagamento (com filtro de período)
export async function GET(req: Request) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const periodo = searchParams.get('periodo') ?? 'hoje'

  const agora = new Date()
  const inicio = new Date()
  if (periodo === 'hoje') {
    inicio.setHours(0, 0, 0, 0)
  } else if (periodo === 'semana') {
    inicio.setDate(agora.getDate() - 7)
    inicio.setHours(0, 0, 0, 0)
  } else {
    inicio.setDate(1)
    inicio.setHours(0, 0, 0, 0)
  }

  const { data, error } = await supabase
    .from('pagamentos')
    .select('forma, valor, criado_em, mesa_numero, cliente_nome')
    .gte('criado_em', inicio.toISOString())
    .order('criado_em', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const pagamentos = data ?? []
  const totaisPorForma = { dinheiro: 0, pix: 0, debito: 0, credito: 0 } as Record<string, number>
  for (const p of pagamentos) {
    totaisPorForma[p.forma] = (totaisPorForma[p.forma] ?? 0) + p.valor
  }

  return NextResponse.json({
    pagamentos,
    totais: totaisPorForma,
    total_geral: pagamentos.reduce((acc, p) => acc + p.valor, 0),
  })
}
