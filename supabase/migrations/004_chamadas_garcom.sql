-- Chamadas do cliente para o garçom
CREATE TABLE chamadas_garcom (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id   UUID NOT NULL REFERENCES sessoes_mesa(id),
  mesa_id     UUID NOT NULL REFERENCES mesas(id),
  mesa_numero INTEGER NOT NULL,
  cliente_nome TEXT NOT NULL,
  motivo      TEXT NOT NULL DEFAULT 'conta', -- 'conta' | 'ajuda' | 'pix_pago'
  atendida    BOOLEAN DEFAULT FALSE,
  criado_em   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chamadas_garcom ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON chamadas_garcom FOR ALL USING (true);
