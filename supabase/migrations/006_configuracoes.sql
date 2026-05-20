-- Tabela de configurações globais do sistema (single-row)
CREATE TABLE IF NOT EXISTS configuracoes (
  id INTEGER PRIMARY KEY DEFAULT 1,
  banner_ativo     BOOLEAN DEFAULT false,
  banner_titulo    TEXT    DEFAULT 'Bem-vindo ao Meu Menu+! 🎉',
  banner_subtitulo TEXT    DEFAULT 'Veja nossas novidades do dia',
  banner_emoji     TEXT    DEFAULT '🍽️',
  banner_estilo    TEXT    DEFAULT 'teal',
  atualizado_em    TIMESTAMPTZ DEFAULT NOW()
);

-- Garante que sempre existe uma linha de config
INSERT INTO configuracoes (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

-- Leitura pública (banner é dado público)
CREATE POLICY "public_select" ON configuracoes
  FOR SELECT USING (true);
