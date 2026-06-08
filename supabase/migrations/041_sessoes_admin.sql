-- Migration 041: Sessões de admin com token opaco validado no banco
-- Substitui o modelo de cookie "mmu:<usuario_id>" (forjável, sem validação server-side)
-- por um token aleatório opaco que é conferido contra esta tabela a cada requisição.

CREATE TABLE IF NOT EXISTS sessoes_admin (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token         TEXT NOT NULL UNIQUE,
  usuario_id    UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  tenant_id     UUID REFERENCES tenants(id)  ON DELETE CASCADE,
  cargo         TEXT NOT NULL DEFAULT 'admin',
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em     TIMESTAMPTZ NOT NULL,
  revogada_em   TIMESTAMPTZ,
  user_agent    TEXT,
  ip            TEXT
);

-- Busca rápida por token (caminho mais quente: validação a cada request)
CREATE INDEX IF NOT EXISTS idx_sessoes_admin_token
  ON sessoes_admin (token)
  WHERE revogada_em IS NULL;

-- Permite revogar todas as sessões de um usuário (ex: troca de senha, logout geral)
CREATE INDEX IF NOT EXISTS idx_sessoes_admin_usuario
  ON sessoes_admin (usuario_id)
  WHERE revogada_em IS NULL;

COMMENT ON TABLE sessoes_admin IS
  'Sessões autenticadas do painel admin/staff. O token é opaco e aleatório (não derivado de usuario_id) e validado contra esta tabela a cada requisição — substitui o antigo cookie "mmu:<uuid>" que podia ser forjado pelo cliente.';
