CREATE TABLE IF NOT EXISTS suporte_videos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo      TEXT NOT NULL,
  descricao   TEXT,
  youtube_id  TEXT NOT NULL,           -- só o ID do vídeo (ex: dQw4w9WgXcQ)
  categoria   TEXT NOT NULL DEFAULT 'geral',
  ordem       INTEGER NOT NULL DEFAULT 0,
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suporte_videos_categoria ON suporte_videos (categoria);
CREATE INDEX IF NOT EXISTS idx_suporte_videos_ordem     ON suporte_videos (ordem);
