-- ─── Migração 019: Configurações por tenant ──────────────────────────────────
-- Antes: id INTEGER PRIMARY KEY DEFAULT 1 (linha única global)
-- Depois: uma linha por tenant, identificada por tenant_id

-- 1. Remove o default fixo (id=1) e cria sequence para novos registros
ALTER TABLE configuracoes ALTER COLUMN id DROP DEFAULT;
CREATE SEQUENCE IF NOT EXISTS configuracoes_id_seq START WITH 100;
ALTER TABLE configuracoes ALTER COLUMN id SET DEFAULT nextval('configuracoes_id_seq');

-- 2. Garante unique por tenant (permite upsert por tenant_id)
ALTER TABLE configuracoes
  ADD CONSTRAINT configuracoes_tenant_id_unique UNIQUE (tenant_id);

-- 3. Colunas que podem estar faltando (adicionadas em migrações anteriores)
ALTER TABLE configuracoes
  ADD COLUMN IF NOT EXISTS restaurante_nome     TEXT    DEFAULT 'Meu Restaurante',
  ADD COLUMN IF NOT EXISTS restaurante_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS cor_primaria         TEXT    DEFAULT '#1A9B8A',
  ADD COLUMN IF NOT EXISTS banner_imagem_url    TEXT;

-- Nota: a linha id=1 existente pode continuar sem tenant_id (legado).
-- Novos tenants terão suas próprias linhas via upsert por tenant_id.
