-- CRM comercial para parceiros Menuê+
-- Cada parceiro tem seu próprio funil de prospecção

CREATE TABLE IF NOT EXISTS parceiro_crm_leads (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  parceiro_id UUID        NOT NULL REFERENCES parceiros_leads(id) ON DELETE CASCADE,
  nome        TEXT        NOT NULL,
  celular     TEXT,
  plano       TEXT        CHECK (plano IN ('starter', 'pro', 'business', 'enterprise')),
  etapa       TEXT        NOT NULL DEFAULT 'prospeccao'
                          CHECK (etapa IN ('prospeccao', 'contato_ativo', 'agendar_demo', 'fechado', 'perdido')),
  notas       TEXT,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index para busca por parceiro
CREATE INDEX IF NOT EXISTS idx_parceiro_crm_leads_parceiro ON parceiro_crm_leads(parceiro_id);

-- Sem RLS — acesso exclusivo via service key com verificação do parceiro_id
