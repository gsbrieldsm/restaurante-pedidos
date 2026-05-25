import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function autenticar() {
  const cookieStore = await cookies()
  return cookieStore.get('superadmin_auth')?.value === 'sa-ok'
}

// GET — lista todos (inclusive inativos)
export async function GET() {
  if (!await autenticar()) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('suporte_videos')
    .select('*')
    .order('categoria')
    .order('ordem')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ videos: data ?? [] })
}

// POST — adiciona vídeo
export async function POST(req: NextRequest) {
  if (!await autenticar()) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { titulo, descricao, youtube_id, categoria, ordem } = await req.json()

  if (!titulo?.trim() || !youtube_id?.trim()) {
    return NextResponse.json({ error: 'Título e YouTube ID são obrigatórios.' }, { status: 400 })
  }

  // Aceita URL completa ou só o ID
  const id = extrairYoutubeId(youtube_id.trim())
  if (!id) return NextResponse.json({ error: 'YouTube ID ou URL inválido.' }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('suporte_videos')
    .insert({
      titulo:     titulo.trim(),
      descricao:  descricao?.trim() || null,
      youtube_id: id,
      categoria:  categoria?.trim() || 'geral',
      ordem:      ordem ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, video: data })
}

// PATCH — edita ou reordena
export async function PATCH(req: NextRequest) {
  if (!await autenticar()) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { id, ...campos } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 422 })

  // Se veio youtube_id, normaliza
  if (campos.youtube_id) {
    const extraido = extrairYoutubeId(campos.youtube_id.trim())
    if (!extraido) return NextResponse.json({ error: 'YouTube ID ou URL inválido.' }, { status: 400 })
    campos.youtube_id = extraido
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('suporte_videos')
    .update(campos)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, video: data })
}

// DELETE — remove vídeo
export async function DELETE(req: NextRequest) {
  if (!await autenticar()) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 422 })

  const supabase = createServiceClient()
  const { error } = await supabase.from('suporte_videos').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function extrairYoutubeId(input: string): string | null {
  // Já é um ID curto (11 chars alfanuméricos + - _)
  if (/^[\w-]{11}$/.test(input)) return input

  try {
    const url = new URL(input)
    // youtu.be/ID
    if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('?')[0]
    // youtube.com/watch?v=ID
    const v = url.searchParams.get('v')
    if (v) return v
    // youtube.com/embed/ID
    const match = url.pathname.match(/\/embed\/([\w-]{11})/)
    if (match) return match[1]
  } catch {}

  return null
}
