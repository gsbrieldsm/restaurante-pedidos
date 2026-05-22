-- Corrige constraint unique em mesas.numero para ser por tenant
-- Antes: UNIQUE(numero) — impedia 2 tenants de ter mesa 1
-- Depois: UNIQUE(tenant_id, numero) — cada tenant tem seus próprios números

ALTER TABLE mesas DROP CONSTRAINT IF EXISTS mesas_numero_key;

ALTER TABLE mesas ADD CONSTRAINT mesas_tenant_numero_unique UNIQUE (tenant_id, numero);
