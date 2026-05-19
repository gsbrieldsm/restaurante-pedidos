-- Tabela de pagamentos ao fechar mesa
CREATE TABLE pagamentos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id   UUID NOT NULL REFERENCES sessoes_mesa(id),
  mesa_id     UUID NOT NULL REFERENCES mesas(id),
  mesa_numero INTEGER NOT NULL,
  cliente_nome TEXT NOT NULL,
  forma       TEXT NOT NULL CHECK (forma IN ('dinheiro','pix','debito','credito')),
  valor       NUMERIC(10,2) NOT NULL,
  criado_em   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON pagamentos FOR ALL USING (true);
