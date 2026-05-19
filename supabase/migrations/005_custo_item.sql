-- Adiciona campo de custo unitário ao cardápio
ALTER TABLE cardapio_itens
  ADD COLUMN IF NOT EXISTS custo DECIMAL(10,2) DEFAULT 0;
