-- Migration 042: Corrige regressão de segurança em view_mesas_status
--
-- A migration 028 corrigiu esta view adicionando WITH (security_invoker = true)
-- (alerta CRITICAL do Supabase Advisor: "Security Definer View" — sem essa opção,
-- a view executa com as permissões do criador, ignorando o RLS de quem consulta,
-- o que pode vazar dados entre tenants).
--
-- A migration 037 recriou a view do zero para adicionar a coluna `nome` e acabou
-- removendo essa proteção sem perceber (CREATE VIEW sem WITH (security_invoker = true)).
-- Esta migration restaura a opção segura mantendo as colunas adicionadas em 037.

DROP VIEW IF EXISTS public.view_mesas_status;

CREATE VIEW public.view_mesas_status
  WITH (security_invoker = true)
AS
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

COMMENT ON VIEW public.view_mesas_status IS
  'Status das mesas por tenant. IMPORTANTE: deve sempre ser recriada com WITH (security_invoker = true) — sem essa opção o Supabase Advisor reporta CRITICAL "Security Definer View" pois a view passaria a ignorar o RLS de quem consulta.';
