export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/pub/[slug]/sessao
 * Cria comanda via acesso público pelo subdomínio (sem QR code).
 * Recebe: { mesa_numero, cliente_nome, cliente_whatsapp? }
 * Retorna: { token, sessao_id, cliente_nome }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const body = await req.json()
  const { mesa_numero, cliente_nome, cliente_whatsapp } = body

  if (!cliente_nome?.trim()) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  }
  if (!mesa_numero) {
    return NextResponse.json({ error: 'Número da mesa é obrigatório' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Resolve tenant pelo slug
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .single()

  if (tenantError || !tenant) {
    return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 })
  }

  // Encontra a mesa pelo tenant + número
  const { data: mesa, error: mesaError } = await supabase
    .from('mesas')
    .select('id, qr_token, tenant_id')
    .eq('tenant_id', tenant.id)
    .eq('numero', Number(mesa_numero))
    .single()

  if (mesaError || !mesa) {
    return NextResponse.json({ error: `Mesa ${mesa_numero} não encontrada` }, { status: 404 })
  }

  // Cria comanda
  const { data: sessao, error: sessaoError } = await supabase
    .from('sessoes_mesa')
    .insert({
      mesa_id:          mesa.id,
      cliente_nome:     cliente_nome.trim(),
      cliente_whatsapp: cliente_whatsapp?.replace(/\D/g, '') || null,
      ativa:            true,
      tenant_id:        mesa.tenant_id,
    })
    .select()
    .single()

  if (sessaoError || !sessao) {
    return NextResponse.json({ error: 'Erro ao abrir comanda' }, { status: 500 })
  }

  return NextResponse.json({
    token:        mesa.qr_token,
    sessao_id:    sessao.id,
    cliente_nome: sessao.cliente_nome,
  })
}

/**
 * GET /api/pub/[slug]/sessao
 * Retorna dados do restaurante (branding + mesas disponíveis) para o formulário.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = createServiceClient()

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .single()

  if (error || !tenant) {
    return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 })
  }

  // Branding
  const { data: config } = await supabase
    .from('configuracoes')
    .select('restaurante_nome, restaurante_logo_url, cor_primaria, banner_ativo, banner_titulo, banner_subtitulo, banner_emoji, banner_estilo, banner_imagem_url, banner_imagem_url_mobile')
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  // Mesas ativas
  const { data: mesas } = await supabase
    .from('mesas')
    .select('numero')
    .eq('tenant_id', tenant.id)
    .eq('ativa', true)
    .order('numero', { ascending: true })

  return NextResponse.json({
    branding: {
      restaurante_nome:     config?.restaurante_nome     ?? 'Restaurante',
      restaurante_logo_url: config?.restaurante_logo_url ?? null,
      cor_primaria:         config?.cor_primaria         ?? '#1A9B8A',
    },
    banner: config?.banner_ativo ? {
      banner_ativo:           config.banner_ativo,
      banner_titulo:          config.banner_titulo,
      banner_subtitulo:       config.banner_subtitulo,
      banner_emoji:           config.banner_emoji,
      banner_estilo:          config.banner_estilo,
      banner_imagem_url:      config.banner_imagem_url,
      banner_imagem_url_mobile: config.banner_imagem_url_mobile,
    } : null,
    mesas: (mesas ?? []).map((m) => m.numero),
  })
}
