-- ============================================================
-- USUÁRIOS DO SISTEMA (acesso ao painel e estações)
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      TEXT NOT NULL,
  email     TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,            -- scrypt: salt:hash
  cargo     TEXT NOT NULL DEFAULT 'operador'
              CHECK (cargo IN ('admin', 'operador')),
  ativo     BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
-- Apenas service_role (backend) acessa esta tabela
CREATE POLICY "service_role_all" ON usuarios FOR ALL USING (true);
