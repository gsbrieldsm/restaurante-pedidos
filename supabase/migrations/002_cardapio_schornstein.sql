-- ============================================================
-- CARDÁPIO REAL — Schornstein Shopping H
-- ============================================================

DELETE FROM cardapio_itens;

INSERT INTO cardapio_itens (nome, descricao, preco, categoria, estacao, tempo_preparo_estimado, disponivel, ordem) VALUES

-- ============================================================
-- ESPECIAIS DA CASA
-- ============================================================
('Hackepeter',
 'Tartare alemão tradicional com especiarias, acompanhamentos e torradas',
 89.00, 'Especiais da Casa', 'cozinha', 15, true, 1),

('Bratwurst — O Combo do Alemão',
 'Linguiça bratwurst grelhada com acompanhamentos típicos alemães',
 64.00, 'Especiais da Casa', 'cozinha', 15, true, 2),

('Tiras de Filé à Tennessee',
 'Tiras de filé mignon grelhadas ao molho Tennessee',
 99.00, 'Especiais da Casa', 'cozinha', 20, true, 3),

('Provoleta com Abacaxi ao Caldo de Chile',
 'Provolone grelhado com abacaxi caramelizado e caldo de pimenta',
 39.00, 'Especiais da Casa', 'cozinha', 10, true, 4),

('Schnapswurst — Linguiça Blumenau Flambada',
 'Linguiça artesanal de Blumenau flambada na hora',
 59.00, 'Especiais da Casa', 'cozinha', 12, true, 5),

('Brie Vermont Empanado',
 'Queijo brie empanado e frito, servido com geleia',
 75.90, 'Especiais da Casa', 'cozinha', 12, true, 6),

('Linguiça, Calabresa com Ervas e Queijo Mussarela Derretido',
 'Trio de linguiças com queijo mussarela derretido e ervas finas',
 85.00, 'Especiais da Casa', 'cozinha', 15, true, 7),

('Tábua de Queijos Schornstein',
 'Seleção de queijos artesanais acompanhados de geleia e torradas',
 149.00, 'Especiais da Casa', 'cozinha', 10, true, 8),

-- ============================================================
-- ALMOÇO EXECUTIVO
-- ============================================================
('Feijão de Chaleira',
 'Feijão de chaleira com arroz e acompanhamentos',
 44.00, 'Almoço Executivo', 'cozinha', 15, true, 1),

('Costelinha Grelhada',
 'Costelinha grelhada com arroz, feijão e fritas',
 44.00, 'Almoço Executivo', 'cozinha', 20, true, 2),

('Filé de Tilápia Belle Meunière',
 'Filé de tilápia ao molho belle meunière com arroz, feijão e fritas',
 44.00, 'Almoço Executivo', 'cozinha', 20, true, 3),

-- ============================================================
-- ALMOÇO PREMIUM
-- ============================================================
('Salmão Grelhado',
 'Salmão grelhado com legumes e acompanhamentos',
 69.00, 'Almoço Premium', 'cozinha', 20, true, 1),

('Costela 12 Horas',
 'Costela bovina cozida por 12 horas com acompanhamentos',
 48.00, 'Almoço Premium', 'cozinha', 15, true, 2),

('Churrasco Executivo',
 'Churrasco com linguiça, costelinha e pão de alho',
 69.00, 'Almoço Premium', 'cozinha', 20, true, 3),

-- ============================================================
-- BURGERS ARTESANAIS E LANCHES
-- ============================================================
('Burger de Picanha',
 'Burger artesanal de picanha com complementos especiais',
 54.90, 'Burgers e Lanches', 'cozinha', 15, true, 1),

('Burger Defumado',
 'Burger defumado com ingredientes selecionados',
 44.90, 'Burgers e Lanches', 'cozinha', 15, true, 2),

('Ringwurst de Linguiça Blumenau',
 'Linguiça artesanal de Blumenau no pão com acompanhamentos',
 44.90, 'Burgers e Lanches', 'cozinha', 12, true, 3),

('Brot mit Wurst',
 'Pão artesanal com linguiça defumada e mostarda',
 45.90, 'Burgers e Lanches', 'cozinha', 12, true, 4),

-- ============================================================
-- PORÇÕES
-- ============================================================
('Bolinho de Costela',
 'Bolinhos crocantes recheados com costela desfiada',
 39.90, 'Porções', 'cozinha', 12, true, 1),

('Proca de Linguiça Blumenau',
 'Porção de linguiça artesanal de Blumenau fatiada e grelhada',
 39.90, 'Porções', 'cozinha', 10, true, 2),

('Mini Pastéis de Linguiça com Requeijão',
 'Mini pastéis fritos recheados de linguiça e requeijão cremoso',
 35.90, 'Porções', 'cozinha', 10, true, 3),

('Mini Pastéis de Queijo com Tomate Seco',
 'Mini pastéis fritos recheados de queijo e tomate seco',
 34.90, 'Porções', 'cozinha', 10, true, 4),

('Batata Frita',
 'Porção de batata frita crocante',
 29.90, 'Porções', 'cozinha', 10, true, 5),

('Batata Frita com Cheddar e Crispy de Bacon',
 'Batata frita com cobertura de cheddar e crispy de bacon',
 34.90, 'Porções', 'cozinha', 10, true, 6),

('Queijo Coalho com Geleia de Pimenta',
 'Queijo coalho grelhado servido com geleia de pimenta',
 44.90, 'Porções', 'cozinha', 10, true, 7),

('Barrinhas de Panceta',
 'Barrinhas de panceta crocante grelhadas na chapa',
 44.90, 'Porções', 'cozinha', 12, true, 8),

('Sushi de Alemão — Rollmops',
 'Rollmops: peixe em conserva enrolado com picles, especialidade alemã',
 44.90, 'Porções', 'cozinha', 8, true, 9),

('Polenta Frita com Parmesão Ralado',
 'Polenta frita crocante finalizada com parmesão ralado',
 29.90, 'Porções', 'cozinha', 10, true, 10),

('Frango Empanado',
 'Pedaços de frango empanado crocante',
 39.90, 'Porções', 'cozinha', 12, true, 11),

('Tulipa de Frango com Alho Crocante',
 'Tulipa de frango assada com alho crocante',
 44.90, 'Porções', 'cozinha', 15, true, 12),

-- ============================================================
-- PRATOS PARA COMPARTILHAR
-- ============================================================
('Entrecôte Grelhado (para 2)',
 'Entrecôte grelhado no ponto certo com acompanhamentos para 2 pessoas',
 148.90, 'Pratos para Compartilhar', 'cozinha', 25, true, 1),

('Filé Mignon à Gorgonzola (para 2)',
 'Filé mignon ao molho gorgonzola com acompanhamentos para 2 pessoas',
 189.90, 'Pratos para Compartilhar', 'cozinha', 25, true, 2),

('Salmão Grelhado e Legumes (para 2)',
 'Salmão grelhado com legumes salteados para 2 pessoas',
 189.90, 'Pratos para Compartilhar', 'cozinha', 25, true, 3),

('Picanha à Brasileira (para 2)',
 'Picanha na brasa com arroz, farofa, vinagrete e fritas para 2 pessoas',
 189.90, 'Pratos para Compartilhar', 'cozinha', 30, true, 4),

('Costelinha ao Molho Barbecue (para 2)',
 'Costelinha suína ao molho barbecue com acompanhamentos para 2 pessoas',
 138.90, 'Pratos para Compartilhar', 'cozinha', 25, true, 5),

('Capitão Steak by Schornstein',
 'Corte especial da casa com acompanhamentos exclusivos — a obra-prima do Schornstein',
 239.90, 'Pratos para Compartilhar', 'cozinha', 35, true, 6),

-- ============================================================
-- PRATOS INDIVIDUAIS
-- ============================================================
('Misto Especial com Picanha',
 'Combinação especial com picanha e outros cortes grelhados',
 96.90, 'Pratos Individuais', 'cozinha', 25, true, 1),

('Picanha à Brasileira',
 'Picanha na brasa com arroz, farofa, vinagrete e fritas',
 96.90, 'Pratos Individuais', 'cozinha', 25, true, 2),

('Picanha Grelhada',
 'Picanha grelhada acompanhada de arroz, fritas e salada',
 79.90, 'Pratos Individuais', 'cozinha', 25, true, 3),

('Entrecôte Grelhado',
 'Entrecôte grelhado no ponto com acompanhamentos',
 74.90, 'Pratos Individuais', 'cozinha', 20, true, 4),

('Filé Mignon à Gorgonzola',
 'Filé mignon ao molho gorgonzola com acompanhamentos',
 96.90, 'Pratos Individuais', 'cozinha', 20, true, 5),

-- ============================================================
-- SOBREMESAS
-- ============================================================
('Petit Gâteau',
 'Bolinho de chocolate quente com sorvete de creme',
 35.00, 'Sobremesas', 'cozinha', 10, true, 1),

('Mini Churros com Doce de Leite',
 'Mini churros crocantes com doce de leite para mergulhar',
 26.00, 'Sobremesas', 'cozinha', 8, true, 2),

-- ============================================================
-- BAR — CERVEJAS
-- ============================================================
('Heineken Long Neck', 'Cerveja Heineken 330ml gelada',
 12.90, 'Cervejas', 'bar', 2, true, 1),

('Brahma Long Neck', 'Cerveja Brahma 330ml gelada',
 9.90, 'Cervejas', 'bar', 2, true, 2),

('Stella Artois Long Neck', 'Cerveja Stella Artois 330ml',
 13.90, 'Cervejas', 'bar', 2, true, 3),

('Água Mineral 500ml', 'Água mineral sem gás',
 5.90, 'Não Alcoólicos', 'bar', 1, true, 4),

('Refrigerante Lata', 'Coca-Cola, Guaraná ou Sprite 350ml',
 7.90, 'Não Alcoólicos', 'bar', 1, true, 5),

('Suco Natural', 'Suco de laranja, limão ou maracujá 300ml',
 12.90, 'Não Alcoólicos', 'bar', 5, true, 6),

-- ============================================================
-- DRINKS
-- ============================================================
('Caipirinha Clássica', 'Cachaça, limão, açúcar e gelo',
 22.90, 'Drinks', 'drinks', 5, true, 1),

('Caipiroska', 'Vodka, limão, açúcar e gelo',
 24.90, 'Drinks', 'drinks', 5, true, 2),

('Gin Tônica', 'Gin, água tônica, limão e especiarias',
 28.90, 'Drinks', 'drinks', 5, true, 3),

('Moscow Mule', 'Vodka, ginger beer e limão',
 28.90, 'Drinks', 'drinks', 5, true, 4),

('Aperol Spritz', 'Aperol, espumante e água com gás',
 32.90, 'Drinks', 'drinks', 5, true, 5),

('Mojito', 'Rum, hortelã, limão, açúcar e gelo',
 26.90, 'Drinks', 'drinks', 7, true, 6),

-- ============================================================
-- CHOPEIRA
-- ============================================================
('Chopp Pilsen 300ml', 'Chopp gelado Pilsen 300ml',
 8.90, 'Chopp', 'chopeira', 2, true, 1),

('Chopp Pilsen 500ml', 'Chopp gelado Pilsen 500ml',
 13.90, 'Chopp', 'chopeira', 2, true, 2),

('Chopp Escuro 300ml', 'Chopp escuro artesanal 300ml',
 11.90, 'Chopp', 'chopeira', 2, true, 3),

('Chopp Escuro 500ml', 'Chopp escuro artesanal 500ml',
 17.90, 'Chopp', 'chopeira', 2, true, 4);
