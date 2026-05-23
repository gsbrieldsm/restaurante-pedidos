-- Código único de indicação para cada parceiro aprovado
ALTER TABLE parceiros_leads
  ADD COLUMN IF NOT EXISTS codigo_indicacao TEXT UNIQUE;

-- Vincula o tenant ao parceiro que o indicou
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS indicado_por TEXT;

-- Índice para buscas rápidas (quais tenants foram indicados por um parceiro)
CREATE INDEX IF NOT EXISTS idx_tenants_indicado_por ON tenants (indicado_por);
