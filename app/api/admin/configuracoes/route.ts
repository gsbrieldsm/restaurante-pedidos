export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get('admin_auth')?.value
  if (!authCookie || authCookie !== 'mmu-admin-v1') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('configuracoes')
    .upsert({
      id: 1,
      banner_ativo:         body.banner_ativo,
      banner_titulo:        body.banner_titulo,
      banner_subtitulo:     body.banner_subtitulo,
      banner_emoji:         body.banner_emoji,
      banner_estilo:        body.banner_estilo,
      banner_imagem_url:    body.banner_imagem_url ?? null,
      restaurante_nome:     body.restaurante_nome     ?? 'Meu Restaurante',
      restaurante_logo_url: body.restaurante_logo_url ?? null,
      cor_primaria:         body.cor_primaria         ?? '#1A9B8A',
      atualizado_em:        new Date().toISOString(),
    })

  if (error) {
    console.error('Erro ao salvar configurações:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get('admin_auth')?.value
  if (!authCookie || authCookie !== 'mmu-admin-v1') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('configuracoes')
    .select('*')
    .eq('id', 1)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data })
}
