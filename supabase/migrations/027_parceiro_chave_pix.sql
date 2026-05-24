-- Chave PIX do parceiro para recebimento de comissões
ALTER TABLE parceiros_leads
  ADD COLUMN IF NOT EXISTS chave_pix TEXT;

COMMENT ON COLUMN parceiros_leads.chave_pix IS
  'Chave PIX informada pelo parceiro para recebimento de comissões (CPF, CNPJ, e-mail, telefone ou aleatória)';
