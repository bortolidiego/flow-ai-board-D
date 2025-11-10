-- Criar infraestrutura primeiro
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Minha Organização',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);

-- Função helper
CREATE OR REPLACE FUNCTION user_is_workspace_member(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members WHERE user_id = _user_id AND workspace_id = _workspace_id
  )
$$;

-- Adicionar coluna workspace_id se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pipelines' AND column_name = 'workspace_id') THEN
    ALTER TABLE pipelines ADD COLUMN workspace_id UUID;
  END IF;
END $$;

-- Migrar dados
DO $$
DECLARE
  new_workspace_id UUID;
  first_pipeline_id UUID;
BEGIN
  -- Verificar se workspace já existe
  SELECT id INTO new_workspace_id FROM workspaces LIMIT 1;
  
  IF new_workspace_id IS NULL THEN
    -- Criar workspace "KB Tech"
    INSERT INTO workspaces (name) VALUES ('KB Tech') RETURNING id INTO new_workspace_id;
    
    -- Pegar primeiro pipeline
    SELECT id INTO first_pipeline_id FROM pipelines ORDER BY created_at ASC LIMIT 1;
    
    IF first_pipeline_id IS NOT NULL THEN
      UPDATE pipelines SET workspace_id = new_workspace_id WHERE id = first_pipeline_id;
    ELSE
      INSERT INTO pipelines (workspace_id) VALUES (new_workspace_id);
    END IF;
    
    -- Deletar outros pipelines
    DELETE FROM pipelines WHERE workspace_id IS NULL;
    
    -- Adicionar usuários ao workspace
    INSERT INTO workspace_members (workspace_id, user_id)
    SELECT new_workspace_id, id FROM auth.users
    ON CONFLICT DO NOTHING;
    
    -- Marcar admin
    INSERT INTO user_roles (user_id, role)
    SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'bortolidiego@gmail.com'
    ON CONFLICT (user_id, role) DO UPDATE SET role = 'admin'::app_role;
    
    INSERT INTO user_roles (user_id, role)
    SELECT id, 'user'::app_role FROM auth.users WHERE email != 'bortolidiego@gmail.com'
    ON CONFLICT (user_id, role) DO UPDATE SET role = 'user'::app_role;
  END IF;
END $$;

-- Tornar workspace_id obrigatório
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pipelines' AND column_name = 'workspace_id' AND is_nullable = 'YES') THEN
    ALTER TABLE pipelines ALTER COLUMN workspace_id SET NOT NULL;
  END IF;
END $$;

-- Adicionar constraint se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_workspace') THEN
    ALTER TABLE pipelines ADD CONSTRAINT fk_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Criar unique index
DROP INDEX IF EXISTS idx_one_pipeline_per_workspace;
CREATE UNIQUE INDEX idx_one_pipeline_per_workspace ON pipelines (workspace_id);

-- Remover colunas antigas
ALTER TABLE pipelines DROP COLUMN IF EXISTS position CASCADE;
ALTER TABLE pipelines DROP COLUMN IF EXISTS color CASCADE;
ALTER TABLE pipelines DROP COLUMN IF EXISTS name CASCADE;
ALTER TABLE pipelines DROP COLUMN IF EXISTS created_by CASCADE;

-- Trigger
CREATE OR REPLACE FUNCTION add_user_to_workspace()
RETURNS TRIGGER AS $$
DECLARE
  existing_workspace_id UUID;
BEGIN
  SELECT id INTO existing_workspace_id FROM workspaces LIMIT 1;
  IF existing_workspace_id IS NOT NULL THEN
    INSERT INTO workspace_members (workspace_id, user_id) VALUES (existing_workspace_id, NEW.id) ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO user_roles (user_id, role) VALUES (NEW.id, 'user'::app_role) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION add_user_to_workspace();

-- Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Policies (será criada em próxima migration)