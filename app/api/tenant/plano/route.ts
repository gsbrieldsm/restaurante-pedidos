import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

const PLANOS_VALIDOS = ['starter', 'pro', 'business', 'enterprise']

// POST /api/tenant/plano — inicia free trial de 7 dias com o plano escolhido
export async function POST(req: Request) {
  const cookieStore = await cookies()
  const tenantId = cookieStore.get('tenant_id')?.value

  if (!tenantId) {
    return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const plano = PLANOS_VALIDOS.includes(body.plano) ? body.plano : 'pro'

  const agora    = new Date()
  const expira   = new Date(agora)
  expira.setDate(expira.getDate() + 7)

  const supabase = createServiceClient()

  const { data: tenant, error } = await supabase
    .from('tenants')
    .update({
      status:          'ativo',
      plano,
      plano_aceito_em: agora.toISOString(),
      trial_expira_em: expira.toISOString(),
    })
    .eq('id', tenantId)
    .select('id, slug')
    .single()

  if (error || !tenant) {
    return NextResponse.json({ error: 'Erro ao ativar conta.' }, { status: 500 })
  }

  const resp = NextResponse.json({ ok: true, slug: tenant.slug, trial_expira_em: expira.toISOString() })

  // Cookie legível pelo middleware para checagem sem DB
  resp.cookies.set('trial_expira_em', expira.toISOString(), {
    httpOnly: false,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 8, // 8 dias (1 dia de margem)
    path:     '/',
  })

  return resp
}
