export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'

export async function GET() {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('chopes_importacoes')
    .select('*, movimentacoes:chopes_movimentacoes(id, quantidade, observacao, chope:chopes(nome, torneira))')
    .eq('tenant_id', tenantId)
    .order('criado_em', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

type ItemConfirmado = {
  produto: string
  quantidade: number
  chopeId: string | null
  fatorConversao: number
  litros: number
  salvarMapeamento?: boolean
}

export async function POST(req: Request) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const body = await req.json()
  const { nomeArquivo, itens } = body as { nomeArquivo: string; itens: ItemConfirmado[] }

  if (!nomeArquivo || !Array.isArray(itens)) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const aplicaveis = itens.filter((i) => i.chopeId && i.litros > 0)
  const ignorados = itens.filter((i) => !i.chopeId || i.litros <= 0)

  const supabase = createServiceClient()

  const { data: importacao, error: errImp } = await supabase
    .from('chopes_importacoes')
    .insert({
      tenant_id: tenantId,
      nome_arquivo: nomeArquivo,
      status: 'PROCESSADO',
      resumo: {
        totalLinhas: itens.length,
        aplicados: aplicaveis.length,
        ignorados: ignorados.map((i) => ({ produto: i.produto, quantidade: i.quantidade })),
      },
    })
    .select()
    .single()

  if (errImp) return NextResponse.json({ error: errImp.message }, { status: 500 })

  for (const item of aplicaveis) {
    const { error: errMov } = await supabase.rpc('registrar_movimentacao_chope', {
      p_chope_id: item.chopeId,
      p_tenant_id: tenantId,
      p_tipo: 'SAIDA_VENDA',
      p_quantidade: -Math.abs(item.litros),
      p_observacao: `${item.produto} (${item.quantidade} un.)`,
      p_importacao_id: importacao.id,
    })

    if (errMov) return NextResponse.json({ error: errMov.message }, { status: 500 })

    if (item.salvarMapeamento) {
      await supabase.from('chopes_mapeamentos').upsert(
        {
          tenant_id: tenantId,
          nome_relatorio: item.produto,
          chope_id: item.chopeId,
          fator_conversao: item.fatorConversao,
        },
        { onConflict: 'tenant_id,nome_relatorio' }
      )
    }
  }

  return NextResponse.json({ ok: true, importacaoId: importacao.id })
}
