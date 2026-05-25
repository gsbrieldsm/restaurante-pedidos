-- Tabela de chamados / sugestões enviados pelos restaurantes
CREATE TABLE IF NOT EXISTS chamados (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        REFERENCES tenants(id) ON DELETE CASCADE,
  tipo        TEXT        NOT NULL DEFAULT 'sugestao' CHECK (tipo IN ('sugestao', 'bug', 'duvida', 'outro')),
  mensagem    TEXT        NOT NULL,
  anonimo     BOOLEAN     NOT NULL DEFAULT FALSE,
  nome_autor  TEXT,                    -- preenchido se não anônimo
  status      TEXT        NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_analise', 'resolvido', 'fechado')),
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chamados_tenant ON chamados (tenant_id);
CREATE INDEX IF NOT EXISTS idx_chamados_status ON chamados (status);
CREATE INDEX IF NOT EXISTS idx_chamados_criado ON chamados (criado_em DESC);
