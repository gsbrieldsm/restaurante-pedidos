import { cookies } from 'next/headers'

/**
 * Retorna o tenant_id do cookie da sessão atual.
 * Retorna null se não houver sessão de tenant ativa.
 */
export async function getTenantId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('tenant_id')?.value ?? null
}
