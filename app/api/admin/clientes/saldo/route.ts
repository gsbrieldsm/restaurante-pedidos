// GET  /api/admin/clientes/saldo                         — lista todos os clientes com carteira
// GET  /api/admin/clientes/saldo?cliente_id=xxx           — histórico de transações do cliente
// POST /api/admin/clientes/saldo                          — carrega ou estorna saldo

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'

async function autenticar(): Promise<string | null> {
  const cookieStore = await cookies()
  const token    = cookieStore.get('admin_auth')?.value
  const tenantId = cookieStore.get('tenant_id')?.value
  if (!token || !tenantId) return null
  const valido =
    token === 'mmu-admin-v1' ||
    /^mmu:[0-9a-f-]{36}$/.test(token)
  return valido ? tenantId : null
}

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const tenantId = await autenticar()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const clienteId = searchParams.get('cliente_id')

  // Histórico de transações de um cliente específico
  if (clienteId) {
    const { data: transacoes, error } = await supabase
      .from('clientes_saldo_transacoes')
      .select('id, tipo, valor, saldo_anterior, saldo_posterior, descricao, criado_em')
      .eq('tenant_id', tenantId)
      .eq('cliente_id', clienteId)
      .order('criado_em', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ transacoes: transacoes ?? [] })
  }

  // Lista todos os clientes com carteira
  const { data: clientes, error } = await supabase
    .from('clientes_saldo')
    .select('id, nome, telefone, saldo_disponivel, verificado, atualizado_em')
    .eq('tenant_id', tenantId)
    .order('saldo_disponivel', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const lista = clientes ?? []
  const totalEmCarteiras = lista.reduce((acc, c) => acc + Number(c.saldo_disponivel), 0)
  const totalVerificados = lista.filter((c) => c.verificado).length

  return NextResponse.json({
    clientes: lista,
    total_em_carteiras: totalEmCarteiras,
    total_verificados: totalVerificados,
  })
}

// ── POST — carrega ou estorna saldo ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  const tenantId = await autenticar()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })

  const { cliente_id, valor, tipo = 'credito', descricao } = body

  if (!cliente_id || !valor || valor <= 0) {
    return NextResponse.json({ error: 'cliente_id e valor obrigatórios.' }, { status: 422 })
  }
  if (!['credito', 'estorno'].includes(tipo)) {
    return NextResponse.json({ error: 'Tipo inválido.' }, { status: 422 })
  }

  const supabase = createServiceClient()

  const { data: cliente } = await supabase
    .from('clientes_saldo')
    .select('id, saldo_disponivel')
    .eq('id', cliente_id)
    .eq('tenant_id', tenantId)
    .single()

  if (!cliente) return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })

  const saldoAnterior  = Number(cliente.saldo_disponivel)
  const saldoPosterior = saldoAnterior + Number(valor)

  if (tipo === 'estorno' && saldoPosterior < 0) {
    return NextResponse.json({ error: 'Estorno maior que o saldo disponível.' }, { status: 422 })
  }

  const { data: atualizado, error: errUpdate } = await supabase
    .from('clientes_saldo')
    .update({ saldo_disponivel: saldoPosterior, atualizado_em: new Date().toISOString() })
    .eq('id', cliente_id)
    .eq('tenant_id', tenantId)
    .select('id, nome, telefone, saldo_disponivel, verificado')
    .single()

  if (errUpdate || !atualizado) {
    return NextResponse.json({ error: 'Erro ao atualizar saldo.' }, { status: 500 })
  }

  await supabase.from('clientes_saldo_transacoes').insert({
    tenant_id:       tenantId,
    cliente_id:      cliente_id,
    tipo,
    valor:           Number(valor),
    saldo_anterior:  saldoAnterior,
    saldo_posterior: saldoPosterior,
    descricao:       descricao || (tipo === 'credito' ? 'Recarga pelo admin' : 'Estorno pelo admin'),
  })

  return NextResponse.json({ ok: true, cliente: atualizado })
}
