-- ─── Migração 017: Sistema de convites para operadores ──────────────────────

-- Torna senha_hash opcional (usuários convidados ainda não têm senha)
ALTER TABLE usuarios
  ALTER COLUMN senha_hash DROP NOT NULL;

-- Colunas de convite
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS convite_token     text,
  ADD COLUMN IF NOT EXISTS convite_expira_em timestamptz,
  ADD COLUMN IF NOT EXISTS convite_aceito    boolean NOT NULL DEFAULT false;

-- Índice para busca rápida por token
CREATE INDEX IF NOT EXISTS idx_usuarios_convite_token
  ON usuarios (convite_token)
  WHERE convite_token IS NOT NULL;
