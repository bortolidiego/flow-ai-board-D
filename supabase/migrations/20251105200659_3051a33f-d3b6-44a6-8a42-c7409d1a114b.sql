-- Drop ALL existing RLS policies for workspace_members and workspaces
DROP POLICY IF EXISTS "Admins can manage members" ON workspace_members;
DROP POLICY IF EXISTS "Members can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can view their workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can update workspace" ON workspaces;
DROP POLICY IF EXISTS "Workspace members can view their workspace" ON workspaces;
DROP POLICY IF EXISTS "Users can view their workspace" ON workspaces;

-- Recreate workspace_members policies using SECURITY DEFINER function
CREATE POLICY "Admins can manage workspace members"
ON workspace_members
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their workspace members"
ON workspace_members
FOR SELECT
TO authenticated
USING (workspace_id = get_user_workspace_id(auth.uid()));

-- Recreate workspaces policies
CREATE POLICY "Admins can update workspace"
ON workspaces
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their workspace"
ON workspaces
FOR SELECT
TO authenticated
USING (id = get_user_workspace_id(auth.uid()));