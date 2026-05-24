import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'

export async function POST(req: Request) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const supabase = createServiceClient()
  const { escopo } = await req.json() as { escopo: string }

  try {
    switch (escopo) {

      // Limpa apenas os registros de pagamento
      case 'pagamentos': {
        const { error } = await supabase.from('pagamentos').delete().eq('tenant_id', tenantId)
        if (error) throw error
        break
      }

      // Limpa chamadas do garçom
      case 'chamadas': {
        const { error } = await supabase.from('chamadas_garcom').delete().eq('tenant_id', tenantId)
        if (error) throw error
        break
      }

      // Limpa pedidos (itens + pedidos) — mantém mesas e sessões
      case 'pedidos': {
        const { error: e1 } = await supabase.from('pedido_itens').delete().eq('tenant_id', tenantId)
        if (e1) throw e1
        const { error: e2 } = await supabase.from('pedidos').delete().eq('tenant_id', tenantId)
        if (e2) throw e2
        break
      }

      // Fecha todas as mesas ativas (encerra sessões abertas, libera mesas)
      case 'mesas': {
        const { error: e1 } = await supabase
          .from('sessoes_mesa')
          .update({ ativa: false, fechada_em: new Date().toISOString() })
          .eq('tenant_id', tenantId)
          .eq('ativa', true)
        if (e1) throw e1
        const { error: e2 } = await supabase
          .from('mesas')
          .update({ status: 'livre' })
          .eq('tenant_id', tenantId)
          .neq('status', 'livre')
        if (e2) throw e2
        break
      }

      // Apaga histórico de sessões (clientes que já encerraram)
      case 'clientes_historico': {
        const { error } = await supabase
          .from('sessoes_mesa')
          .delete()
          .eq('tenant_id', tenantId)
          .eq('ativa', false)
        if (error) throw error
        break
      }

      // Reset completo do dia: pedidos + pagamentos + chamadas
      case 'reset_dia': {
        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)
        const iso = hoje.toISOString()

        await supabase.from('chamadas_garcom').delete().eq('tenant_id', tenantId).gte('criado_em', iso)
        await supabase.from('pedido_itens').delete().eq('tenant_id', tenantId).gte('criado_em', iso)
        await supabase.from('pedidos').delete().eq('tenant_id', tenantId).gte('criado_em', iso)
        await supabase.from('pagamentos').delete().eq('tenant_id', tenantId).gte('criado_em', iso)
        break
      }

      // Reset total: apaga tudo exceto cardápio e estrutura de mesas
      case 'reset_total': {
        await supabase.from('chamadas_garcom').delete().eq('tenant_id', tenantId)
        await supabase.from('pedido_itens').delete().eq('tenant_id', tenantId)
        await supabase.from('pedidos').delete().eq('tenant_id', tenantId)
        await supabase.from('pagamentos').delete().eq('tenant_id', tenantId)
        await supabase.from('sessoes_mesa').delete().eq('tenant_id', tenantId)
        await supabase.from('mesas').update({ status: 'livre' }).eq('tenant_id', tenantId).neq('status', 'livre')
        break
      }

      default:
        return NextResponse.json({ error: 'Escopo inválido' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[reset]', escopo, msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
