export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('configuracoes')
    .select('banner_ativo, banner_titulo, banner_subtitulo, banner_emoji, banner_estilo, banner_imagem_url, restaurante_nome, restaurante_logo_url, cor_primaria')
    .eq('id', 1)
    .single()

  if (error || !data) {
    return NextResponse.json({
      banner: null,
      branding: { restaurante_nome: 'Meu Restaurante', restaurante_logo_url: null, cor_primaria: '#1A9B8A' },
    })
  }

  return NextResponse.json({
    banner: data,
    branding: {
      restaurante_nome:     data.restaurante_nome     ?? 'Meu Restaurante',
      restaurante_logo_url: data.restaurante_logo_url ?? null,
      cor_primaria:         data.cor_primaria         ?? '#1A9B8A',
    },
  })
}
