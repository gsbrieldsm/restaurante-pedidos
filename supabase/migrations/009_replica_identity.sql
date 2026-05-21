-- Habilita REPLICA IDENTITY FULL nas tabelas principais
-- Isso permite filtros por coluna no Supabase Realtime (postgres_changes)
-- Sem isso, filtros como filter: "estacao=eq.cozinha" são silenciosamente ignorados

ALTER TABLE pedido_itens REPLICA IDENTITY FULL;
ALTER TABLE pedidos      REPLICA IDENTITY FULL;
ALTER TABLE sessoes_mesa REPLICA IDENTITY FULL;
