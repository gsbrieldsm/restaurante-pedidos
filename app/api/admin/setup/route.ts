import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { hashSenha } from '@/lib/auth-utils'

// GET — verifica se já existe algum usuário cadastrado
export async function GET() {
  const supabase = createServiceClient()
  const { count } = await supabase
    .from('usuarios')
    .select('id', { count: 'exact', head: true })

  return NextResponse.json({ semUsuarios: !count || count === 0 })
}

// POST — cria o primeiro usuário admin (só funciona se não houver nenhum)
export async function POST(req: Request) {
  const supabase = createServiceClient()

  const { count } = await supabase
    .from('usuarios')
    .select('id', { count: 'exact', head: true })

  if (count && count > 0) {
    return NextResponse.json(
      { error: 'Já existem usuários cadastrados. Use o login normal.' },
      { status: 403 }
    )
  }

  const { nome, email, senha } = await req.json() as {
    nome: string
    email: string
    senha: string
  }

  if (!nome?.trim() || !email?.trim() || !senha) {
    return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 })
  }

  if (senha.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter ao menos 6 caracteres' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('usuarios')
    .insert({
      nome:       nome.trim(),
      email:      email.toLowerCase().trim(),
      senha_hash: hashSenha(senha),
      cargo:      'admin',
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 })
}
