export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'

// Valida autenticação — aceita mmu:{uuid} e o token legado
async function getTenantIdAutenticado(): Promise<string | null> {
  const cookieStore = await cookies()
  const authCookie  = cookieStore.get('admin_auth')?.value
  if (!authCookie) return null

  // Token legado (sem tenant) — retorna sentinela
  if (authCookie === 'mmu-admin-v1') return '__legado__'

  // Token moderno: mmu:{uuid}
  if (authCookie.startsWith('mmu:')) {
    return cookieStore.get('tenant_id')?.value ?? null
  }

  return null
}

// ── GET /api/admin/configuracoes ─────────────────────────────────────────────
export async function GET() {
  const tenantId = await getTenantIdAutenticado()
  if (!tenantId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Legado: usa id=1
  if (tenantId === '__legado__') {
    const { data, error } = await supabase
      .from('configuracoes')
      .select('*')
      .eq('id', 1)
      .single()
    if (error) return NextResponse.json({ config: null })
    return NextResponse.json({ config: data })
  }

  // Multi-tenant: busca pela tenant_id
  const { data } = await supabase
    .from('configuracoes')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  return NextResponse.json({ config: data ?? null })
}

// ── POST /api/admin/configuracoes ────────────────────────────────────────────
export async function POST(req: Request) {
  const tenantId = await getTenantIdAutenticado()
  if (!tenantId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body     = await req.json()
  const supabase = createServiceClient()

  const payload = {
    banner_ativo:         body.banner_ativo         ?? false,
    banner_titulo:        body.banner_titulo         ?? '',
    banner_subtitulo:     body.banner_subtitulo      ?? '',
    banner_emoji:         body.banner_emoji          ?? '🍽️',
    banner_estilo:        body.banner_estilo         ?? 'teal',
    banner_imagem_url:         body.banner_imagem_url          ?? null,
    banner_imagem_url_mobile:  body.banner_imagem_url_mobile   ?? null,
    restaurante_nome:     body.restaurante_nome      ?? 'Meu Restaurante',
    restaurante_logo_url: body.restaurante_logo_url  ?? null,
    cor_primaria:         body.cor_primaria          ?? '#1A9B8A',
    atualizado_em:        new Date().toISOString(),
  }

  let error

  if (tenantId === '__legado__') {
    // Legado: upsert na linha id=1
    ;({ error } = await supabase
      .from('configuracoes')
      .upsert({ id: 1, ...payload }))
  } else {
    // Multi-tenant: upsert por tenant_id
    ;({ error } = await supabase
      .from('configuracoes')
      .upsert(
        { tenant_id: tenantId, ...payload },
        { onConflict: 'tenant_id' }
      ))
  }

  if (error) {
    console.error('[configuracoes] erro ao salvar:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
