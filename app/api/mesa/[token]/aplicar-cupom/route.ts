import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { codigo } = await req.json()
  if (!codigo?.trim()) return NextResponse.json({ error: 'Código obrigatório' }, { status: 400 })

  const supabase = createServiceClient()

  // Busca o tenant pela mesa
  const { data: mesa } = await supabase
    .from('mesas')
    .select('tenant_id')
    .eq('token', token)
    .single()

  if (!mesa) return NextResponse.json({ error: 'Mesa não encontrada' }, { status: 404 })

  // Valida o cupom
  const { data: promo } = await supabase
    .from('promocoes')
    .select('id, nome, desconto_tipo, desconto_valor, uso_atual, uso_maximo, data_inicio, data_fim')
    .eq('tenant_id', mesa.tenant_id)
    .eq('tipo', 'cupom')
    .eq('status', 'ativa')
    .eq('codigo_cupom', codigo.toUpperCase().trim())
    .single()

  if (!promo) return NextResponse.json({ error: 'Cupom inválido ou expirado' }, { status: 404 })

  // Verifica limite de usos
  if (promo.uso_maximo && promo.uso_atual >= promo.uso_maximo) {
    return NextResponse.json({ error: 'Cupom esgotado' }, { status: 400 })
  }

  // Verifica validade por data
  const hoje = new Date().toISOString().slice(0, 10)
  if (promo.data_inicio && hoje < promo.data_inicio) {
    return NextResponse.json({ error: 'Cupom ainda não é válido' }, { status: 400 })
  }
  if (promo.data_fim && hoje > promo.data_fim) {
    return NextResponse.json({ error: 'Cupom expirado' }, { status: 400 })
  }

  // Incrementa uso_atual
  await supabase
    .from('promocoes')
    .update({ uso_atual: promo.uso_atual + 1 })
    .eq('id', promo.id)

  return NextResponse.json({
    ok: true,
    cupom: {
      id: promo.id,
      nome: promo.nome,
      desconto_tipo: promo.desconto_tipo,
      desconto_valor: promo.desconto_valor,
    },
  })
}
