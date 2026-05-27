-- ============================================================
-- 040_saldo_forma_pagamento.sql
-- Adiciona forma_pagamento às transações de saldo pré-pago
-- ============================================================

ALTER TABLE clientes_saldo_transacoes
  ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(30);
-- dinheiro | pix | debito | credito | (null = estorno/débito automático)
