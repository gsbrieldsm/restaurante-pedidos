import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ETAPAS_VALIDAS = ['prospeccao', 'contato_ativo', 'agendar_demo', 'fechado', 'perdido']
const PLANOS_VALIDOS = ['starter', 'pro', 'business', 'enterprise']

// ── Autentica o parceiro via cookie ──────────────────────────────────────────
async function getParceiroId(): Promise<string | null> {
  const cookieStore = await cookies()
  const id = cookieStore.get('parceiro_auth')?.value
  if (!id) return null

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('parceiros_leads')
    .select('id, status')
    .eq('id', id)
    .single()

  return data?.status === 'aprovado' ? data.id : null
}

// ── GET — lista todos os leads do parceiro ────────────────────────────────────
export async function GET() {
  const parceiroId = await getParceiroId()
  if (!parceiroId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('parceiro_crm_leads')
    .select('*')
    .eq('parceiro_id', parceiroId)
    .order('criado_em', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ leads: data ?? [] })
}

// ── POST — cria novo lead ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const parceiroId = await getParceiroId()
  if (!parceiroId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { nome, celular, plano, etapa, notas } = await req.json().catch(() => ({}))

  if (!nome?.trim()) {
    return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('parceiro_crm_leads')
    .insert({
      parceiro_id: parceiroId,
      nome:    nome.trim(),
      celular: celular?.replace(/\D/g, '') || null,
      plano:   PLANOS_VALIDOS.includes(plano) ? plano : null,
      etapa:   ETAPAS_VALIDAS.includes(etapa) ? etapa : 'prospeccao',
      notas:   notas?.trim() || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, lead: data })
}

// ── PATCH — atualiza lead (etapa, notas, plano…) ─────────────────────────────
export async function PATCH(req: NextRequest) {
  const parceiroId = await getParceiroId()
  if (!parceiroId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { id, nome, celular, plano, etapa, notas } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })

  // Garante que o lead pertence ao parceiro autenticado
  const supabase = createServiceClient()
  const { data: existente } = await supabase
    .from('parceiro_crm_leads')
    .select('id')
    .eq('id', id)
    .eq('parceiro_id', parceiroId)
    .single()

  if (!existente) return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 })

  const updates: Record<string, unknown> = { atualizado_em: new Date().toISOString() }
  if (nome !== undefined)    updates.nome    = nome?.trim() || null
  if (celular !== undefined) updates.celular = celular?.replace(/\D/g, '') || null
  if (notas !== undefined)   updates.notas   = notas?.trim() || null
  if (plano !== undefined)   updates.plano   = PLANOS_VALIDOS.includes(plano) ? plano : null
  if (etapa !== undefined)   updates.etapa   = ETAPAS_VALIDAS.includes(etapa) ? etapa : undefined

  const { data, error } = await supabase
    .from('parceiro_crm_leads')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, lead: data })
}

// ── DELETE — remove lead ─────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const parceiroId = await getParceiroId()
  if (!parceiroId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('parceiro_crm_leads')
    .delete()
    .eq('id', id)
    .eq('parceiro_id', parceiroId) // garante ownership

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
