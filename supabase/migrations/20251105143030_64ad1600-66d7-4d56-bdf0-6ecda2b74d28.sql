-- Add created_by column to pipelines table for ownership tracking
ALTER TABLE public.pipelines ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Update existing pipelines to have a creator (set to first user if exists)
UPDATE public.pipelines 
SET created_by = (SELECT id FROM auth.users LIMIT 1)
WHERE created_by IS NULL;

-- Make created_by required for future rows
ALTER TABLE public.pipelines ALTER COLUMN created_by SET NOT NULL;

-- ========================================
-- FIX 1: Lead Data PII Protection
-- ========================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Anyone can view lead_data" ON public.lead_data;
DROP POLICY IF EXISTS "Anyone can insert lead_data" ON public.lead_data;
DROP POLICY IF EXISTS "Anyone can update lead_data" ON public.lead_data;
DROP POLICY IF EXISTS "Anyone can delete lead_data" ON public.lead_data;

-- Create secure policies based on pipeline ownership
CREATE POLICY "Users can view own lead data"
ON public.lead_data FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM cards c
  INNER JOIN columns col ON c.column_id = col.id
  INNER JOIN pipelines p ON col.pipeline_id = p.id
  WHERE c.id = lead_data.card_id
  AND p.created_by = auth.uid()
));

CREATE POLICY "Users can insert own lead data"
ON public.lead_data FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM cards c
  INNER JOIN columns col ON c.column_id = col.id
  INNER JOIN pipelines p ON col.pipeline_id = p.id
  WHERE c.id = lead_data.card_id
  AND p.created_by = auth.uid()
));

CREATE POLICY "Users can update own lead data"
ON public.lead_data FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM cards c
  INNER JOIN columns col ON c.column_id = col.id
  INNER JOIN pipelines p ON col.pipeline_id = p.id
  WHERE c.id = lead_data.card_id
  AND p.created_by = auth.uid()
));

CREATE POLICY "Users can delete own lead data"
ON public.lead_data FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM cards c
  INNER JOIN columns col ON c.column_id = col.id
  INNER JOIN pipelines p ON col.pipeline_id = p.id
  WHERE c.id = lead_data.card_id
  AND p.created_by = auth.uid()
));

-- ========================================
-- FIX 2: Chatwoot API Keys Protection
-- ========================================

DROP POLICY IF EXISTS "Anyone can view integrations" ON public.chatwoot_integrations;
DROP POLICY IF EXISTS "Anyone can insert integrations" ON public.chatwoot_integrations;
DROP POLICY IF EXISTS "Anyone can update integrations" ON public.chatwoot_integrations;
DROP POLICY IF EXISTS "Anyone can delete integrations" ON public.chatwoot_integrations;

CREATE POLICY "Users can view own integrations"
ON public.chatwoot_integrations FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM pipelines p
  WHERE p.id = chatwoot_integrations.pipeline_id
  AND p.created_by = auth.uid()
));

CREATE POLICY "Users can insert own integrations"
ON public.chatwoot_integrations FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM pipelines p
  WHERE p.id = chatwoot_integrations.pipeline_id
  AND p.created_by = auth.uid()
));

CREATE POLICY "Users can update own integrations"
ON public.chatwoot_integrations FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM pipelines p
  WHERE p.id = chatwoot_integrations.pipeline_id
  AND p.created_by = auth.uid()
));

CREATE POLICY "Users can delete own integrations"
ON public.chatwoot_integrations FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM pipelines p
  WHERE p.id = chatwoot_integrations.pipeline_id
  AND p.created_by = auth.uid()
));

-- ========================================
-- FIX 3: User Roles Authorization
-- ========================================

-- Policies already exist and are correct:
-- "Admins can manage roles" using has_role()
-- "Users can view own roles"
-- No changes needed here

-- ========================================
-- FIX 4: Business Data Protection
-- ========================================

-- Pipelines
DROP POLICY IF EXISTS "Anyone can view pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Anyone can insert pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Anyone can update pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Anyone can delete pipelines" ON public.pipelines;

CREATE POLICY "Users can view own pipelines"
ON public.pipelines FOR SELECT
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Users can insert own pipelines"
ON public.pipelines FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own pipelines"
ON public.pipelines FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Users can delete own pipelines"
ON public.pipelines FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- Columns
DROP POLICY IF EXISTS "Anyone can view columns" ON public.columns;
DROP POLICY IF EXISTS "Anyone can insert columns" ON public.columns;
DROP POLICY IF EXISTS "Anyone can update columns" ON public.columns;
DROP POLICY IF EXISTS "Anyone can delete columns" ON public.columns;

CREATE POLICY "Users can view own columns"
ON public.columns FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM pipelines p
  WHERE p.id = columns.pipeline_id
  AND p.created_by = auth.uid()
));

CREATE POLICY "Users can insert own columns"
ON public.columns FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM pipelines p
  WHERE p.id = columns.pipeline_id
  AND p.created_by = auth.uid()
));

CREATE POLICY "Users can update own columns"
ON public.columns FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM pipelines p
  WHERE p.id = columns.pipeline_id
  AND p.created_by = auth.uid()
));

CREATE POLICY "Users can delete own columns"
ON public.columns FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM pipelines p
  WHERE p.id = columns.pipeline_id
  AND p.created_by = auth.uid()
));

-- Cards
DROP POLICY IF EXISTS "Anyone can view cards" ON public.cards;
DROP POLICY IF EXISTS "Anyone can insert cards" ON public.cards;
DROP POLICY IF EXISTS "Anyone can update cards" ON public.cards;
DROP POLICY IF EXISTS "Anyone can delete cards" ON public.cards;

CREATE POLICY "Users can view own cards"
ON public.cards FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM columns col
  INNER JOIN pipelines p ON col.pipeline_id = p.id
  WHERE col.id = cards.column_id
  AND p.created_by = auth.uid()
));

CREATE POLICY "Users can insert own cards"
ON public.cards FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM columns col
  INNER JOIN pipelines p ON col.pipeline_id = p.id
  WHERE col.id = cards.column_id
  AND p.created_by = auth.uid()
));

CREATE POLICY "Users can update own cards"
ON public.cards FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM columns col
  INNER JOIN pipelines p ON col.pipeline_id = p.id
  WHERE col.id = cards.column_id
  AND p.created_by = auth.uid()
));

CREATE POLICY "Users can delete own cards"
ON public.cards FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM columns col
  INNER JOIN pipelines p ON col.pipeline_id = p.id
  WHERE col.id = cards.column_id
  AND p.created_by = auth.uid()
));

-- Intention Config
DROP POLICY IF EXISTS "Anyone can view intention_config" ON public.intention_config;
DROP POLICY IF EXISTS "Anyone can insert intention_config" ON public.intention_config;
DROP POLICY IF EXISTS "Anyone can update intention_config" ON public.intention_config;
DROP POLICY IF EXISTS "Anyone can delete intention_config" ON public.intention_config;

CREATE POLICY "Users can view own intention_config"
ON public.intention_config FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM pipelines p
  WHERE p.id = intention_config.pipeline_id
  AND p.created_by = auth.uid()
));

CREATE POLICY "Users can insert own intention_config"
ON public.intention_config FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM pipelines p
  WHERE p.id = intention_config.pipeline_id
  AND p.created_by = auth.uid()
));

CREATE POLICY "Users can update own intention_config"
ON public.intention_config FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM pipelines p
  WHERE p.id = intention_config.pipeline_id
  AND p.created_by = auth.uid()
));

CREATE POLICY "Users can delete own intention_config"
ON public.intention_config FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM pipelines p
  WHERE p.id = intention_config.pipeline_id
  AND p.created_by = auth.uid()
));

-- Pipeline AI Config
DROP POLICY IF EXISTS "Anyone can view ai_config" ON public.pipeline_ai_config;
DROP POLICY IF EXISTS "Anyone can insert ai_config" ON public.pipeline_ai_config;
DROP POLICY IF EXISTS "Anyone can update ai_config" ON public.pipeline_ai_config;
DROP POLICY IF EXISTS "Anyone can delete ai_config" ON public.pipeline_ai_config;

CREATE POLICY "Users can view own ai_config"
ON public.pipeline_ai_config FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM pipelines p
  WHERE p.id = pipeline_ai_config.pipeline_id
  AND p.created_by = auth.uid()
));

CREATE POLICY "Users can insert own ai_config"
ON public.pipeline_ai_config FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM pipelines p
  WHERE p.id = pipeline_ai_config.pipeline_id
  AND p.created_by = auth.uid()
));

CREATE POLICY "Users can update own ai_config"
ON public.pipeline_ai_config FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM pipelines p
  WHERE p.id = pipeline_ai_config.pipeline_id
  AND p.created_by = auth.uid()
));

CREATE POLICY "Users can delete own ai_config"
ON public.pipeline_ai_config FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM pipelines p
  WHERE p.id = pipeline_ai_config.pipeline_id
  AND p.created_by = auth.uid()
));

-- Pipeline Custom Fields
DROP POLICY IF EXISTS "Anyone can view custom_fields" ON public.pipeline_custom_fields;
DROP POLICY IF EXISTS "Anyone can insert custom_fields" ON public.pipeline_custom_fields;
DROP POLICY IF EXISTS "Anyone can update custom_fields" ON public.pipeline_custom_fields;
DROP POLICY IF EXISTS "Anyone can delete custom_fields" ON public.pipeline_custom_fields;

CREATE POLICY "Users can view own custom_fields"
ON public.pipeline_custom_fields FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM pipelines p
  WHERE p.id = pipeline_custom_fields.pipeline_id
  AND p.created_by = auth.uid()
));

CREATE POLICY "Users can insert own custom_fields"
ON public.pipeline_custom_fields FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM pipelines p
  WHERE p.id = pipeline_custom_fields.pipeline_id
  AND p.created_by = auth.uid()
));

CREATE POLICY "Users can update own custom_fields"
ON public.pipeline_custom_fields FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM pipelines p
  WHERE p.id = pipeline_custom_fields.pipeline_id
  AND p.created_by = auth.uid()
));

CREATE POLICY "Users can delete own custom_fields"
ON public.pipeline_custom_fields FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM pipelines p
  WHERE p.id = pipeline_custom_fields.pipeline_id
  AND p.created_by = auth.uid()
));