-- Grupos de opcionais por item do cardápio
-- Ex: "Tamanho" (300ml / 500ml / 1L), "Acompanhamento" (com salada / sem salada)
CREATE TABLE IF NOT EXISTS cardapio_grupos_opcao (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID NOT NULL REFERENCES cardapio_itens(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  multiplo    BOOLEAN NOT NULL DEFAULT false, -- false = radio, true = checkbox
  ordem       INTEGER NOT NULL DEFAULT 0,
  criado_em   TIMESTAMPTZ DEFAULT NOW()
);

-- Opções individuais dentro de cada grupo
CREATE TABLE IF NOT EXISTS cardapio_opcoes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id         UUID NOT NULL REFERENCES cardapio_grupos_opcao(id) ON DELETE CASCADE,
  nome             TEXT NOT NULL,
  preco_adicional  NUMERIC(10,2) NOT NULL DEFAULT 0,
  ordem            INTEGER NOT NULL DEFAULT 0
);

-- Armazena as opções selecionadas em cada item de pedido
ALTER TABLE pedido_itens ADD COLUMN IF NOT EXISTS opcoes_selecionadas JSONB DEFAULT '[]';

-- RLS
ALTER TABLE cardapio_grupos_opcao ENABLE ROW LEVEL SECURITY;
ALTER TABLE cardapio_opcoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_grupos"       ON cardapio_grupos_opcao FOR SELECT USING (true);
CREATE POLICY "service_role_all_grupos"  ON cardapio_grupos_opcao FOR ALL    USING (true);
CREATE POLICY "public_read_opcoes"       ON cardapio_opcoes       FOR SELECT USING (true);
CREATE POLICY "service_role_all_opcoes"  ON cardapio_opcoes       FOR ALL    USING (true);
