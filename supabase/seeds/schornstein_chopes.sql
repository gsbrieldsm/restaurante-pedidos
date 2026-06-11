-- Seed das 21 torneiras de chope do tenant Schornstein
-- Substitua 'SEU_TENANT_ID' pelo id real do tenant Schornstein (tabela `tenants`)
-- Ajuste nome/estilo/fornecedor/capacidade conforme o cardápio real do cliente.

insert into chopes (tenant_id, nome, estilo, torneira, fornecedor, unidade, capacidade_barril, estoque_atual, estoque_minimo, estoque_critico, ativo)
values
  ('SEU_TENANT_ID', 'Chope 1',  'Pilsen',         1,  null, 'L', 30, 30, 10, 5, true),
  ('SEU_TENANT_ID', 'Chope 2',  'Pilsen',         2,  null, 'L', 30, 30, 10, 5, true),
  ('SEU_TENANT_ID', 'Chope 3',  'IPA',            3,  null, 'L', 30, 30, 10, 5, true),
  ('SEU_TENANT_ID', 'Chope 4',  'Witbier',        4,  null, 'L', 30, 30, 10, 5, true),
  ('SEU_TENANT_ID', 'Chope 5',  'Weiss',          5,  null, 'L', 30, 30, 10, 5, true),
  ('SEU_TENANT_ID', 'Chope 6',  'Vienna Lager',   6,  null, 'L', 30, 30, 10, 5, true),
  ('SEU_TENANT_ID', 'Chope 7',  'Red Ale',        7,  null, 'L', 30, 30, 10, 5, true),
  ('SEU_TENANT_ID', 'Chope 8',  'Stout',          8,  null, 'L', 30, 30, 10, 5, true),
  ('SEU_TENANT_ID', 'Chope 9',  'Pale Ale',       9,  null, 'L', 30, 30, 10, 5, true),
  ('SEU_TENANT_ID', 'Chope 10', 'Porter',         10, null, 'L', 30, 30, 10, 5, true),
  ('SEU_TENANT_ID', 'Chope 11', 'Pilsen',         11, null, 'L', 30, 30, 10, 5, true),
  ('SEU_TENANT_ID', 'Chope 12', 'Lager',          12, null, 'L', 30, 30, 10, 5, true),
  ('SEU_TENANT_ID', 'Chope 13', 'Amber Ale',      13, null, 'L', 30, 30, 10, 5, true),
  ('SEU_TENANT_ID', 'Chope 14', 'Bock',           14, null, 'L', 30, 30, 10, 5, true),
  ('SEU_TENANT_ID', 'Chope 15', 'Frutado',        15, null, 'L', 30, 30, 10, 5, true),
  ('SEU_TENANT_ID', 'Chope 16', 'Pilsen',         16, null, 'L', 30, 30, 10, 5, true),
  ('SEU_TENANT_ID', 'Chope 17', 'IPA',            17, null, 'L', 30, 30, 10, 5, true),
  ('SEU_TENANT_ID', 'Chope 18', 'Pilsen',         18, null, 'L', 30, 30, 10, 5, true),
  ('SEU_TENANT_ID', 'Chope 19', 'Pilsen',         19, null, 'L', 30, 30, 10, 5, true),
  ('SEU_TENANT_ID', 'Chope 20', 'Especial',       20, null, 'L', 30, 30, 10, 5, true),
  ('SEU_TENANT_ID', 'Chope 21', 'Especial',       21, null, 'L', 30, 30, 10, 5, true);
