-- ============================================================
-- SCHEMA INICIAL — Sistema de Pedidos Restaurante
-- ============================================================

-- Extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- MESAS
-- ============================================================
CREATE TABLE mesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INTEGER NOT NULL UNIQUE,
  qr_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status TEXT NOT NULL DEFAULT 'livre' CHECK (status IN ('livre', 'ocupada', 'aguardando_pagamento')),
  capacidade INTEGER DEFAULT 4,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SESSÕES DE MESA (cada vez que uma mesa é ocupada)
-- ============================================================
CREATE TABLE sessoes_mesa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id UUID NOT NULL REFERENCES mesas(id),
  cliente_nome TEXT NOT NULL,
  cliente_whatsapp TEXT,
  aberta_em TIMESTAMPTZ DEFAULT NOW(),
  fechada_em TIMESTAMPTZ,
  ativa BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- CARDÁPIO
-- ============================================================
CREATE TABLE cardapio_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2) NOT NULL,
  categoria TEXT NOT NULL,
  estacao TEXT NOT NULL CHECK (estacao IN ('cozinha', 'bar', 'drinks', 'chopeira')),
  tempo_preparo_estimado INTEGER NOT NULL DEFAULT 10,
  disponivel BOOLEAN DEFAULT TRUE,
  imagem_url TEXT,
  ordem INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PEDIDOS
-- ============================================================
CREATE TABLE pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id UUID NOT NULL REFERENCES sessoes_mesa(id),
  mesa_id UUID NOT NULL REFERENCES mesas(id),
  mesa_numero INTEGER NOT NULL,
  cliente_nome TEXT NOT NULL,
  cliente_whatsapp TEXT,
  status_geral TEXT NOT NULL DEFAULT 'aguardando'
    CHECK (status_geral IN ('aguardando', 'em_preparo', 'pronto', 'entregue', 'cancelado')),
  observacao_geral TEXT,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  whatsapp_enviado_confirmacao BOOLEAN DEFAULT FALSE,
  whatsapp_enviado_preparo BOOLEAN DEFAULT FALSE,
  whatsapp_enviado_pronto BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ITENS DO PEDIDO
-- ============================================================
CREATE TABLE pedido_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES cardapio_itens(id),
  item_nome TEXT NOT NULL,
  item_preco DECIMAL(10,2) NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  observacao TEXT,
  estacao TEXT NOT NULL CHECK (estacao IN ('cozinha', 'bar', 'drinks', 'chopeira')),
  tempo_preparo_estimado INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'aguardando'
    CHECK (status IN ('aguardando', 'em_preparo', 'pronto', 'entregue', 'cancelado')),
  iniciado_em TIMESTAMPTZ,
  pronto_em TIMESTAMPTZ,
  entregue_em TIMESTAMPTZ,
  tempo_real_minutos INTEGER,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LOG DE NOTIFICAÇÕES WHATSAPP (preparado para o futuro)
-- ============================================================
CREATE TABLE notificacoes_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('confirmacao', 'em_preparo', 'pronto', 'entregue')),
  mensagem TEXT NOT NULL,
  numero_destino TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'erro')),
  erro_detalhes TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIGGER: atualizar atualizado_em nos pedidos
-- ============================================================
CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pedidos_atualizado_em
  BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

-- ============================================================
-- TRIGGER: calcular tempo_real_minutos ao marcar pronto
-- ============================================================
CREATE OR REPLACE FUNCTION calcular_tempo_preparo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pronto_em IS NOT NULL AND NEW.iniciado_em IS NOT NULL AND OLD.pronto_em IS NULL THEN
    NEW.tempo_real_minutos = EXTRACT(EPOCH FROM (NEW.pronto_em - NEW.iniciado_em)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calcular_tempo
  BEFORE UPDATE ON pedido_itens
  FOR EACH ROW EXECUTE FUNCTION calcular_tempo_preparo();

-- ============================================================
-- TRIGGER: atualizar status_geral do pedido conforme itens
-- ============================================================
CREATE OR REPLACE FUNCTION atualizar_status_pedido()
RETURNS TRIGGER AS $$
DECLARE
  total_itens INTEGER;
  itens_prontos INTEGER;
  itens_em_preparo INTEGER;
  itens_aguardando INTEGER;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'pronto' OR status = 'entregue'),
    COUNT(*) FILTER (WHERE status = 'em_preparo'),
    COUNT(*) FILTER (WHERE status = 'aguardando')
  INTO total_itens, itens_prontos, itens_em_preparo, itens_aguardando
  FROM pedido_itens
  WHERE pedido_id = NEW.pedido_id AND status != 'cancelado';

  IF total_itens = 0 THEN
    RETURN NEW;
  END IF;

  IF itens_prontos = total_itens THEN
    UPDATE pedidos SET status_geral = 'pronto' WHERE id = NEW.pedido_id AND status_geral != 'entregue';
  ELSIF itens_em_preparo > 0 OR itens_prontos > 0 THEN
    UPDATE pedidos SET status_geral = 'em_preparo' WHERE id = NEW.pedido_id AND status_geral = 'aguardando';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_status_pedido
  AFTER UPDATE ON pedido_itens
  FOR EACH ROW EXECUTE FUNCTION atualizar_status_pedido();

-- ============================================================
-- VIEWS ÚTEIS
-- ============================================================

-- Vista de mesas com info do pedido ativo
CREATE VIEW view_mesas_status AS
SELECT
  m.id,
  m.numero,
  m.status,
  m.capacidade,
  sm.id AS sessao_id,
  sm.cliente_nome,
  sm.cliente_whatsapp,
  sm.aberta_em,
  COUNT(p.id) AS total_pedidos,
  COUNT(p.id) FILTER (WHERE p.status_geral IN ('aguardando', 'em_preparo')) AS pedidos_ativos,
  MAX(p.criado_em) AS ultimo_pedido_em
FROM mesas m
LEFT JOIN sessoes_mesa sm ON sm.mesa_id = m.id AND sm.ativa = TRUE
LEFT JOIN pedidos p ON p.sessao_id = sm.id
GROUP BY m.id, m.numero, m.status, m.capacidade, sm.id, sm.cliente_nome, sm.cliente_whatsapp, sm.aberta_em;

-- Vista de itens pendentes por estação
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

-- ============================================================
-- SEED: Mesas (1 a 150)
-- ============================================================
INSERT INTO mesas (numero, capacidade)
SELECT n, 1
FROM generate_series(1, 150) AS n;

-- ============================================================
-- SEED: Cardápio
-- ============================================================
INSERT INTO cardapio_itens (nome, descricao, preco, categoria, estacao, tempo_preparo_estimado, ordem) VALUES
  -- COZINHA
  ('Picanha 300g', 'Picanha grelhada com arroz, farofa e vinagrete', 68.90, 'Carnes', 'cozinha', 20, 1),
  ('Frango Grelhado', 'Filé de frango grelhado com legumes e arroz', 42.90, 'Carnes', 'cozinha', 15, 2),
  ('Batata Frita', 'Porção de batata frita crocante (300g)', 22.90, 'Porções', 'cozinha', 12, 3),
  ('Calabresa Acebolada', 'Porção de calabresa grelhada com cebola', 28.90, 'Porções', 'cozinha', 10, 4),
  ('Isca de Frango', 'Isca de frango empanada com molho barbecue', 32.90, 'Porções', 'cozinha', 12, 5),
  ('Misto Quente', 'Pão de forma com presunto e queijo grelhado', 16.90, 'Lanches', 'cozinha', 8, 6),
  -- BAR
  ('Heineken Long Neck', 'Cerveja Heineken 330ml gelada', 12.90, 'Cervejas', 'bar', 2, 1),
  ('Brahma Long Neck', 'Cerveja Brahma 330ml gelada', 9.90, 'Cervejas', 'bar', 2, 2),
  ('Stella Artois Long Neck', 'Cerveja Stella Artois 330ml', 13.90, 'Cervejas', 'bar', 2, 3),
  ('Água Mineral 500ml', 'Água mineral sem gás', 5.90, 'Não Alcoólicos', 'bar', 1, 4),
  ('Refrigerante Lata', 'Coca-Cola, Guaraná ou Sprite 350ml', 7.90, 'Não Alcoólicos', 'bar', 1, 5),
  ('Suco Natural', 'Suco de laranja, limão ou maracujá 300ml', 12.90, 'Não Alcoólicos', 'bar', 5, 6),
  -- DRINKS
  ('Caipirinha Clássica', 'Cachaça, limão, açúcar e gelo', 22.90, 'Drinks', 'drinks', 5, 1),
  ('Caipiroska', 'Vodka, limão, açúcar e gelo', 24.90, 'Drinks', 'drinks', 5, 2),
  ('Gin Tônica', 'Gin, água tônica, limão e especiarias', 28.90, 'Drinks', 'drinks', 5, 3),
  ('Moscow Mule', 'Vodka, ginger beer e limão', 28.90, 'Drinks', 'drinks', 5, 4),
  ('Aperol Spritz', 'Aperol, espumante e água com gás', 32.90, 'Drinks', 'drinks', 5, 5),
  ('Mojito', 'Rum, hortelã, limão, açúcar e gelo', 26.90, 'Drinks', 'drinks', 7, 6),
  -- CHOPEIRA
  ('Chopp Pilsen 300ml', 'Chopp gelado Pilsen 300ml', 8.90, 'Chopp', 'chopeira', 2, 1),
  ('Chopp Pilsen 500ml', 'Chopp gelado Pilsen 500ml', 13.90, 'Chopp', 'chopeira', 2, 2),
  ('Chopp Escuro 300ml', 'Chopp escuro artesanal 300ml', 11.90, 'Chopp', 'chopeira', 2, 3),
  ('Chopp Escuro 500ml', 'Chopp escuro artesanal 500ml', 17.90, 'Chopp', 'chopeira', 2, 4);

-- ============================================================
-- RLS (Row Level Security) — habilitar para segurança
-- ============================================================
ALTER TABLE mesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessoes_mesa ENABLE ROW LEVEL SECURITY;
ALTER TABLE cardapio_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes_whatsapp ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para service_role (backend)
CREATE POLICY "service_role_all" ON mesas FOR ALL USING (true);
CREATE POLICY "service_role_all" ON sessoes_mesa FOR ALL USING (true);
CREATE POLICY "service_role_all" ON cardapio_itens FOR ALL USING (true);
CREATE POLICY "service_role_all" ON pedidos FOR ALL USING (true);
CREATE POLICY "service_role_all" ON pedido_itens FOR ALL USING (true);
CREATE POLICY "service_role_all" ON notificacoes_whatsapp FOR ALL USING (true);

-- Cardápio pode ser lido por anônimos (app do cliente)
CREATE POLICY "cardapio_publico_leitura" ON cardapio_itens
  FOR SELECT USING (disponivel = true);

-- Mesas podem ser lidas por anônimos (para validar token do QR)
CREATE POLICY "mesas_publico_leitura" ON mesas
  FOR SELECT USING (true);
