import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function autenticar() {
  const cookieStore = await cookies()
  return cookieStore.get('superadmin_auth')?.value === 'sa-ok'
}

// GET /api/superadmin/pagamentos?parceiro_id=X — lista pagamentos de um parceiro
export async function GET(req: NextRequest) {
  if (!await autenticar()) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const parceiro_id = req.nextUrl.searchParams.get('parceiro_id')
  if (!parceiro_id) {
    return NextResponse.json({ error: 'parceiro_id obrigatório.' }, { status: 422 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('pagamentos_parceiros')
    .select('*')
    .eq('parceiro_id', parceiro_id)
    .order('pago_em', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ pagamentos: data ?? [] })
}

// POST /api/superadmin/pagamentos — registra um pagamento
export async function POST(req: NextRequest) {
  if (!await autenticar()) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { parceiro_id, tenant_id, tipo, valor, referencia, observacao } = await req.json()

  if (!parceiro_id || !tipo || !valor || !referencia) {
    return NextResponse.json({ error: 'Campos obrigatórios: parceiro_id, tipo, valor, referencia.' }, { status: 422 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('pagamentos_parceiros')
    .insert({ parceiro_id, tenant_id: tenant_id ?? null, tipo, valor, referencia, observacao: observacao ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, pagamento: data })
}

// DELETE /api/superadmin/pagamentos?id=X — desfaz um pagamento
export async function DELETE(req: NextRequest) {
  if (!await autenticar()) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obrigatório.' }, { status: 422 })

  const supabase = createServiceClient()
  const { error } = await supabase.from('pagamentos_parceiros').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
