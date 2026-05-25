import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('suporte_videos')
    .select('id, titulo, descricao, youtube_id, categoria, ordem')
    .eq('ativo', true)
    .order('categoria')
    .order('ordem')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ videos: data ?? [] })
}
