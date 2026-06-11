/**
 * Definição de planos e limites — fonte única da verdade.
 * Importado por: middleware, APIs, componentes.
 */

export type PlanoId = 'free' | 'starter' | 'pro' | 'business' | 'enterprise' | 'controle_chope' | 'business_chope'

export interface PlanoConfig {
  mesas:          number   // 0 = ilimitado
  estacoes:       number   // 0 = ilimitado
  /** rotas /admin/* bloqueadas neste plano */
  bloqueado:      string[]
  /** recursos premium por feature flag */
  saldo_pre_pago: boolean  // carteira pré-paga vinculada ao celular
  nome_mesa:      boolean  // nome personalizado por QR code (ex: "Arquibancada Quadra 1")
  delivery:       boolean  // módulo de delivery com raio e taxas por zona
  chopes:         boolean  // módulo de Controle de Chopes
  /** conta restrita exclusivamente ao módulo de Controle de Chopes */
  apenasChopes:   boolean
}

/** Rotas do admin fora do módulo de Controle de Chopes — usadas para
 * restringir contas que têm acesso apenas a esse módulo. */
const ROTAS_FORA_DO_CHOPE = [
  '/admin/clientes', '/admin/tempo', '/admin/faturamento', '/admin/cardapio',
  '/admin/mesas', '/admin/delivery', '/admin/equipe', '/admin/configuracoes',
]

export const PLANOS: Record<PlanoId, PlanoConfig> = {
  free: {
    mesas:          0,
    estacoes:       0,
    bloqueado:      [],  // acesso total (teste/bônus)
    saldo_pre_pago: true,
    nome_mesa:      true,
    delivery:       true,
    chopes:         false,
    apenasChopes:   false,
  },
  starter: {
    mesas:          15,
    estacoes:       2,
    bloqueado:      ['/admin/tempo', '/admin/clientes', '/admin/faturamento'],
    saldo_pre_pago: false,
    nome_mesa:      false,
    delivery:       false,
    chopes:         false,
    apenasChopes:   false,
  },
  pro: {
    mesas:          30,
    estacoes:       4,
    bloqueado:      [],
    saldo_pre_pago: false,
    nome_mesa:      false,
    delivery:       false,
    chopes:         false,
    apenasChopes:   false,
  },
  business: {
    mesas:          60,
    estacoes:       0,
    bloqueado:      [],
    saldo_pre_pago: true,
    nome_mesa:      true,
    delivery:       true,
    chopes:         false,
    apenasChopes:   false,
  },
  enterprise: {
    mesas:          0,
    estacoes:       0,
    bloqueado:      [],  // negociado individualmente — acesso total
    saldo_pre_pago: true,
    nome_mesa:      true,
    delivery:       true,
    chopes:         false,
    apenasChopes:   false,
  },
  controle_chope: {
    mesas:          0,
    estacoes:       0,
    bloqueado:      ROTAS_FORA_DO_CHOPE,
    saldo_pre_pago: false,
    nome_mesa:      false,
    delivery:       false,
    chopes:         true,
    apenasChopes:   true,
  },
  business_chope: {
    mesas:          60,
    estacoes:       0,
    bloqueado:      [],
    saldo_pre_pago: true,
    nome_mesa:      true,
    delivery:       true,
    chopes:         true,
    apenasChopes:   false,
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
  '/admin/cardapio':    { titulo: 'Cardápio',               planoMinimo: 'Pro'      },
  '/admin/mesas':       { titulo: 'Mesas & QR',             planoMinimo: 'Pro'      },
  '/admin/delivery':    { titulo: 'Módulo Delivery',        planoMinimo: 'Business' },
  '/admin/equipe':      { titulo: 'Gestão de Equipe',       planoMinimo: 'Pro'      },
  '/admin/configuracoes': { titulo: 'Configurações',        planoMinimo: 'Pro'      },
  'saldo_pre_pago':     { titulo: 'Saldo Pré-pago',         planoMinimo: 'Business' },
  'nome_mesa':          { titulo: 'Nome personalizado de QR', planoMinimo: 'Business' },
  'delivery':           { titulo: 'Módulo Delivery',          planoMinimo: 'Business' },
  'chopes':             { titulo: 'Controle de Chopes',       planoMinimo: 'Business + Controle de Chopes' },
}
