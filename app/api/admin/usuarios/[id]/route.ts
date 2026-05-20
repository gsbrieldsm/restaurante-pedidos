import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { hashSenha } from '@/lib/auth-utils'

// PUT — atualiza usuário (nome, email, cargo, ativo e/ou nova senha)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const { nome, email, cargo, ativo, senha } = await req.json() as {
    nome?: string
    email?: string
    cargo?: 'admin' | 'operador'
    ativo?: boolean
    senha?: string
  }

  const updates: Record<string, unknown> = {}
  if (nome  !== undefined) updates.nome  = nome.trim()
  if (email !== undefined) updates.email = email.toLowerCase().trim()
  if (cargo !== undefined) updates.cargo = cargo
  if (ativo !== undefined) updates.ativo = ativo
  if (senha)               updates.senha_hash = hashSenha(senha)

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 })
  }

  // Garante que não estamos desativando o último admin
  if (ativo === false || cargo === 'operador') {
    const { count } = await supabase
      .from('usuarios')
      .select('id', { count: 'exact', head: true })
      .eq('cargo', 'admin')
      .eq('ativo', true)
      .neq('id', id)

    if (!count || count === 0) {
      return NextResponse.json(
        { error: 'Não é possível remover o último administrador ativo' },
        { status: 409 }
      )
    }
  }

  const { data, error } = await supabase
    .from('usuarios')
    .update(updates)
    .eq('id', id)
    .select('id, nome, email, cargo, ativo, criado_em')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Este email já está em uso' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ usuario: data })
}

// DELETE — remove usuário (não pode remover o último admin)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  // Verifica se é o último admin
  const { data: alvo } = await supabase
    .from('usuarios')
    .select('cargo')
    .eq('id', id)
    .single()

  if (alvo?.cargo === 'admin') {
    const { count } = await supabase
      .from('usuarios')
      .select('id', { count: 'exact', head: true })
      .eq('cargo', 'admin')
      .eq('ativo', true)

    if (!count || count <= 1) {
      return NextResponse.json(
        { error: 'Não é possível remover o único administrador' },
        { status: 409 }
      )
    }
  }

  const { error } = await supabase.from('usuarios').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
