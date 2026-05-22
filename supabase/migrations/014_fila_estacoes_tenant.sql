-- Recria view_fila_estacoes incluindo tenant_id para filtragem por tenant
DROP VIEW IF EXISTS view_fila_estacoes;

CREATE VIEW view_fila_estacoes AS
SELECT
  pi.id,
  pi.pedido_id,
  pi.item_nome,
  pi.quantidade,
  pi.observacao,
  pi.estacao,
  pi.status,
  pi.tempo_preparo_estimado,
  pi.iniciado_em,
  pi.criado_em,
  pi.tenant_id,
  p.mesa_numero,
  p.cliente_nome,
  EXTRACT(EPOCH FROM (NOW() - pi.criado_em)) / 60 AS minutos_aguardando,
  CASE
    WHEN pi.iniciado_em IS NOT NULL
    THEN EXTRACT(EPOCH FROM (NOW() - pi.iniciado_em)) / 60
    ELSE NULL
  END AS minutos_em_preparo
FROM pedido_itens pi
JOIN pedidos p ON p.id = pi.pedido_id
WHERE pi.status IN ('aguardando', 'em_preparo')
ORDER BY pi.criado_em ASC;
