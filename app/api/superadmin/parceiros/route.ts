import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function autenticar() {
  const cookieStore = await cookies()
  return cookieStore.get('superadmin_auth')?.value === 'sa-ok'
}

// Gera código de indicação legível: ex. GABRIEL-A3B2
function gerarCodigo(nome: string): string {
  const base = nome
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
  const sufixo = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${base}-${sufixo}`
}

// GET /api/superadmin/parceiros — lista parceiros + restaurantes indicados
export async function GET() {
  if (!await autenticar()) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const { data: parceiros, error } = await supabase
    .from('parceiros_leads')
    .select('*')
    .order('criado_em', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Busca os tenants vinculados a cada parceiro aprovado
  const codigos = (parceiros ?? [])
    .map(p => p.codigo_indicacao)
    .filter(Boolean) as string[]

  let tenantsPorCodigo: Record<string, { id: string; nome_restaurante: string; plano: string; plano_aceito_em: string | null; criado_em: string }[]> = {}

  if (codigos.length > 0) {
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, nome_restaurante, plano, plano_aceito_em, criado_em, indicado_por')
      .in('indicado_por', codigos)

    for (const t of tenants ?? []) {
      if (!t.indicado_por) continue
      if (!tenantsPorCodigo[t.indicado_por]) tenantsPorCodigo[t.indicado_por] = []
      tenantsPorCodigo[t.indicado_por].push(t)
    }
  }

  const resultado = (parceiros ?? []).map(p => ({
    ...p,
    restaurantes_indicados: p.codigo_indicacao
      ? (tenantsPorCodigo[p.codigo_indicacao] ?? [])
      : [],
  }))

  return NextResponse.json({ parceiros: resultado })
}

// DELETE /api/superadmin/parceiros?id=xxx — remove parceiro permanentemente
export async function DELETE(req: NextRequest) {
  if (!await autenticar()) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 422 })

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('parceiros_leads')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// PATCH /api/superadmin/parceiros — atualiza status/notas; gera código ao aprovar
export async function PATCH(req: NextRequest) {
  if (!await autenticar()) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { id, status, notas } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 422 })

  const supabase = createServiceClient()

  // Busca dados atuais do parceiro
  const { data: parceiro } = await supabase
    .from('parceiros_leads')
    .select('nome, codigo_indicacao, status')
    .eq('id', id)
    .single()

  const updates: Record<string, string | null> = {}
  if (status) updates.status = status
  if (notas !== undefined) updates.notas = notas

  // Gera código ao aprovar (se ainda não tiver)
  if (status === 'aprovado' && parceiro && !parceiro.codigo_indicacao) {
    let codigo = gerarCodigo(parceiro.nome)
    // Garante unicidade
    const { data: existe } = await supabase
      .from('parceiros_leads')
      .select('id')
      .eq('codigo_indicacao', codigo)
      .single()
    if (existe) codigo = gerarCodigo(parceiro.nome + Date.now())
    updates.codigo_indicacao = codigo
  }

  const { data: atualizado, error } = await supabase
    .from('parceiros_leads')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, parceiro: atualizado })
}
