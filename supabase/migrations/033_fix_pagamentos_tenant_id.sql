-- Corrige pagamentos históricos que ficaram sem tenant_id
-- (bug: o insert não incluía tenant_id, então o painel financeiro não os exibia)
UPDATE pagamentos p
SET tenant_id = sm.tenant_id
FROM sessoes_mesa sm
WHERE p.sessao_id = sm.id
  AND p.tenant_id IS NULL
  AND sm.tenant_id IS NOT NULL;
