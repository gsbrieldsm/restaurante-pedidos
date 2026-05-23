-- ─── Migração 020: Banner separado para mobile ───────────────────────────────
ALTER TABLE configuracoes
  ADD COLUMN IF NOT EXISTS banner_imagem_url_mobile TEXT;
