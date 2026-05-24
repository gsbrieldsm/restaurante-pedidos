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

  const supabase  = createServiceClient()
  const agora     = new Date()
  const hoje0h    = new Date(agora); hoje0h.setHours(0, 0, 0, 0)
  const h7d       = new Date(agora); h7d.setDate(agora.getDate() - 7)
  const h30d      = new Date(agora); h30d.setDate(agora.getDate() - 30)
  const h14d      = new Date(agora); h14d.setDate(agora.getDate() - 14)
  const em7d      = new Date(agora); em7d.setDate(agora.getDate() + 7)

  // ── Paralelo: puxa tudo de uma vez ──────────────────────────────────────────
  const [
    { data: tenants },
    { data: pedidosHoje },
    { data: pedidos7d },
    { data: pedidos30d },
    { data: sessoesAbertas },
    { data: sessoes7d },
  ] = await Promise.all([
    supabase
      .from('tenants')
      .select('id, nome_restaurante, email, status, plano, plano_aceito_em, trial_expira_em, criado_em'),

    supabase
      .from('pedidos')
      .select('id, tenant_id, total, criado_em')
      .gte('criado_em', hoje0h.toISOString()),

    supabase
      .from('pedidos')
      .select('id, tenant_id, total, criado_em')
      .gte('criado_em', h7d.toISOString()),

    supabase
      .from('pedidos')
      .select('id, tenant_id, total, criado_em')
      .gte('criado_em', h30d.toISOString()),

    supabase
      .from('sessoes_mesa')
      .select('id, tenant_id')
      .eq('ativa', true),

    supabase
      .from('sessoes_mesa')
      .select('id, tenant_id, criado_em')
      .gte('criado_em', h7d.toISOString()),
  ])

  const tList   = tenants   ?? []
  const p7d     = pedidos7d ?? []
  const p30d    = pedidos30d ?? []
  const pH      = pedidosHoje ?? []

  // ── Pulso ───────────────────────────────────────────────────────────────────
  const pulso = {
    pedidos_hoje:      pH.length,
    volume_hoje:       pH.reduce((s, p) => s + (p.total ?? 0), 0),
    pedidos_7d:        p7d.length,
    volume_7d:         p7d.reduce((s, p) => s + (p.total ?? 0), 0),
    sessoes_abertas:   (sessoesAbertas ?? []).length,
    sessoes_7d:        (sessoes7d ?? []).length,
    novos_tenants_7d:  tList.filter(t => new Date(t.criado_em) >= h7d).length,
  }

  // ── Saúde ───────────────────────────────────────────────────────────────────
  // Tenants ativos SEM pedido nos últimos 14 dias (risco churn)
  const idsComPedido14d = new Set(
    (pedidos30d ?? [])
      .filter(p => new Date(p.criado_em) >= h14d)
      .map(p => p.tenant_id)
  )
  const emRisco = tList
    .filter(t => t.plano_aceito_em && !idsComPedido14d.has(t.id))
    .map(t => ({
      id:               t.id,
      nome_restaurante: t.nome_restaurante,
      email:            t.email,
      plano:            t.plano,
      ultimo_pedido:    (p30d.filter(p => p.tenant_id === t.id)
                             .sort((a, b) => b.criado_em.localeCompare(a.criado_em))[0]?.criado_em) ?? null,
    }))

  // Trials expirando nos próximos 7 dias
  const trialExpirando = tList
    .filter(t =>
      t.trial_expira_em &&
      !t.plano_aceito_em &&
      new Date(t.trial_expira_em) >= agora &&
      new Date(t.trial_expira_em) <= em7d
    )
    .map(t => ({
      id:               t.id,
      nome_restaurante: t.nome_restaurante,
      email:            t.email,
      trial_expira_em:  t.trial_expira_em!,
      dias_restantes:   Math.ceil((new Date(t.trial_expira_em!).getTime() - agora.getTime()) / 86400000),
    }))
    .sort((a, b) => a.dias_restantes - b.dias_restantes)

  // ── Top tenants nos últimos 7 dias ──────────────────────────────────────────
  const pedidosPorTenant: Record<string, { qtd: number; volume: number }> = {}
  for (const p of p7d) {
    if (!pedidosPorTenant[p.tenant_id]) pedidosPorTenant[p.tenant_id] = { qtd: 0, volume: 0 }
    pedidosPorTenant[p.tenant_id].qtd++
    pedidosPorTenant[p.tenant_id].volume += p.total ?? 0
  }
  const sessoesPorTenant: Record<string, number> = {}
  for (const s of (sessoes7d ?? [])) {
    sessoesPorTenant[s.tenant_id] = (sessoesPorTenant[s.tenant_id] ?? 0) + 1
  }

  const topTenants = tList
    .map(t => ({
      id:               t.id,
      nome_restaurante: t.nome_restaurante,
      pedidos_7d:       pedidosPorTenant[t.id]?.qtd    ?? 0,
      volume_7d:        pedidosPorTenant[t.id]?.volume ?? 0,
      sessoes_7d:       sessoesPorTenant[t.id]          ?? 0,
    }))
    .filter(t => t.pedidos_7d > 0 || t.sessoes_7d > 0)
    .sort((a, b) => b.pedidos_7d - a.pedidos_7d)
    .slice(0, 8)

  // ── Crescimento: registros por semana (últimas 8 semanas) ──────────────────
  const semanas: { label: string; start: Date; end: Date }[] = []
  for (let i = 7; i >= 0; i--) {
    const end   = new Date(agora); end.setDate(agora.getDate() - i * 7)
    const start = new Date(end);   start.setDate(end.getDate() - 6)
    start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999)
    semanas.push({
      label: start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      start,
      end,
    })
  }

  const crescimento = semanas.map(s => ({
    label:    s.label,
    tenants:  tList.filter(t => {
      const d = new Date(t.criado_em)
      return d >= s.start && d <= s.end
    }).length,
    pedidos: p30d.filter(p => {   // só temos 30d, semanas mais antigas ficam 0
      const d = new Date(p.criado_em)
      return d >= s.start && d <= s.end
    }).length,
  }))

  // ── Última atividade de todos os tenants ────────────────────────────────────
  const ultimoPedidoPorTenant: Record<string, string> = {}
  for (const p of p30d) {
    const cur = ultimoPedidoPorTenant[p.tenant_id]
    if (!cur || p.criado_em > cur) ultimoPedidoPorTenant[p.tenant_id] = p.criado_em
  }

  const atividadeTenants = tList
    .filter(t => t.plano_aceito_em)   // só os que já ativaram
    .map(t => ({
      id:               t.id,
      nome_restaurante: t.nome_restaurante,
      plano:            t.plano,
      ultimo_pedido:    ultimoPedidoPorTenant[t.id] ?? null,
      pedidos_7d:       pedidosPorTenant[t.id]?.qtd ?? 0,
      sessoes_abertas:  (sessoesAbertas ?? []).filter(s => s.tenant_id === t.id).length,
    }))
    .sort((a, b) => {
      if (!a.ultimo_pedido && !b.ultimo_pedido) return 0
      if (!a.ultimo_pedido) return 1
      if (!b.ultimo_pedido) return -1
      return b.ultimo_pedido.localeCompare(a.ultimo_pedido)
    })

  return NextResponse.json({
    pulso,
    saude: { em_risco: emRisco, trial_expirando: trialExpirando },
    top_tenants: topTenants,
    crescimento,
    atividade_tenants: atividadeTenants,
  })
}
