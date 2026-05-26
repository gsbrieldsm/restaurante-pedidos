-- Migration 037: nome personalizado para mesas (Business+)
-- Permite identificar QR codes como "Arquibancada Quadra 1", "Mesa VIP", etc.

ALTER TABLE mesas
  ADD COLUMN IF NOT EXISTS nome VARCHAR(100) DEFAULT NULL;

-- Recria a view incluindo o novo campo
DROP VIEW IF EXISTS view_mesas_status;
CREATE VIEW view_mesas_status AS
SELECT
  m.id,
  m.tenant_id,
  m.numero,
  m.nome,
  m.qr_token,
  m.status,
  m.capacidade,
  m.criado_em,
  COUNT(s.id) FILTER (WHERE s.ativa = true) AS sessoes_ativas
FROM mesas m
LEFT JOIN sessoes_mesa s ON s.mesa_id = m.id
GROUP BY m.id;
