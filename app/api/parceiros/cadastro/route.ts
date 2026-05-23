import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// POST /api/parceiros/cadastro — rota pública, salva lead do programa de parceiros
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })

  const { nome, email, whatsapp, cidade, como } = body

  if (!nome?.trim() || !email?.trim() || !whatsapp?.trim()) {
    return NextResponse.json({ error: 'Nome, e-mail e WhatsApp são obrigatórios.' }, { status: 422 })
  }

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('parceiros_leads')
    .insert({
      nome:     nome.trim(),
      email:    email.trim().toLowerCase(),
      whatsapp: whatsapp.replace(/\D/g, ''),
      cidade:   cidade?.trim() || null,
      como:     como || null,
      status:   'novo',
    })

  if (error) {
    console.error('[parceiros/cadastro]', error)
    return NextResponse.json({ error: 'Erro ao salvar cadastro.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
