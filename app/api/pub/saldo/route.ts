// POST /api/pub/saldo — identifica cliente por telefone e retorna/cria a carteira
// GET  /api/pub/saldo?cliente_id=xxx — consulta saldo atual

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ── Normaliza telefone: mantém apenas dígitos ────────────────────────────────
function normalizarTelefone(tel: string): string {
  return tel.replace(/\D/g, '')
}

// ── GET — consulta saldo atual de um cliente ─────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const clienteId = searchParams.get('cliente_id')

  if (!clienteId) {
    return NextResponse.json({ error: 'cliente_id obrigatório.' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('clientes_saldo')
    .select('id, nome, telefone, saldo_disponivel, atualizado_em')
    .eq('id', clienteId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })
  }

  return NextResponse.json({ cliente: data })
}

// ── POST — identifica cliente por (mesa_token + telefone), cria se não existir ─
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })

  const { mesa_token, telefone, nome } = body

  if (!mesa_token || !telefone) {
    return NextResponse.json({ error: 'mesa_token e telefone são obrigatórios.' }, { status: 422 })
  }

  const tel = normalizarTelefone(telefone)
  if (tel.length < 10) {
    return NextResponse.json({ error: 'Telefone inválido.' }, { status: 422 })
  }

  const supabase = createServiceClient()

  // Descobre o tenant pelo token da mesa
  const { data: mesa } = await supabase
    .from('mesas')
    .select('tenant_id')
    .eq('qr_token', mesa_token)
    .single()

  if (!mesa?.tenant_id) {
    return NextResponse.json({ error: 'Mesa não encontrada.' }, { status: 404 })
  }

  const tenantId = mesa.tenant_id

  // Verifica se o saldo está habilitado para este tenant
  const { data: config } = await supabase
    .from('configuracoes')
    .select('saldo_habilitado')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!config?.saldo_habilitado) {
    return NextResponse.json({ error: 'Saldo não habilitado.' }, { status: 403 })
  }

  // Upsert: cria ou retorna o cliente existente
  const { data: cliente, error } = await supabase
    .from('clientes_saldo')
    .upsert(
      {
        tenant_id: tenantId,
        telefone:  tel,
        nome:      nome?.trim() || null,
      },
      { onConflict: 'tenant_id,telefone', ignoreDuplicates: false }
    )
    .select('id, nome, telefone, saldo_disponivel, atualizado_em')
    .single()

  if (error || !cliente) {
    console.error('[pub/saldo] upsert error:', error)
    return NextResponse.json({ error: 'Erro ao identificar cliente.' }, { status: 500 })
  }

  return NextResponse.json({ cliente })
}
