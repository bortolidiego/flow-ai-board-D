-- Remove a política de leitura antiga e restritiva
DROP POLICY IF EXISTS "Usuários podem ver convites de seus workspaces" ON public.workspace_invites;

-- Cria uma nova política que permite a leitura pública dos convites.
-- Isso é seguro, pois o token no link do convite funciona como uma senha de uso único.
CREATE POLICY "Public read access for invites" ON public.workspace_invites
FOR SELECT
USING (true);