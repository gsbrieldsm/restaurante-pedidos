export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/cron/keep-alive
 * Disparada pela Vercel Cron a cada poucos dias para gerar atividade
 * no Supabase e evitar a pausa automática por inatividade (plano free).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase.from('tenants').select('id').limit(1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, pingado_em: new Date().toISOString() })
}
