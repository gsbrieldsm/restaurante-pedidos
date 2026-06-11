-- ──────────────────────────────────────────────────────────────────────────────
-- 043 · Controle de estoque de chopes (torneiras)
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Cadastro dos chopes / torneiras
CREATE TABLE IF NOT EXISTS chopes (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome              TEXT        NOT NULL,
  estilo            TEXT        NOT NULL,
  torneira          INTEGER,
  fornecedor        TEXT,
  unidade           TEXT        NOT NULL DEFAULT 'L',
  capacidade_barril NUMERIC(10,2) NOT NULL DEFAULT 30,
  estoque_atual     NUMERIC(10,2) NOT NULL DEFAULT 0,
  estoque_minimo    NUMERIC(10,2) NOT NULL DEFAULT 0,
  estoque_critico   NUMERIC(10,2) NOT NULL DEFAULT 0,
  ativo             BOOLEAN     NOT NULL DEFAULT true,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, torneira)
);

CREATE INDEX IF NOT EXISTS idx_chopes_tenant ON chopes(tenant_id);

ALTER TABLE chopes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON chopes FOR ALL USING (true);

-- 2. Importações de relatório de vendas
CREATE TABLE IF NOT EXISTS chopes_importacoes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome_arquivo  TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'PROCESSADO',
  resumo        JSONB,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chopes_importacoes_tenant ON chopes_importacoes(tenant_id, criado_em DESC);

ALTER TABLE chopes_importacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON chopes_importacoes FOR ALL USING (true);

-- 3. Movimentações de estoque (entradas, saídas manuais e baixas de venda)
CREATE TABLE IF NOT EXISTS chopes_movimentacoes (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  chope_id       UUID        NOT NULL REFERENCES chopes(id) ON DELETE CASCADE,
  tipo           TEXT        NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA_MANUAL', 'SAIDA_VENDA')),
  quantidade     NUMERIC(10,2) NOT NULL,
  observacao     TEXT,
  importacao_id  UUID        REFERENCES chopes_importacoes(id) ON DELETE SET NULL,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chopes_movimentacoes_tenant ON chopes_movimentacoes(tenant_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_chopes_movimentacoes_chope  ON chopes_movimentacoes(chope_id);

ALTER TABLE chopes_movimentacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON chopes_movimentacoes FOR ALL USING (true);

-- 4. Mapeamento entre nome do produto no relatório de vendas e o chope correspondente
CREATE TABLE IF NOT EXISTS chopes_mapeamentos (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome_relatorio  TEXT        NOT NULL,
  chope_id        UUID        NOT NULL REFERENCES chopes(id) ON DELETE CASCADE,
  fator_conversao NUMERIC(10,4) NOT NULL DEFAULT 1,
  UNIQUE(tenant_id, nome_relatorio)
);

CREATE INDEX IF NOT EXISTS idx_chopes_mapeamentos_tenant ON chopes_mapeamentos(tenant_id);

ALTER TABLE chopes_mapeamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON chopes_mapeamentos FOR ALL USING (true);

-- 5. Função para registrar uma movimentação e ajustar o estoque atomicamente
CREATE OR REPLACE FUNCTION registrar_movimentacao_chope(
  p_chope_id      UUID,
  p_tenant_id     UUID,
  p_tipo          TEXT,
  p_quantidade    NUMERIC,
  p_observacao    TEXT DEFAULT NULL,
  p_importacao_id UUID DEFAULT NULL
)
RETURNS chopes
LANGUAGE plpgsql
AS $$
DECLARE
  v_chope chopes;
BEGIN
  INSERT INTO chopes_movimentacoes (tenant_id, chope_id, tipo, quantidade, observacao, importacao_id)
  VALUES (p_tenant_id, p_chope_id, p_tipo, p_quantidade, p_observacao, p_importacao_id);

  UPDATE chopes
  SET estoque_atual = estoque_atual + p_quantidade,
      atualizado_em = NOW()
  WHERE id = p_chope_id AND tenant_id = p_tenant_id
  RETURNING * INTO v_chope;

  RETURN v_chope;
END;
$$;
