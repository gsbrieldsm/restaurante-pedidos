-- Migration 036: OTP de verificação de celular para saldo pré-pago
-- Adiciona campos de verificação WhatsApp na tabela clientes_saldo

ALTER TABLE clientes_saldo
  ADD COLUMN IF NOT EXISTS verificado        BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS otp_code          VARCHAR(6),
  ADD COLUMN IF NOT EXISTS otp_expira_em     TIMESTAMPTZ;

-- Índice para busca por OTP (raro mas útil para invalidação em massa se necessário)
CREATE INDEX IF NOT EXISTS idx_clientes_saldo_otp
  ON clientes_saldo (tenant_id, otp_code)
  WHERE otp_code IS NOT NULL;

-- Clientes existentes que já têm saldo carregado são marcados como verificados
-- (foram cadastrados manualmente pelo garçom, confiáveis)
UPDATE clientes_saldo
SET verificado = true
WHERE saldo_disponivel > 0 OR id IN (
  SELECT DISTINCT cliente_id FROM clientes_saldo_transacoes
);
