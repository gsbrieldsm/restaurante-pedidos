import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ── Mesma estrutura de tiers da página /parceiros ──────────────────────────
const TIERS = [
  { min: 1,  max: 4,        label: '1–4 clientes',   recorrente: 0.10 },
  { min: 5,  max: 9,        label: '5–9 clientes',   recorrente: 0.15 },
  { min: 10, max: 14,       label: '10–14 clientes', recorrente: 0.20 },
  { min: 15, max: 19,       label: '15–19 clientes', recorrente: 0.25 },
  { min: 20, max: Infinity, label: '20+ clientes',   recorrente: 0.30 },
]

const MENSALIDADE_BASE = 697
const VALOR_IMPL       = 2000
const COMISSAO_IMPL    = 0.30
const porImpl          = VALOR_IMPL * COMISSAO_IMPL // R$600

function getTier(n: number) {
  return TIERS.find((t) => n >= t.min && n <= t.max) ?? TIERS[TIERS.length - 1]
}

// PATCH /api/parceiros/painel — atualiza chave PIX do parceiro
export async function PATCH(req: Request) {
  const cookieStore = await cookies()
  const parceiroId  = cookieStore.get('parceiro_auth')?.value

  if (!parceiroId) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const { chave_pix } = await req.json() as { chave_pix: string }

  if (!chave_pix?.trim()) {
    return NextResponse.json({ error: 'Chave PIX inválida.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('parceiros_leads')
    .update({ chave_pix: chave_pix.trim() })
    .eq('id', parceiroId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// GET /api/parceiros/painel
export async function GET() {
  const cookieStore = await cookies()
  const parceiroId  = cookieStore.get('parceiro_auth')?.value

  if (!parceiroId) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Busca dados do parceiro
  const { data: parceiro, error } = await supabase
    .from('parceiros_leads')
    .select('id, nome, email, whatsapp, codigo_indicacao, status, criado_em, chave_pix')
    .eq('id', parceiroId)
    .single()

  if (error || !parceiro || parceiro.status !== 'aprovado') {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  // Busca restaurantes indicados por este parceiro
  const { data: indicados } = await supabase
    .from('tenants')
    .select('id, nome_restaurante, plano, plano_aceito_em, trial_expira_em, criado_em, status')
    .eq('indicado_por', parceiro.codigo_indicacao)
    .order('criado_em', { ascending: false })

  const todos   = indicados ?? []
  const ativos  = todos.filter((t) => t.plano_aceito_em !== null) // pagamento confirmado
  const tier    = ativos.length > 0 ? getTier(ativos.length) : null

  const comissaoImpl      = ativos.length * porImpl
  const recorrenteMensal  = tier ? ativos.length * MENSALIDADE_BASE * tier.recorrente : 0
  const projecaoAnual     = recorrenteMensal * 12 + comissaoImpl

  const restaurantes = todos.map((t) => ({
    id:              t.id,
    nome_restaurante: t.nome_restaurante,
    plano:           t.plano ?? 'starter',
    ativo:           t.plano_aceito_em !== null,
    plano_aceito_em: t.plano_aceito_em,
    trial_expira_em: t.trial_expira_em,
    criado_em:       t.criado_em,
    status:          t.status,
  }))

  return NextResponse.json({
    parceiro: {
      nome:             parceiro.nome,
      email:            parceiro.email,
      codigo_indicacao: parceiro.codigo_indicacao,
      criado_em:        parceiro.criado_em,
      chave_pix:        parceiro.chave_pix ?? null,
    },
    stats: {
      total_indicados:  todos.length,
      total_ativos:     ativos.length,
      tier:             tier ? { label: tier.label, recorrente: tier.recorrente } : null,
      comissao_impl:    comissaoImpl,
      recorrente_mensal: recorrenteMensal,
      projecao_anual:   projecaoAnual,
    },
    restaurantes,
  })
}
