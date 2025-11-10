-- Tabela de convites para workspace
CREATE TABLE public.workspace_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email varchar NOT NULL,
  role app_role NOT NULL DEFAULT 'user'::app_role,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status varchar NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  token varchar NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamp with time zone DEFAULT now(),
  accepted_at timestamp with time zone
);

-- Índices para performance
CREATE INDEX idx_workspace_invites_email ON public.workspace_invites(email);
CREATE INDEX idx_workspace_invites_token ON public.workspace_invites(token);
CREATE INDEX idx_workspace_invites_workspace_id ON public.workspace_invites(workspace_id);

-- RLS Policies
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar convites do próprio workspace
CREATE POLICY "Admins can manage workspace invites"
ON public.workspace_invites
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND user_is_workspace_member(auth.uid(), workspace_id)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND user_is_workspace_member(auth.uid(), workspace_id)
);

-- Convites podem ser lidos publicamente via token (para página de aceitação)
CREATE POLICY "Anyone can read invite by token"
ON public.workspace_invites
FOR SELECT
TO anon, authenticated
USING (true);