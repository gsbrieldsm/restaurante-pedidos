-- Free trial de 7 dias
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS trial_expira_em TIMESTAMPTZ DEFAULT NULL;

-- Atualiza constraint do plano para aceitar os novos nomes
ALTER TABLE tenants
  DROP CONSTRAINT IF EXISTS tenants_plano_check;

-- (sem constraint de check para flexibilidade futura)
-- Valores esperados: 'starter', 'pro', 'business', 'enterprise', 'basico'
