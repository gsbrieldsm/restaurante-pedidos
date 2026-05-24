-- Corrige alertas do Supabase Advisor: views com SECURITY DEFINER
-- Recria ambas as views com SECURITY INVOKER (padrão seguro)

-- ── view_mesas_status ────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.view_mesas_status
  WITH (security_invoker = true)
AS
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

-- ── view_fila_estacoes ───────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.view_fila_estacoes;

CREATE VIEW public.view_fila_estacoes
  WITH (security_invoker = true)
AS
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
