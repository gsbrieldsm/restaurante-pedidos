-- Corrige o DEFAULT do banner_titulo para o nome atual da plataforma
ALTER TABLE configuracoes
  ALTER COLUMN banner_titulo    SET DEFAULT 'Bem-vindo ao Menuê+! 🎉',
  ALTER COLUMN banner_subtitulo SET DEFAULT 'Veja nossas novidades do dia';

-- Atualiza registros que ainda têm o nome antigo (criados antes da correção)
UPDATE configuracoes
SET banner_titulo = 'Bem-vindo ao Menuê+! 🎉'
WHERE banner_titulo = 'Bem-vindo ao Meu Menu+! 🎉';
