-- Identidade visual configurável por restaurante
ALTER TABLE configuracoes
  ADD COLUMN IF NOT EXISTS restaurante_nome     TEXT    DEFAULT 'Meu Restaurante',
  ADD COLUMN IF NOT EXISTS restaurante_logo_url TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cor_primaria         TEXT    DEFAULT '#1A9B8A';
