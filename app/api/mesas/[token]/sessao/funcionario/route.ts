import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verificarSenha } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

// POST — login do funcionário via QR code
// Valida credenciais, cria sessão com funcionario_id
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { email, senha } = await req.json()

  if (!email?.trim() || !senha) {
    return NextResponse.json({ error: 'E-mail e senha obrigatórios' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Resolve mesa → tenant
  const { data: mesa } = await supabase
    .from('mesas')
    .select('id, tenant_id, numero, nome, status')
    .eq('qr_token', token)
    .single()

  if (!mesa) {
    return NextResponse.json({ error: 'Mesa não encontrada' }, { status: 404 })
  }

  // Valida funcionário no tenant correto
  const { data: funcionario } = await supabase
    .from('usuarios')
    .select('id, nome, email, senha_hash, ativo, convite_aceito, desconto_funcionario')
    .eq('email', email.toLowerCase().trim())
    .eq('tenant_id', mesa.tenant_id)
    .single()

  if (!funcionario || !funcionario.ativo || !funcionario.convite_aceito) {
    return NextResponse.json({ error: 'Funcionário não encontrado ou inativo' }, { status: 401 })
  }

  if (!funcionario.senha_hash || !verificarSenha(senha, funcionario.senha_hash)) {
    return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 401 })
  }

  // Cria sessão com funcionario_id
  const { data: sessao, error } = await supabase
    .from('sessoes_mesa')
    .insert({
      mesa_id:        mesa.id,
      tenant_id:      mesa.tenant_id,
      cliente_nome:   funcionario.nome,
      ativa:          true,
      funcionario_id: funcionario.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Erro ao criar sessão' }, { status: 500 })
  }

  await supabase.from('mesas').update({ status: 'ocupada' }).eq('id', mesa.id)

  return NextResponse.json({
    sessao,
    funcionario: {
      id:                   funcionario.id,
      nome:                 funcionario.nome,
      desconto_funcionario: funcionario.desconto_funcionario ?? 0,
    },
  })
}
