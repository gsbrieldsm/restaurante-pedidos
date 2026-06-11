export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { parseRelatorio } from '@/lib/chopes/parseRelatorio'

function normalizar(texto: string): string {
  return texto
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export async function POST(req: Request) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const { linhas, erro } = parseRelatorio(buffer)

  if (erro) {
    return NextResponse.json({ error: erro }, { status: 422 })
  }

  const supabase = createServiceClient()

  const [{ data: chopes, error: errChopes }, { data: mapeamentos, error: errMapas }] =
    await Promise.all([
      supabase.from('chopes').select('*').eq('tenant_id', tenantId).order('nome'),
      supabase.from('chopes_mapeamentos').select('*').eq('tenant_id', tenantId),
    ])

  if (errChopes) return NextResponse.json({ error: errChopes.message }, { status: 500 })
  if (errMapas) return NextResponse.json({ error: errMapas.message }, { status: 500 })

  const mapeamentoPorNome = new Map(
    (mapeamentos ?? []).map((m) => [normalizar(m.nome_relatorio), m])
  )

  const itens = linhas.map((linha) => {
    const chave = normalizar(linha.produto)
    const mapeamento = mapeamentoPorNome.get(chave)

    let chopeId: string | null = mapeamento?.chope_id ?? null
    let fatorConversao = mapeamento?.fator_conversao ?? 1

    if (!chopeId) {
      const candidato = (chopes ?? []).find((c) => {
        const nomeChope = normalizar(c.nome)
        const estiloChope = normalizar(c.estilo)
        return (
          chave.includes(nomeChope) ||
          nomeChope.includes(chave) ||
          chave.includes(estiloChope)
        )
      })
      if (candidato) {
        chopeId = candidato.id
        fatorConversao = 1
      }
    }

    return {
      produto: linha.produto,
      quantidade: linha.quantidade,
      chopeId,
      fatorConversao,
      litros: chopeId ? linha.quantidade * fatorConversao : 0,
    }
  })

  return NextResponse.json({
    nomeArquivo: file.name,
    itens,
    chopes,
  })
}
