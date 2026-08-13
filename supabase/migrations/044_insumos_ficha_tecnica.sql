-- Migration 044: Insumos e Ficha Técnica por item do cardápio
-- Permite registrar ingredientes com custo unitário e calcular CMV real

-- Catálogo de insumos do tenant (reutilizável entre itens)
CREATE TABLE IF NOT EXISTS insumos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome        TEXT        NOT NULL,
  unidade     TEXT        NOT NULL DEFAULT 'un',  -- kg, g, l, ml, un, cx, pç...
  custo_unit  DECIMAL(10,4) NOT NULL DEFAULT 0,
  criado_em   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insumos_tenant ON insumos (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_insumos_nome_tenant ON insumos (tenant_id, nome);

ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON insumos FOR ALL USING (true);

-- Ficha técnica: insumos por item do cardápio
CREATE TABLE IF NOT EXISTS cardapio_item_insumos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID        NOT NULL REFERENCES cardapio_itens(id) ON DELETE CASCADE,
  insumo_id   UUID        NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  quantidade  DECIMAL(10,4) NOT NULL DEFAULT 1,
  criado_em   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (item_id, insumo_id)
);

CREATE INDEX IF NOT EXISTS idx_item_insumos_item ON cardapio_item_insumos (item_id);
CREATE INDEX IF NOT EXISTS idx_item_insumos_tenant ON cardapio_item_insumos (tenant_id);

ALTER TABLE cardapio_item_insumos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON cardapio_item_insumos FOR ALL USING (true);
