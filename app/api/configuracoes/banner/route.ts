export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'

const DEFAULT_BRANDING = {
  restaurante_nome:     'Meu Restaurante',
  restaurante_logo_url: null,
  cor_primaria:         '#1A9B8A',
}

export async function GET(req: Request) {
  const supabase     = createServiceClient()
  const cookieStore  = await cookies()
  const headersList  = await headers()
  const { searchParams } = new URL(req.url)

  let tenantId: string | null = null

  // 1. Tenta pegar tenant_id do cookie (painel admin ou mesa autenticada)
  tenantId = cookieStore.get('tenant_id')?.value ?? null

  // 2. Fallback: tenta pelo slug do subdomínio (header x-tenant-slug do middleware)
  if (!tenantId) {
    const slug = headersList.get('x-tenant-slug')
    if (slug) {
      const { data } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', slug)
        .single()
      tenantId = data?.id ?? null
    }
  }

  // 3. Fallback: tenta pelo token da mesa (cliente via QR code)
  if (!tenantId) {
    const mesaToken = searchParams.get('mesa_token')
    if (mesaToken) {
      const { data } = await supabase
        .from('mesas')
        .select('tenant_id')
        .eq('qr_token', mesaToken)
        .single()
      tenantId = data?.tenant_id ?? null
    }
  }

  if (!tenantId) {
    return NextResponse.json({ banner: null, branding: DEFAULT_BRANDING })
  }

  const { data } = await supabase
    .from('configuracoes')
    .select('banner_ativo, banner_titulo, banner_subtitulo, banner_emoji, banner_estilo, banner_imagem_url, banner_imagem_url_mobile, restaurante_nome, restaurante_logo_url, cor_primaria, pix_chave')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!data) {
    return NextResponse.json({ banner: null, branding: DEFAULT_BRANDING })
  }

  return NextResponse.json({
    banner:   data,
    branding: {
      restaurante_nome:     data.restaurante_nome     ?? DEFAULT_BRANDING.restaurante_nome,
      restaurante_logo_url: data.restaurante_logo_url ?? null,
      cor_primaria:         data.cor_primaria         ?? DEFAULT_BRANDING.cor_primaria,
      pix_chave:            data.pix_chave            ?? null,
    },
  })
}
