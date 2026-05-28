// POST /api/pub/saldo           — identifica cliente por telefone (envia OTP se 1ª vez)
// POST /api/pub/saldo/verificar — valida OTP e marca telefone como verificado
// GET  /api/pub/saldo?cliente_id=xxx — consulta saldo atual

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { enviarOTPVerificacao } from '@/lib/zapi'

export const dynamic = 'force-dynamic'

function normalizarTelefone(tel: string): string {
  return tel.replace(/\D/g, '')
}

function gerarOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000)) // 6 dígitos
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
    .select('id, nome, telefone, saldo_disponivel, verificado, atualizado_em')
    .eq('id', clienteId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })
  }

  return NextResponse.json({ cliente: data })
}

// ── POST — identifica cliente por (mesa_token + telefone) ────────────────────
// Retorna { cliente } se já verificado
// Retorna { precisa_verificar: true, cliente_id } se novo ou não verificado → envia OTP
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

  // Descobre o tenant e nome do restaurante pelo token da mesa
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
    .select('saldo_habilitado, restaurante_nome')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!config?.saldo_habilitado) {
    return NextResponse.json({ error: 'Saldo não habilitado.' }, { status: 403 })
  }

  // Busca ou cria o cliente
  const { data: clienteExistente } = await supabase
    .from('clientes_saldo')
    .select('id, nome, telefone, saldo_disponivel, verificado, otp_expira_em')
    .eq('tenant_id', tenantId)
    .eq('telefone', tel)
    .maybeSingle()

  // TODO: OTP via WhatsApp ainda não está ativo — entra direto pelo telefone.
  // Quando o WhatsApp estiver configurado, reativar o fluxo de verificação.

  if (clienteExistente) {
    // Cliente existente — atualiza nome se necessário e retorna direto
    const nomeAtualizado = nome?.trim() || clienteExistente.nome
    if (nome?.trim() && !clienteExistente.nome) {
      await supabase
        .from('clientes_saldo')
        .update({ nome: nomeAtualizado, verificado: true })
        .eq('id', clienteExistente.id)
    }

    return NextResponse.json({
      cliente: {
        ...clienteExistente,
        nome: nomeAtualizado,
      }
    })
  }

  // Novo cliente — cria já marcado como verificado (sem OTP por enquanto)
  const { data: criado, error: errCriado } = await supabase
    .from('clientes_saldo')
    .upsert(
      {
        tenant_id:  tenantId,
        telefone:   tel,
        nome:       nome?.trim() || null,
        verificado: true,
      },
      { onConflict: 'tenant_id,telefone', ignoreDuplicates: false }
    )
    .select('id, nome, telefone, saldo_disponivel')
    .single()

  if (errCriado || !criado) {
    console.error('[pub/saldo] erro ao criar cliente:', errCriado)
    return NextResponse.json({ error: 'Erro ao cadastrar cliente.' }, { status: 500 })
  }

  return NextResponse.json({ cliente: criado })
}
