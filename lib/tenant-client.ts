/**
 * Lê o tenant_id do cookie não-httpOnly no browser.
 * Usado para filtrar subscrições Supabase Realtime por tenant.
 */
export function getTenantIdClient(): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(/(?:^|;\s*)tenant_id=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : null
}
