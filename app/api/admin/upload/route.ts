import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const BUCKET = 'cardapio'

export async function POST(req: Request) {
  const supabase = createServiceClient()

  // Garante que o bucket existe
  const { data: buckets } = await supabase.storage.listBuckets()
  const existe = buckets?.some((b) => b.name === BUCKET)
  if (!existe) {
    await supabase.storage.createBucket(BUCKET, { public: true })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const nome = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(nome, buffer, { contentType: file.type, upsert: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(nome)

  return NextResponse.json({ url: urlData.publicUrl })
}
