-- ──────────────────────────────────────────────────────────────────────────────
-- 035 · Carteira de saldo pré-pago por cliente (vinculado ao telefone)
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Tabela principal — um registro por (tenant, telefone)
CREATE TABLE IF NOT EXISTS clientes_saldo (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  telefone          TEXT        NOT NULL,            -- dígitos apenas, ex: 47999990000
  nome              TEXT,
  saldo_disponivel  NUMERIC(10,2) NOT NULL DEFAULT 0
    CONSTRAINT saldo_nao_negativo CHECK (saldo_disponivel >= 0),
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, telefone)
);

-- 2. Histórico de movimentações (crédito / débito / estorno)
CREATE TABLE IF NOT EXISTS clientes_saldo_transacoes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL,
  cliente_id       UUID        NOT NULL REFERENCES clientes_saldo(id) ON DELETE CASCADE,
  tipo             TEXT        NOT NULL CHECK (tipo IN ('credito', 'debito', 'estorno')),
  valor            NUMERIC(10,2) NOT NULL CHECK (valor > 0),
  saldo_anterior   NUMERIC(10,2) NOT NULL,
  saldo_posterior  NUMERIC(10,2) NOT NULL,
  descricao        TEXT,
  pedido_id        UUID        REFERENCES pedidos(id) ON DELETE SET NULL,
  criado_por       UUID        REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Índices úteis para buscas
CREATE INDEX IF NOT EXISTS idx_clientes_saldo_tenant     ON clientes_saldo(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clientes_saldo_telefone   ON clientes_saldo(tenant_id, telefone);
CREATE INDEX IF NOT EXISTS idx_saldo_transacoes_cliente  ON clientes_saldo_transacoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_saldo_transacoes_tenant   ON clientes_saldo_transacoes(tenant_id, criado_em DESC);

-- 4. Feature flag por tenant nas configurações
ALTER TABLE configuracoes
  ADD COLUMN IF NOT EXISTS saldo_habilitado BOOLEAN NOT NULL DEFAULT false;

-- 5. Função PostgreSQL para débito atômico (evita saldo negativo em requisições concorrentes)
--    Retorna o registro atualizado ou NULL se saldo insuficiente.
CREATE OR REPLACE FUNCTION debitar_saldo(
  p_cliente_id  UUID,
  p_tenant_id   UUID,
  p_valor       NUMERIC,
  p_pedido_id   UUID,
  p_descricao   TEXT DEFAULT 'Pedido'
)
RETURNS clientes_saldo
LANGUAGE plpgsql
AS $$
DECLARE
  v_anterior  NUMERIC;
  v_posterior NUMERIC;
  v_cliente   clientes_saldo;
BEGIN
  -- Bloqueia a linha para evitar corrida (SELECT FOR UPDATE)
  SELECT * INTO v_cliente
  FROM clientes_saldo
  WHERE id = p_cliente_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'cliente_nao_encontrado';
  END IF;

  IF v_cliente.saldo_disponivel < p_valor THEN
    RAISE EXCEPTION 'saldo_insuficiente';
  END IF;

  v_anterior  := v_cliente.saldo_disponivel;
  v_posterior := v_anterior - p_valor;

  UPDATE clientes_saldo
  SET saldo_disponivel = v_posterior,
      atualizado_em    = NOW()
  WHERE id = p_cliente_id
  RETURNING * INTO v_cliente;

  INSERT INTO clientes_saldo_transacoes
    (tenant_id, cliente_id, tipo, valor, saldo_anterior, saldo_posterior, descricao, pedido_id)
  VALUES
    (p_tenant_id, p_cliente_id, 'debito', p_valor, v_anterior, v_posterior, p_descricao, p_pedido_id);

  RETURN v_cliente;
END;
$$;
