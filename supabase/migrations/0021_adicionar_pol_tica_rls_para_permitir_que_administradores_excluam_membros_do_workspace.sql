CREATE POLICY "Admins can delete workspace members" ON public.workspace_members
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.workspace_members wm ON ur.user_id = auth.uid()
    WHERE ur.role = 'admin'::app_role
    AND wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = auth.uid()
  )
);