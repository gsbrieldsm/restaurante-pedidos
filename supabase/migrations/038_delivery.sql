-- ============================================================
-- 038_delivery.sql — Sistema de Delivery
-- ============================================================

-- Configuração de delivery por tenant
CREATE TABLE IF NOT EXISTS delivery_config (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ativo           BOOLEAN DEFAULT false,
  -- Endereço do restaurante (ponto de origem)
  endereco        TEXT,
  numero          VARCHAR(20),
  bairro          TEXT,
  cidade          TEXT,
  uf              VARCHAR(2),
  cep             VARCHAR(9),
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  -- Configurações operacionais
  tempo_estimado  INTEGER DEFAULT 45,       -- minutos
  pedido_minimo   NUMERIC(10,2) DEFAULT 0,
  taxa_padrao     NUMERIC(10,2) DEFAULT 5,  -- R$ (fallback se nenhuma zona cobrir)
  raio_maximo     NUMERIC(6,2) DEFAULT 15,  -- km máximo para entrega
  observacoes     TEXT,                     -- "Entregamos somente nas quintas e sextas"
  criado_em       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Zonas de preço por distância
CREATE TABLE IF NOT EXISTS delivery_zonas (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome      VARCHAR(100) NOT NULL,    -- ex: "Até 3km"
  km_min    NUMERIC(6,2) DEFAULT 0,
  km_max    NUMERIC(6,2) NOT NULL,
  taxa      NUMERIC(10,2) NOT NULL,   -- R$
  ordem     INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Pedidos de delivery
CREATE TABLE IF NOT EXISTS delivery_pedidos (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- Dados do cliente
  cliente_nome      TEXT NOT NULL,
  cliente_telefone  TEXT NOT NULL,
  -- Endereço de entrega
  endereco          TEXT NOT NULL,
  numero            VARCHAR(20),
  complemento       VARCHAR(100),
  bairro            TEXT,
  cidade            TEXT,
  uf                VARCHAR(2),
  cep               VARCHAR(9),
  lat               DOUBLE PRECISION,
  lng               DOUBLE PRECISION,
  distancia_km      NUMERIC(6,2),
  -- Valores
  taxa_entrega      NUMERIC(10,2) DEFAULT 0,
  subtotal          NUMERIC(10,2) DEFAULT 0,
  total             NUMERIC(10,2) DEFAULT 0,
  -- Itens (snapshot do pedido)
  itens             JSONB DEFAULT '[]',
  -- Controle
  status            VARCHAR(30) DEFAULT 'pendente',
  -- pendente | em_preparo | saiu_entrega | entregue | cancelado
  observacoes       TEXT,
  criado_em         TIMESTAMPTZ DEFAULT now(),
  atualizado_em     TIMESTAMPTZ DEFAULT now()
);

-- Trigger para atualizar atualizado_em
CREATE OR REPLACE FUNCTION update_delivery_pedidos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_delivery_pedidos_updated
  BEFORE UPDATE ON delivery_pedidos
  FOR EACH ROW EXECUTE FUNCTION update_delivery_pedidos_updated_at();

-- Índices
CREATE INDEX IF NOT EXISTS idx_delivery_config_tenant  ON delivery_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_zonas_tenant   ON delivery_zonas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_pedidos_tenant ON delivery_pedidos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_pedidos_status ON delivery_pedidos(status);
