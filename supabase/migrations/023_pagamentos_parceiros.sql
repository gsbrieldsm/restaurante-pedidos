-- Tabela de pagamentos manuais para parceiros (sem Stripe)
CREATE TABLE IF NOT EXISTS pagamentos_parceiros (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  parceiro_id  UUID        NOT NULL REFERENCES parceiros_leads(id) ON DELETE CASCADE,
  tenant_id    UUID        REFERENCES tenants(id) ON DELETE SET NULL, -- para implementação, nulo para recorrente
  tipo         TEXT        NOT NULL CHECK (tipo IN ('implementacao', 'recorrente')),
  valor        NUMERIC(10,2) NOT NULL,
  referencia   TEXT        NOT NULL, -- ex: "Maio 2026" para recorrente, nome do restaurante para impl.
  observacao   TEXT,
  pago_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_parceiro ON pagamentos_parceiros (parceiro_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_tenant   ON pagamentos_parceiros (tenant_id);
