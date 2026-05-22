-- Tabela de tenants (donos de restaurante no SaaS)
CREATE TABLE IF NOT EXISTS tenants (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT        UNIQUE NOT NULL,          -- subdomínio: joao.meumenu.com.br
  nome            TEXT        NOT NULL,                 -- nome do responsável
  nome_restaurante TEXT       NOT NULL,
  email           TEXT        UNIQUE NOT NULL,
  senha_hash      TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'ativo', -- ativo | suspenso | pendente
  plano           TEXT        NOT NULL DEFAULT 'basico',
  plano_aceito_em TIMESTAMPTZ DEFAULT NULL,             -- quando aceitou os termos/valores
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON tenants FOR ALL USING (true);

-- Adiciona tenant_id nas tabelas principais (com DEFAULT NULL para não quebrar dados existentes)
ALTER TABLE mesas              ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE sessoes_mesa        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE cardapio_itens      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE cardapio_grupos_opcao ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE cardapio_opcoes     ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE pedidos             ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE pedido_itens        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE chamadas_garcom     ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE pagamentos          ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE configuracoes      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE usuarios           ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
