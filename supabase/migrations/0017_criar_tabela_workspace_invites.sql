-- Criar extensão para UUIDs, se não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar tabela workspace_invites
CREATE TABLE public.workspace_invites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role app_role DEFAULT 'user'::app_role,
    invited_by UUID NOT NULL,
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários podem ver convites de seus workspaces"
    ON public.workspace_invites
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = workspace_invites.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Apenas admins podem criar convites"
    ON public.workspace_invites
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            JOIN public.user_roles ur ON wm.user_id = ur.user_id
            WHERE wm.workspace_id = workspace_invites.workspace_id
            AND wm.user_id = auth.uid()
            AND ur.role = 'admin'::app_role
        )
    );

CREATE POLICY "Apenas admins podem deletar convites"
    ON public.workspace_invites
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            JOIN public.user_roles ur ON wm.user_id = ur.user_id
            WHERE wm.workspace_id = workspace_invites.workspace_id
            AND wm.user_id = auth.uid()
            AND ur.role = 'admin'::app_role
        )
    );