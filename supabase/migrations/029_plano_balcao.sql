-- Migration 029: Plano Balcão
-- Adiciona suporte a pedidos de balcão (totem) com senha de retirada

-- 1. Torna sessao_id e mesa_id opcionais em pedidos (balcão não tem mesa)
ALTER TABLE pedidos
  ALTER COLUMN sessao_id DROP NOT NULL,
  ALTER COLUMN mesa_id   DROP NOT NULL;

-- 2. Tipo de pedido
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS tipo_pedido TEXT NOT NULL DEFAULT 'mesa'
    CHECK (tipo_pedido IN ('mesa', 'balcao'));

-- 3. Senha de retirada (número sequencial diário por tenant)
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS senha_balcao INTEGER;

-- 4. Índice para busca rápida de senha por tenant+data
CREATE INDEX IF NOT EXISTS idx_pedidos_senha_balcao
  ON pedidos (tenant_id, senha_balcao)
  WHERE tipo_pedido = 'balcao';

-- 5. Função para gerar próxima senha do dia (reinicia às 00h por tenant)
CREATE OR REPLACE FUNCTION proxima_senha_balcao(p_tenant_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  ultima INTEGER;
BEGIN
  SELECT COALESCE(MAX(senha_balcao), 0)
  INTO ultima
  FROM pedidos
  WHERE tenant_id   = p_tenant_id
    AND tipo_pedido = 'balcao'
    AND criado_em  >= CURRENT_DATE;

  RETURN ultima + 1;
END;
$$;
