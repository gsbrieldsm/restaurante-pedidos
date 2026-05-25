-- Migration 030: campo impl_cobrada na tabela tenants
-- Permite marcar manualmente se a implementação (R$ 2.000) foi cobrada

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS impl_cobrada BOOLEAN NOT NULL DEFAULT FALSE;
