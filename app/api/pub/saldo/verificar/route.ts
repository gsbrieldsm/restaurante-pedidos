// POST /api/pub/saldo/verificar — valida OTP e marca telefone como verificado

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })

  const { cliente_id, codigo } = body

  if (!cliente_id || !codigo) {
    return NextResponse.json({ error: 'cliente_id e codigo são obrigatórios.' }, { status: 422 })
  }

  const supabase = createServiceClient()

  // Busca o cliente com o OTP
  const { data: cliente, error } = await supabase
    .from('clientes_saldo')
    .select('id, nome, telefone, saldo_disponivel, verificado, otp_code, otp_expira_em')
    .eq('id', cliente_id)
    .single()

  if (error || !cliente) {
    return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })
  }

  // Já estava verificado
  if (cliente.verificado) {
    return NextResponse.json({ cliente })
  }

  // Verifica se expirou
  if (!cliente.otp_expira_em || new Date(cliente.otp_expira_em) < new Date()) {
    return NextResponse.json({ error: 'Código expirado. Solicite um novo código.', code: 'otp_expirado' }, { status: 422 })
  }

  // Verifica se o código bate
  if (cliente.otp_code !== String(codigo).trim()) {
    return NextResponse.json({ error: 'Código inválido. Verifique e tente novamente.', code: 'otp_invalido' }, { status: 422 })
  }

  // Marca como verificado e limpa o OTP
  const { data: atualizado, error: errUpdate } = await supabase
    .from('clientes_saldo')
    .update({
      verificado:    true,
      otp_code:      null,
      otp_expira_em: null,
    })
    .eq('id', cliente_id)
    .select('id, nome, telefone, saldo_disponivel, verificado')
    .single()

  if (errUpdate || !atualizado) {
    return NextResponse.json({ error: 'Erro ao verificar cliente.' }, { status: 500 })
  }

  return NextResponse.json({ cliente: atualizado })
}
