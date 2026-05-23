import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { hashSenha } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

// GET /api/tenant/aceitar-convite?token=xxx — valida token antes de mostrar o form
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token inválido.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, nome, email, cargo, convite_aceito, convite_expira_em, tenant_id')
    .eq('convite_token', token)
    .single()

  if (!usuario) {
    return NextResponse.json({ error: 'Convite inválido ou já utilizado.' }, { status: 404 })
  }

  if (usuario.convite_aceito) {
    return NextResponse.json({ error: 'Este convite já foi utilizado. Faça login normalmente.' }, { status: 409 })
  }

  if (!usuario.convite_expira_em || new Date(usuario.convite_expira_em) < new Date()) {
    return NextResponse.json({ error: 'Este convite expirou. Solicite um novo ao administrador.' }, { status: 410 })
  }

  // Busca nome do restaurante
  let nomeRestaurante = ''
  if (usuario.tenant_id) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('nome_restaurante')
      .eq('id', usuario.tenant_id)
      .single()
    if (tenant) nomeRestaurante = tenant.nome_restaurante
  }

  return NextResponse.json({
    ok: true,
    usuario: {
      nome:            usuario.nome,
      email:           usuario.email,
      cargo:           usuario.cargo,
      nomeRestaurante,
    },
  })
}

// POST /api/tenant/aceitar-convite — define senha e ativa o usuário
export async function POST(req: Request) {
  const { token, senha } = await req.json()

  if (!token || !senha) {
    return NextResponse.json({ error: 'Token e senha são obrigatórios.' }, { status: 400 })
  }

  if (senha.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, nome, cargo, convite_aceito, convite_expira_em')
    .eq('convite_token', token)
    .single()

  if (!usuario) {
    return NextResponse.json({ error: 'Convite inválido ou já utilizado.' }, { status: 404 })
  }

  if (usuario.convite_aceito) {
    return NextResponse.json({ error: 'Este convite já foi utilizado.' }, { status: 409 })
  }

  if (!usuario.convite_expira_em || new Date(usuario.convite_expira_em) < new Date()) {
    return NextResponse.json({ error: 'Este convite expirou. Solicite um novo ao administrador.' }, { status: 410 })
  }

  const { error } = await supabase
    .from('usuarios')
    .update({
      senha_hash:      hashSenha(senha),
      ativo:           true,
      convite_aceito:  true,
      convite_token:   null,
      convite_expira_em: null,
    })
    .eq('id', usuario.id)

  if (error) {
    return NextResponse.json({ error: 'Erro ao ativar conta.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
