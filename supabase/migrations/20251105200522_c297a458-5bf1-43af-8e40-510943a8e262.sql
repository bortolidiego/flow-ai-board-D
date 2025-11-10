-- Drop existing problematic RLS policies
DROP POLICY IF EXISTS "Members can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace members can view their workspace" ON workspaces;

-- Create SECURITY DEFINER function to check workspace membership
-- This bypasses RLS and prevents infinite recursion
CREATE OR REPLACE FUNCTION public.user_is_workspace_member(
  _user_id uuid,
  _workspace_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE user_id = _user_id
      AND workspace_id = _workspace_id
  )
$$;

-- Create SECURITY DEFINER function to get user's workspace
CREATE OR REPLACE FUNCTION public.get_user_workspace_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id
  FROM public.workspace_members
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Recreate workspace_members policies using SECURITY DEFINER functions
CREATE POLICY "Users can view their workspace members"
ON workspace_members
FOR SELECT
TO authenticated
USING (
  workspace_id = public.get_user_workspace_id(auth.uid())
);

-- Recreate workspaces policy
CREATE POLICY "Users can view their workspace"
ON workspaces
FOR SELECT
TO authenticated
USING (
  id = public.get_user_workspace_id(auth.uid())
);