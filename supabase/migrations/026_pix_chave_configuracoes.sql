-- Adiciona chave PIX do restaurante nas configurações
-- Cada restaurante define sua própria chave; se NULL, o botão de PIX não aparece para o cliente

ALTER TABLE configuracoes
  ADD COLUMN IF NOT EXISTS pix_chave TEXT DEFAULT NULL;
