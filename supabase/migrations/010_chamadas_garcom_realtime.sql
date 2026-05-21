-- Permite que o cliente anon leia chamadas_garcom (necessário para o realtime funcionar no browser)
CREATE POLICY "anon_read" ON chamadas_garcom FOR SELECT USING (true);

-- Adiciona a tabela à publicação do Supabase Realtime
-- (tabelas criadas após o setup inicial não são adicionadas automaticamente)
ALTER PUBLICATION supabase_realtime ADD TABLE chamadas_garcom;

-- REPLICA IDENTITY FULL para suportar filtros por coluna no futuro
ALTER TABLE chamadas_garcom REPLICA IDENTITY FULL;
