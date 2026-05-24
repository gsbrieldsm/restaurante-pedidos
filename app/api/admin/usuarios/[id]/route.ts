import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/tenant'
import { Resend } from 'resend'
import { emailConvite } from '@/lib/email/convite'

export const dynamic = 'force-dynamic'

const CARGO_LABEL: Record<string, string> = {
  admin:    'Administrador',
  operador: 'Operador',
}

// ── PATCH — atualiza cargo ou status ativo ───────────────────────────────────
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id }   = await params
  const supabase = createServiceClient()
  const tenantId = await getTenantId()

  const { cargo, ativo } = await req.json() as {
    cargo?: 'admin' | 'operador'
    ativo?: boolean
  }

  const updates: Record<string, unknown> = {}
  if (cargo !== undefined) updates.cargo = cargo
  if (ativo !== undefined) updates.ativo = ativo

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar.' }, { status: 400 })
  }

  // Não permite remover o último admin ativo
  if (ativo === false || cargo === 'operador') {
    let q = supabase
      .from('usuarios')
      .select('id', { count: 'exact', head: true })
      .eq('cargo', 'admin')
      .eq('ativo', true)
      .neq('id', id)
    if (tenantId) q = (q as any).eq('tenant_id', tenantId)
    const { count } = await q

    if (!count || count === 0) {
      return NextResponse.json(
        { error: 'Não é possível remover o último administrador ativo.' },
        { status: 409 }
      )
    }
  }

  const { data, error } = await supabase
    .from('usuarios')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenantId ?? '')
    .select('id, nome, email, cargo, ativo, convite_aceito, criado_em')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ usuario: data })
}

// ── POST { action: 'reenviar' } — reenvia e-mail de convite ─────────────────
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id }   = await params
  const supabase = createServiceClient()
  const tenantId = await getTenantId()

  const body = await req.json() as { action: string }

  if (body.action !== 'reenviar') {
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, nome, email, cargo, convite_aceito, tenant_id')
    .eq('id', id)
    .eq('tenant_id', tenantId ?? '')
    .single()

  if (!usuario) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
  }

  if (usuario.convite_aceito) {
    return NextResponse.json({ error: 'Este usuário já aceitou o convite.' }, { status: 409 })
  }

  const convite_token     = randomBytes(32).toString('hex')
  const convite_expira_em = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  await supabase
    .from('usuarios')
    .update({ convite_token, convite_expira_em })
    .eq('id', id)

  // Busca nome do restaurante
  let nomeRestaurante = 'Seu Restaurante'
  const tid = tenantId ?? usuario.tenant_id
  if (tid) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('nome_restaurante')
      .eq('id', tid)
      .single()
    if (tenant) nomeRestaurante = tenant.nome_restaurante
  }

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    try {
      await resend.emails.send({
        from:    process.env.RESEND_FROM ?? 'Menue+ <noreply@menue.com.br>',
        to:      usuario.email,
        subject: `Convite Menuê+ — ${nomeRestaurante}`,
        html:    emailConvite({
          nomeConvidado:   usuario.nome,
          nomeRestaurante,
          cargoLabel:      CARGO_LABEL[usuario.cargo] ?? usuario.cargo,
          token:           convite_token,
        }),
      })
    } catch (err) {
      console.error('[resend] erro ao reenviar convite:', err)
    }
  }

  return NextResponse.json({ ok: true })
}

// ── DELETE — remove usuário ──────────────────────────────────────────────────
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id }   = await params
  const supabase = createServiceClient()
  const tenantId = await getTenantId()

  const { data: alvo } = await supabase
    .from('usuarios')
    .select('cargo, ativo')
    .eq('id', id)
    .single()

  if (alvo?.cargo === 'admin' && alvo?.ativo) {
    let q = supabase
      .from('usuarios')
      .select('id', { count: 'exact', head: true })
      .eq('cargo', 'admin')
      .eq('ativo', true)
    if (tenantId) q = (q as any).eq('tenant_id', tenantId)
    const { count } = await q

    if (!count || count <= 1) {
      return NextResponse.json(
        { error: 'Não é possível remover o único administrador.' },
        { status: 409 }
      )
    }
  }

  const { error } = await supabase.from('usuarios').delete().eq('id', id).eq('tenant_id', tenantId ?? '')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
