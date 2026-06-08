import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'

const SESSAO_DURACAO_MS = 1000 * 60 * 60 * 24 * 7 // 7 dias

export interface SessaoAdmin {
  usuarioId: string | null
  tenantId: string | null
  cargo: string
}

/**
 * Gera um token opaco e aleatório (256 bits) — NÃO derivado do usuario_id,
 * portanto impossível de forjar/adivinhar.
 */
function gerarToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Cria uma sessão autenticada no banco e retorna o token opaco a ser
 * armazenado no cookie `admin_auth`.
 */
export async function criarSessaoAdmin(params: {
  usuarioId: string | null
  tenantId: string | null
  cargo: string
  userAgent?: string | null
  ip?: string | null
}): Promise<string> {
  const supabase = createServiceClient()
  const token = gerarToken()
  const expiraEm = new Date(Date.now() + SESSAO_DURACAO_MS).toISOString()

  const { error } = await supabase.from('sessoes_admin').insert({
    token,
    usuario_id: params.usuarioId,
    tenant_id: params.tenantId,
    cargo: params.cargo,
    expira_em: expiraEm,
    user_agent: params.userAgent ?? null,
    ip: params.ip ?? null,
  })

  if (error) {
    throw new Error(`Falha ao criar sessão admin: ${error.message}`)
  }

  return token
}

/**
 * Valida um token de sessão contra o banco — confirma que existe,
 * não expirou e não foi revogado. Retorna os dados da sessão ou null.
 */
export async function validarSessaoAdmin(token: string | undefined | null): Promise<SessaoAdmin | null> {
  if (!token) return null

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('sessoes_admin')
    .select('usuario_id, tenant_id, cargo, expira_em, revogada_em')
    .eq('token', token)
    .is('revogada_em', null)
    .single()

  if (error || !data) return null
  if (new Date(data.expira_em) < new Date()) return null

  return {
    usuarioId: data.usuario_id,
    tenantId: data.tenant_id,
    cargo: data.cargo,
  }
}

/**
 * Revoga a sessão associada a um token (logout).
 */
export async function revogarSessaoAdmin(token: string | undefined | null): Promise<void> {
  if (!token) return
  const supabase = createServiceClient()
  await supabase
    .from('sessoes_admin')
    .update({ revogada_em: new Date().toISOString() })
    .eq('token', token)
    .is('revogada_em', null)
}

/**
 * Lê o cookie `admin_auth` da requisição atual, valida a sessão contra o
 * banco e retorna os dados — incluindo o `tenantId`, que vem do REGISTRO
 * DA SESSÃO (não do cookie `tenant_id`, que é apenas conveniência de UI e
 * não deve ser usado como fonte de verdade para autorização).
 *
 * Use isto em toda rota de API que precisa identificar o tenant autenticado.
 */
export async function obterSessaoAtual(): Promise<SessaoAdmin | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_auth')?.value
  return validarSessaoAdmin(token)
}

/**
 * Atalho para rotas que só precisam confirmar o tenant autenticado.
 * Retorna o tenantId da SESSÃO (validada no banco) ou null se não autenticado
 * — nunca confia no cookie `tenant_id` enviado pelo cliente.
 */
export async function obterTenantIdAutenticado(): Promise<string | null> {
  const sessao = await obterSessaoAtual()
  return sessao?.tenantId ?? null
}

/**
 * Revoga todas as sessões ativas de um usuário (ex: troca de senha,
 * "sair de todos os dispositivos", desativação de conta).
 */
export async function revogarSessoesUsuario(usuarioId: string): Promise<void> {
  const supabase = createServiceClient()
  await supabase
    .from('sessoes_admin')
    .update({ revogada_em: new Date().toISOString() })
    .eq('usuario_id', usuarioId)
    .is('revogada_em', null)
}
