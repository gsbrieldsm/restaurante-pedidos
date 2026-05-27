-- ============================================================
-- 039_delivery_sessao.sql
-- Integra delivery ao fluxo de sessões existente
-- ============================================================

-- ── mesas: tipo de QR (mesa normal vs delivery) ─────────────
ALTER TABLE mesas
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'mesa';
-- Valores: 'mesa' | 'delivery'

-- ── sessoes_mesa: campos de delivery ────────────────────────
ALTER TABLE sessoes_mesa
  ADD COLUMN IF NOT EXISTS is_delivery               BOOLEAN         DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_nome             TEXT,
  ADD COLUMN IF NOT EXISTS delivery_telefone         TEXT,
  ADD COLUMN IF NOT EXISTS delivery_cep              VARCHAR(9),
  ADD COLUMN IF NOT EXISTS delivery_endereco         TEXT,
  ADD COLUMN IF NOT EXISTS delivery_numero           TEXT,
  ADD COLUMN IF NOT EXISTS delivery_complemento      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS delivery_bairro           TEXT,
  ADD COLUMN IF NOT EXISTS delivery_cidade           TEXT,
  ADD COLUMN IF NOT EXISTS delivery_uf               VARCHAR(2),
  ADD COLUMN IF NOT EXISTS delivery_taxa             NUMERIC(10,2)   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_distancia_km     NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS delivery_forma_pagamento  VARCHAR(30),
  ADD COLUMN IF NOT EXISTS delivery_status           VARCHAR(30)     DEFAULT 'aguardando';
  -- aguardando | saiu_entrega | entregue

-- ── pedidos: flag para filtrar no garçom ────────────────────
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS is_delivery BOOLEAN DEFAULT false;

-- ── pedido_itens: flag para filtrar no garçom ───────────────
ALTER TABLE pedido_itens
  ADD COLUMN IF NOT EXISTS is_delivery BOOLEAN DEFAULT false;

-- ── Índices ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sessoes_mesa_is_delivery ON sessoes_mesa(is_delivery);
CREATE INDEX IF NOT EXISTS idx_pedidos_is_delivery      ON pedidos(is_delivery);
CREATE INDEX IF NOT EXISTS idx_pedido_itens_is_delivery ON pedido_itens(is_delivery);
