-- ============================================
-- Políticas RLS para Workspaces e Workspace Members
-- ============================================

-- Workspaces
CREATE POLICY "Workspace members can view their workspace"
ON workspaces FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = workspaces.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can update workspace"
ON workspaces FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Workspace Members
CREATE POLICY "Members can view workspace members"
ON workspace_members FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage members"
ON workspace_members FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- Políticas RLS para Pipelines
-- ============================================

CREATE POLICY "Workspace members can view pipeline"
ON pipelines FOR SELECT
USING (user_is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can update pipeline"
ON pipelines FOR UPDATE
USING (
  user_is_workspace_member(auth.uid(), workspace_id)
  AND has_role(auth.uid(), 'admin')
);

-- ============================================
-- Políticas RLS para Columns
-- ============================================

CREATE POLICY "Workspace members can view columns"
ON columns FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM pipelines p
    WHERE p.id = columns.pipeline_id
      AND user_is_workspace_member(auth.uid(), p.workspace_id)
  )
);

CREATE POLICY "Admins can manage columns"
ON columns FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM pipelines p
    WHERE p.id = columns.pipeline_id
      AND user_is_workspace_member(auth.uid(), p.workspace_id)
      AND has_role(auth.uid(), 'admin')
  )
);

-- ============================================
-- Políticas RLS para Cards (todos membros podem gerenciar)
-- ============================================

CREATE POLICY "Workspace members can manage cards"
ON cards FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM columns col
    JOIN pipelines p ON col.pipeline_id = p.id
    WHERE col.id = cards.column_id
      AND user_is_workspace_member(auth.uid(), p.workspace_id)
  )
);

-- ============================================
-- Políticas RLS para Pipeline Custom Fields
-- ============================================

CREATE POLICY "Workspace members can view custom fields"
ON pipeline_custom_fields FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM pipelines p
    WHERE p.id = pipeline_custom_fields.pipeline_id
      AND user_is_workspace_member(auth.uid(), p.workspace_id)
  )
);

CREATE POLICY "Admins can manage custom fields"
ON pipeline_custom_fields FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM pipelines p
    WHERE p.id = pipeline_custom_fields.pipeline_id
      AND user_is_workspace_member(auth.uid(), p.workspace_id)
      AND has_role(auth.uid(), 'admin')
  )
);

-- ============================================
-- Políticas RLS para Intention Config
-- ============================================

CREATE POLICY "Workspace members can view intention config"
ON intention_config FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM pipelines p
    WHERE p.id = intention_config.pipeline_id
      AND user_is_workspace_member(auth.uid(), p.workspace_id)
  )
);

CREATE POLICY "Admins can manage intention config"
ON intention_config FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM pipelines p
    WHERE p.id = intention_config.pipeline_id
      AND user_is_workspace_member(auth.uid(), p.workspace_id)
      AND has_role(auth.uid(), 'admin')
  )
);

-- ============================================
-- Políticas RLS para Pipeline AI Config
-- ============================================

CREATE POLICY "Workspace members can view ai config"
ON pipeline_ai_config FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM pipelines p
    WHERE p.id = pipeline_ai_config.pipeline_id
      AND user_is_workspace_member(auth.uid(), p.workspace_id)
  )
);

CREATE POLICY "Admins can manage ai config"
ON pipeline_ai_config FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM pipelines p
    WHERE p.id = pipeline_ai_config.pipeline_id
      AND user_is_workspace_member(auth.uid(), p.workspace_id)
      AND has_role(auth.uid(), 'admin')
  )
);

-- ============================================
-- Políticas RLS para Chatwoot Integrations
-- ============================================

CREATE POLICY "Workspace members can view integrations"
ON chatwoot_integrations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM pipelines p
    WHERE p.id = chatwoot_integrations.pipeline_id
      AND user_is_workspace_member(auth.uid(), p.workspace_id)
  )
);

CREATE POLICY "Admins can manage integrations"
ON chatwoot_integrations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM pipelines p
    WHERE p.id = chatwoot_integrations.pipeline_id
      AND user_is_workspace_member(auth.uid(), p.workspace_id)
      AND has_role(auth.uid(), 'admin')
  )
);

-- ============================================
-- Políticas RLS para Lead Data (todos podem gerenciar)
-- ============================================

CREATE POLICY "Workspace members can manage lead data"
ON lead_data FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM cards c
    JOIN columns col ON c.column_id = col.id
    JOIN pipelines p ON col.pipeline_id = p.id
    WHERE c.id = lead_data.card_id
      AND user_is_workspace_member(auth.uid(), p.workspace_id)
  )
);

-- ============================================
-- Políticas RLS para Customer Profiles (todos podem gerenciar)
-- ============================================

CREATE POLICY "Workspace members can manage customer profiles"
ON customer_profiles FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM cards c
    JOIN columns col ON c.column_id = col.id
    JOIN pipelines p ON col.pipeline_id = p.id
    WHERE c.customer_profile_id = customer_profiles.id
      AND user_is_workspace_member(auth.uid(), p.workspace_id)
  )
);

-- ============================================
-- Políticas RLS para Pipeline SLA Config
-- ============================================

CREATE POLICY "Workspace members can view sla config"
ON pipeline_sla_config FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM pipelines p
    WHERE p.id = pipeline_sla_config.pipeline_id
      AND user_is_workspace_member(auth.uid(), p.workspace_id)
  )
);

CREATE POLICY "Admins can manage sla config"
ON pipeline_sla_config FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM pipelines p
    WHERE p.id = pipeline_sla_config.pipeline_id
      AND user_is_workspace_member(auth.uid(), p.workspace_id)
      AND has_role(auth.uid(), 'admin')
  )
);