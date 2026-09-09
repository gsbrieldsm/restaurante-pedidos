-- Adiciona suporte a perfil dietético nos itens do cardápio
ALTER TABLE cardapio_itens
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
