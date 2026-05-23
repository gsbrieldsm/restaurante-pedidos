-- ─── Migração 018: Permite o mesmo e-mail em múltiplos tenants ───────────────
-- Antes: UNIQUE(email) global → impede o mesmo operador em dois restaurantes
-- Depois: UNIQUE(email, tenant_id) → mesmo e-mail OK em restaurantes diferentes

-- Remove constraint global antiga
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_email_key;

-- Adiciona constraint composta (email único por tenant)
ALTER TABLE usuarios
  ADD CONSTRAINT usuarios_email_tenant_unique UNIQUE (email, tenant_id);
