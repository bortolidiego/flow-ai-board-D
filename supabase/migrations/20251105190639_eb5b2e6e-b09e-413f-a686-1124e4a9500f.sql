-- FASE 1 - Migration 2: Criar tabela de perfis de clientes

-- 2.1 Criar tabela customer_profiles
CREATE TABLE IF NOT EXISTS customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificadores únicos
  email VARCHAR(255),
  phone VARCHAR(50),
  customer_identifier VARCHAR(255) UNIQUE NOT NULL,
  
  -- Dados básicos
  full_name VARCHAR(200),
  
  -- Metadados
  first_contact_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_contact_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_interactions INTEGER DEFAULT 1,
  total_value NUMERIC DEFAULT 0,
  
  -- Histórico de finalização
  total_won INTEGER DEFAULT 0,
  total_lost INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.2 Índices
CREATE INDEX IF NOT EXISTS idx_customer_profiles_identifier ON customer_profiles(customer_identifier);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_email ON customer_profiles(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_profiles_phone ON customer_profiles(phone) WHERE phone IS NOT NULL;

-- 2.3 RLS Policies
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view customer profiles from their cards" ON customer_profiles;
CREATE POLICY "Users can view customer profiles from their cards"
  ON customer_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN columns col ON c.column_id = col.id
      JOIN pipelines p ON col.pipeline_id = p.id
      WHERE c.customer_profile_id = customer_profiles.id 
      AND p.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage customer profiles from their cards" ON customer_profiles;
CREATE POLICY "Users can manage customer profiles from their cards"
  ON customer_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN columns col ON c.column_id = col.id
      JOIN pipelines p ON col.pipeline_id = p.id
      WHERE c.customer_profile_id = customer_profiles.id 
      AND p.created_by = auth.uid()
    )
  );

-- 2.4 Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_customer_profiles_updated_at ON customer_profiles;
CREATE TRIGGER update_customer_profiles_updated_at
  BEFORE UPDATE ON customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 2.5 Comentários
COMMENT ON TABLE customer_profiles IS 'Perfis centralizados de clientes para histórico unificado';
COMMENT ON COLUMN customer_profiles.customer_identifier IS 'Identificador único universal: email, phone ou custom_id';