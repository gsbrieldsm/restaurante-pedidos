-- Tabela de leads do programa de parceiros
CREATE TABLE IF NOT EXISTS parceiros_leads (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  nome        TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  whatsapp    TEXT        NOT NULL,
  cidade      TEXT,
  como        TEXT,                                         -- como pretende indicar
  status      TEXT        NOT NULL DEFAULT 'novo',          -- novo | contactado | aprovado | recusado
  notas       TEXT,                                         -- anotações internas do superadmin
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sem RLS — acesso exclusivo via service key pelo superadmin
-- Nenhum dado sensível além de contato profissional
