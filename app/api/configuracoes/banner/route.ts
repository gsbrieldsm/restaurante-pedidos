import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('configuracoes')
    .select('banner_ativo, banner_titulo, banner_subtitulo, banner_emoji, banner_estilo')
    .eq('id', 1)
    .single()

  if (error || !data) {
    return NextResponse.json({ banner: null })
  }

  return NextResponse.json({ banner: data })
}
