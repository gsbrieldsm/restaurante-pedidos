import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/admin/meus-restaurantes
// Retorna todos os restaurantes em que o usuário logado tem acesso
export async function GET() {
  const cookieStore = await cookies()
  const authCookie  = cookieStore.get('admin_auth')?.value

  if (!authCookie || !authCookie.startsWith('mmu:')) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const currentId = authCookie.replace('mmu:', '')
  const supabase  = createServiceClient()

  // Busca e-mail do usuário atual
  const { data: atual } = await supabase
    .from('usuarios')
    .select('email')
    .eq('id', currentId)
    .single()

  if (!atual) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
  }

  // Busca todos os registros ativos com esse e-mail
  // Inclui convite_aceito = true E contas criadas diretamente (convite_aceito = false/null com senha_hash)
  const { data: registros } = await supabase
    .from('usuarios')
    .select('id, nome, cargo, tenant_id, convite_aceito, senha_hash')
    .eq('email', atual.email)
    .eq('ativo', true)
    .or('convite_aceito.eq.true,senha_hash.not.is.null')

  if (!registros || registros.length === 0) {
    return NextResponse.json({ restaurantes: [] })
  }

  const tenantIds = registros.map((r) => r.tenant_id).filter(Boolean) as string[]

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, nome_restaurante')
    .in('id', tenantIds)

  const tenantMap = Object.fromEntries(tenants?.map((t) => [t.id, t.nome_restaurante]) ?? [])

  // Tenant ativo no momento
  const tenantAtual = cookieStore.get('tenant_id')?.value

  const restaurantes = registros.map((r) => ({
    usuario_id:      r.id,
    cargo:           r.cargo,
    tenant_id:       r.tenant_id,
    nome_restaurante: r.tenant_id ? (tenantMap[r.tenant_id] ?? 'Restaurante') : 'Restaurante',
    ativo_agora:     r.tenant_id === tenantAtual,
  }))

  return NextResponse.json({ restaurantes })
}
