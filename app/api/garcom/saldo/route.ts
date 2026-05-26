// GET  /api/garcom/saldo?q=telefone — busca clientes pelo telefone
// POST /api/garcom/saldo             — carrega saldo (crédito)
// POST /api/garcom/saldo (estorno)   — estorna pedido

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ── Auth: valida cookie admin_auth e retorna tenant_id + usuario_id ──────────
async function autenticar(): Promise<{ tenantId: string; usuarioId: string | null } | null> {
  const cookieStore = await cookies()
  const token       = cookieStore.get('admin_auth')?.value
  const tenantId    = cookieStore.get('tenant_id')?.value

  if (!token || !tenantId) return null

  const valido =
    token === 'mmu-admin-v1' ||
    /^mmu:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(token)

  if (!valido) return null

  // Extrai usuarioId do token se for mmu:<uuid>
  const match = token.match(/^mmu:(.+)$/)
  const usuarioId = match ? match[1] : null

  return { tenantId, usuarioId }
}

function normalizarTelefone(tel: string): string {
  return tel.replace(/\D/g, '')
}

// ── GET — busca clientes por telefone (parcial) ──────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await autenticar()
  if (!auth) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = normalizarTelefone(searchParams.get('q') ?? '')

  if (q.length < 4) {
    return NextResponse.json({ clientes: [] })
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('clientes_saldo')
    .select('id, nome, telefone, saldo_disponivel, atualizado_em')
    .eq('tenant_id', auth.tenantId)
    .ilike('telefone', `%${q}%`)
    .order('atualizado_em', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ clientes: data ?? [] })
}

// ── POST — carrega saldo ou faz estorno ─────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await autenticar()
  if (!auth) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })

  const { telefone, nome, valor, tipo = 'credito', descricao, cliente_id } = body

  if (!valor || valor <= 0) {
    return NextResponse.json({ error: 'Valor deve ser maior que zero.' }, { status: 422 })
  }

  const supabase = createServiceClient()
  let clienteId = cliente_id

  // Se não foi passado o cliente_id, busca ou cria pelo telefone
  if (!clienteId) {
    if (!telefone) {
      return NextResponse.json({ error: 'telefone ou cliente_id obrigatório.' }, { status: 422 })
    }

    const tel = normalizarTelefone(telefone)
    if (tel.length < 10) {
      return NextResponse.json({ error: 'Telefone inválido.' }, { status: 422 })
    }

    const { data: upserted, error: upsertError } = await supabase
      .from('clientes_saldo')
      .upsert(
        {
          tenant_id: auth.tenantId,
          telefone:  tel,
          nome:      nome?.trim() || null,
        },
        { onConflict: 'tenant_id,telefone', ignoreDuplicates: false }
      )
      .select('id, saldo_disponivel')
      .single()

    if (upsertError || !upserted) {
      return NextResponse.json({ error: 'Erro ao localizar cliente.' }, { status: 500 })
    }

    clienteId = upserted.id
  }

  // Lê saldo atual
  const { data: clienteAtual } = await supabase
    .from('clientes_saldo')
    .select('id, saldo_disponivel')
    .eq('id', clienteId)
    .eq('tenant_id', auth.tenantId)
    .single()

  if (!clienteAtual) {
    return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })
  }

  const saldoAnterior = Number(clienteAtual.saldo_disponivel)
  let   saldoPosterior: number

  if (tipo === 'credito') {
    saldoPosterior = saldoAnterior + Number(valor)
  } else if (tipo === 'estorno') {
    saldoPosterior = saldoAnterior + Number(valor)
  } else {
    return NextResponse.json({ error: 'Tipo inválido.' }, { status: 422 })
  }

  // Atualiza saldo
  const { data: clienteAtualizado, error: updateError } = await supabase
    .from('clientes_saldo')
    .update({ saldo_disponivel: saldoPosterior, atualizado_em: new Date().toISOString() })
    .eq('id', clienteId)
    .eq('tenant_id', auth.tenantId)
    .select('id, nome, telefone, saldo_disponivel')
    .single()

  if (updateError || !clienteAtualizado) {
    return NextResponse.json({ error: 'Erro ao atualizar saldo.' }, { status: 500 })
  }

  // Registra na transação
  await supabase
    .from('clientes_saldo_transacoes')
    .insert({
      tenant_id:       auth.tenantId,
      cliente_id:      clienteId,
      tipo,
      valor:           Number(valor),
      saldo_anterior:  saldoAnterior,
      saldo_posterior: saldoPosterior,
      descricao:       descricao || (tipo === 'credito' ? 'Recarga no caixa' : 'Estorno'),
      criado_por:      auth.usuarioId,
    })

  return NextResponse.json({ ok: true, cliente: clienteAtualizado })
}
