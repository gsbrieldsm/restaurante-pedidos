/**
 * Definição de planos e limites — fonte única da verdade.
 * Importado por: middleware, APIs, componentes.
 */

export type PlanoId = 'free' | 'starter' | 'pro' | 'business' | 'enterprise'

export interface PlanoConfig {
  mesas:          number   // 0 = ilimitado
  estacoes:       number   // 0 = ilimitado
  /** rotas /admin/* bloqueadas neste plano */
  bloqueado:      string[]
  /** recursos premium por feature flag */
  saldo_pre_pago: boolean  // carteira pré-paga vinculada ao celular
}

export const PLANOS: Record<PlanoId, PlanoConfig> = {
  free: {
    mesas:          0,
    estacoes:       0,
    bloqueado:      [],  // acesso total (teste/bônus)
    saldo_pre_pago: true,
  },
  starter: {
    mesas:          15,
    estacoes:       2,
    bloqueado:      ['/admin/tempo', '/admin/clientes', '/admin/faturamento'],
    saldo_pre_pago: false,
  },
  pro: {
    mesas:          30,
    estacoes:       4,
    bloqueado:      [],
    saldo_pre_pago: false,
  },
  business: {
    mesas:          60,
    estacoes:       0,
    bloqueado:      [],
    saldo_pre_pago: true,
  },
  enterprise: {
    mesas:          0,
    estacoes:       0,
    bloqueado:      [],  // negociado individualmente — acesso total
    saldo_pre_pago: true,
  },
}

/** Retorna a config do plano, com fallback seguro para starter */
export function getPlanoConfig(plano: string | null | undefined): PlanoConfig {
  return PLANOS[(plano as PlanoId) ?? 'starter'] ?? PLANOS.starter
}

/** Mensagens para o usuário sobre cada recurso bloqueado */
export const RECURSO_LABEL: Record<string, { titulo: string; planoMinimo: string }> = {
  '/admin/tempo':       { titulo: 'Painel de Performance', planoMinimo: 'Pro'      },
  '/admin/clientes':    { titulo: 'Histórico de Clientes',  planoMinimo: 'Pro'      },
  '/admin/faturamento': { titulo: 'Relatórios Financeiros', planoMinimo: 'Pro'      },
  'saldo_pre_pago':     { titulo: 'Saldo Pré-pago',         planoMinimo: 'Business' },
}
