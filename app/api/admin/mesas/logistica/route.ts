export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'

export async function GET(req: Request) {
  const supabase  = createServiceClient()
  const tenantId  = await getTenantId()

  const { searchParams } = new URL(req.url)
  const dias = Math.min(90, Math.max(1, Number(searchParams.get('dias') ?? 30)))

  const inicio = new Date()
  inicio.setDate(inicio.getDate() - dias)
  inicio.setHours(0, 0, 0, 0)
  const iso = inicio.toISOString()

  // Mesas do tenant
  let mesasQ = supabase.from('mesas').select('id, numero')
  if (tenantId) mesasQ = (mesasQ as any).eq('tenant_id', tenantId)
  const { data: mesasData } = await mesasQ

  if (!mesasData?.length) {
    return NextResponse.json({ stats: [], dias })
  }

  const mesaIds     = mesasData.map((m: { id: string }) => m.id)
  const mesaMap: Record<string, number> = {}
  mesasData.forEach((m: { id: string; numero: number }) => { mesaMap[m.id] = m.numero })

  // Sessões das mesas do tenant (últimos N dias)
  const { data: sessoes } = await supabase
    .from('sessoes_mesa')
    .select('mesa_id, aberta_em, fechada_em')
    .in('mesa_id', mesaIds)
    .gte('aberta_em', iso)

  // Pagamentos do tenant (por mesa_numero) — fallback: filtra pelo número das mesas do tenant
  const mesaNumeros = mesasData.map((m: { numero: number }) => m.numero)
  let pagQ = supabase
    .from('pagamentos')
    .select('mesa_numero, valor')
    .gte('criado_em', iso)
    .in('mesa_numero', mesaNumeros)
  if (tenantId) pagQ = (pagQ as any).eq('tenant_id', tenantId)
  const { data: pagamentos } = await pagQ

  // Agrupa sessões por mesa
  const porMesa: Record<number, { acessos: number; minutos: number }> = {}
  ;(sessoes ?? []).forEach((s: { mesa_id: string; aberta_em: string; fechada_em: string | null }) => {
    const num = mesaMap[s.mesa_id]
    if (!num) return
    if (!porMesa[num]) porMesa[num] = { acessos: 0, minutos: 0 }
    porMesa[num].acessos += 1
    if (s.fechada_em) {
      const min = Math.round(
        (new Date(s.fechada_em).getTime() - new Date(s.aberta_em).getTime()) / 60_000,
      )
      porMesa[num].minutos += min
    }
  })

  // Agrupa pagamentos por mesa
  const receitaMesa: Record<number, number> = {}
  ;(pagamentos ?? []).forEach((p: { mesa_numero: number; valor: number }) => {
    receitaMesa[p.mesa_numero] = (receitaMesa[p.mesa_numero] ?? 0) + p.valor
  })

  const minutosMax = dias * 12 * 60
  const stats = Object.entries(porMesa).map(([num, v]) => {
    const n = Number(num)
    return {
      mesa_numero:    n,
      acessos:        v.acessos,
      receita:        receitaMesa[n] ?? 0,
      minutos_ocupada: v.minutos,
      taxa_ocupacao:  Math.min(100, Math.round((v.minutos / minutosMax) * 100)),
    }
  })

  return NextResponse.json({ stats, dias })
}
