-- Recria view_mesas_status incluindo tenant_id para filtragem por tenant
CREATE OR REPLACE VIEW view_mesas_status AS
SELECT
  m.id,
  m.numero,
  m.status,
  m.capacidade,
  m.tenant_id,
  m.qr_token,
  sm.id           AS sessao_id,
  sm.cliente_nome,
  sm.cliente_whatsapp,
  sm.aberta_em,
  COUNT(p.id)     AS total_pedidos,
  COUNT(p.id) FILTER (WHERE p.status_geral IN ('aguardando', 'em_preparo')) AS pedidos_ativos,
  MAX(p.criado_em) AS ultimo_pedido_em
FROM mesas m
LEFT JOIN sessoes_mesa sm ON sm.mesa_id = m.id AND sm.ativa = TRUE
LEFT JOIN pedidos p ON p.sessao_id = sm.id
GROUP BY m.id, m.numero, m.status, m.capacidade, m.tenant_id, m.qr_token,
         sm.id, sm.cliente_nome, sm.cliente_whatsapp, sm.aberta_em;
