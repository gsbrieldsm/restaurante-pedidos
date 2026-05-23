-- ─── Migração 016: Verificação de e-mail e recuperação de senha ─────────────

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS email_verificado  boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verificacao_token text,
  ADD COLUMN IF NOT EXISTS reset_token       text,
  ADD COLUMN IF NOT EXISTS reset_expira_em   timestamptz;

-- Índice para busca rápida por token
CREATE INDEX IF NOT EXISTS idx_tenants_verificacao_token ON tenants (verificacao_token) WHERE verificacao_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_reset_token       ON tenants (reset_token)       WHERE reset_token IS NOT NULL;
