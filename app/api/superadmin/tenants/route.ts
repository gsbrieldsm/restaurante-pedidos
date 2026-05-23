export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

async function checkAuth() {
  const cookieStore = await cookies()
  return cookieStore.get('superadmin_auth')?.value === 'sa-ok'
}

export async function GET() {
  if (!await checkAuth()) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Busca todos os tenants com contagens
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id, slug, nome, nome_restaurante, email, status, plano, plano_aceito_em, criado_em')
    .order('criado_em', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Conta mesas e pedidos por tenant
  const ids = (tenants ?? []).map((t) => t.id)

  const [{ data: mesas }, { data: pedidos }, { data: sessoes }] = await Promise.all([
    supabase.from('mesas').select('tenant_id').in('tenant_id', ids),
    supabase.from('pedidos').select('tenant_id, total').in('tenant_id', ids),
    supabase.from('sessoes_mesa').select('tenant_id').in('tenant_id', ids),
  ])

  const mesasPorTenant: Record<string, number> = {}
  const pedidosPorTenant: Record<string, number> = {}
  const faturamentoPorTenant: Record<string, number> = {}
  const sessoesPorTenant: Record<string, number> = {}

  for (const m of mesas ?? []) {
    mesasPorTenant[m.tenant_id] = (mesasPorTenant[m.tenant_id] ?? 0) + 1
  }
  for (const p of pedidos ?? []) {
    pedidosPorTenant[p.tenant_id] = (pedidosPorTenant[p.tenant_id] ?? 0) + 1
    faturamentoPorTenant[p.tenant_id] = (faturamentoPorTenant[p.tenant_id] ?? 0) + (p.total ?? 0)
  }
  for (const s of sessoes ?? []) {
    sessoesPorTenant[s.tenant_id] = (sessoesPorTenant[s.tenant_id] ?? 0) + 1
  }

  const resultado = (tenants ?? []).map((t) => ({
    ...t,
    total_mesas: mesasPorTenant[t.id] ?? 0,
    total_pedidos: pedidosPorTenant[t.id] ?? 0,
    faturamento_total: faturamentoPorTenant[t.id] ?? 0,
    total_sessoes: sessoesPorTenant[t.id] ?? 0,
  }))

  return NextResponse.json({ tenants: resultado })
}

// PATCH — atualiza status de um tenant (ativo/suspenso)
export async function PATCH(req: Request) {
  if (!await checkAuth()) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id, status, acao } = await req.json() as {
    id: string
    status?: 'ativo' | 'suspenso'
    acao?: 'setup'
  }
  const supabase = createServiceClient()

  // ── Ação: forçar setup (cria mesas + config para tenants antigos) ──
  if (acao === 'setup') {
    const { count } = await supabase
      .from('mesas')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', id)

    if (count && count > 0) {
      return NextResponse.json({ ok: true, ja_configurado: true })
    }

    const { randomBytes } = await import('crypto')
    const mesas = Array.from({ length: 10 }, (_, i) => ({
      numero:    i + 1,
      capacidade: 4,
      status:    'livre',
      qr_token:  randomBytes(16).toString('hex'),
      tenant_id: id,
    }))

    const { error: errMesas } = await supabase.from('mesas').insert(mesas)
    if (errMesas) return NextResponse.json({ error: errMesas.message }, { status: 500 })

    await supabase.from('configuracoes').upsert({
      tenant_id:        id,
      banner_ativo:     false,
      restaurante_nome: 'Meu Restaurante',
      cor_primaria:     '#1A9B8A',
    })

    return NextResponse.json({ ok: true, mesas_criadas: 10 })
  }

  // ── Atualiza status ──
  const { error } = await supabase
    .from('tenants')
    .update({ status })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — exclui um tenant e todos os dados relacionados
export async function DELETE(req: Request) {
  if (!await checkAuth()) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obrigatório.' }, { status: 422 })

  const supabase = createServiceClient()

  // Deleta na ordem correta (filhos antes dos pais)
  const tabelas: string[] = [
    'chamadas_garcom',
    'pedido_itens',
    'pedidos',
    'sessoes_mesa',
    'mesas',
    'cardapio_opcoes',
    'cardapio_grupos_opcao',
    'cardapio_itens',
    'pagamentos',
    'configuracoes',
    'usuarios',
  ]

  for (const tabela of tabelas) {
    const { error } = await supabase.from(tabela as any).delete().eq('tenant_id', id)
    if (error) console.error(`[delete tenant] erro em ${tabela}:`, error.message)
  }

  // Por último, deleta o tenant
  const { error } = await supabase.from('tenants').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
