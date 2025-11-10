-- FASE 1 - Migration 4: Popular dados de customer_profiles e funções auxiliares

-- 4.1 Criar função para gerar customer_identifier
CREATE OR REPLACE FUNCTION generate_customer_identifier(
  p_email VARCHAR,
  p_phone VARCHAR,
  p_chatwoot_id TEXT
) RETURNS VARCHAR AS $$
BEGIN
  IF p_email IS NOT NULL AND p_email != '' THEN
    RETURN 'email:' || LOWER(p_email);
  ELSIF p_phone IS NOT NULL AND p_phone != '' THEN
    RETURN 'phone:' || p_phone;
  ELSIF p_chatwoot_id IS NOT NULL THEN
    RETURN 'chatwoot:' || p_chatwoot_id;
  ELSE
    RETURN 'unknown:' || gen_random_uuid()::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4.2 Popular customer_profiles com base nos cards existentes
INSERT INTO customer_profiles (
  customer_identifier,
  email,
  phone,
  full_name,
  first_contact_at,
  last_contact_at,
  total_interactions
)
SELECT DISTINCT ON (customer_identifier)
  generate_customer_identifier(
    chatwoot_contact_email,
    REGEXP_REPLACE(COALESCE(chatwoot_contact_name, ''), '[^0-9]', '', 'g'),
    chatwoot_conversation_id
  ) as customer_identifier,
  chatwoot_contact_email as email,
  NULL as phone,
  chatwoot_contact_name as full_name,
  MIN(created_at) OVER (PARTITION BY generate_customer_identifier(
    chatwoot_contact_email,
    REGEXP_REPLACE(COALESCE(chatwoot_contact_name, ''), '[^0-9]', '', 'g'),
    chatwoot_conversation_id
  )) as first_contact_at,
  MAX(updated_at) OVER (PARTITION BY generate_customer_identifier(
    chatwoot_contact_email,
    REGEXP_REPLACE(COALESCE(chatwoot_contact_name, ''), '[^0-9]', '', 'g'),
    chatwoot_conversation_id
  )) as last_contact_at,
  COUNT(*) OVER (PARTITION BY generate_customer_identifier(
    chatwoot_contact_email,
    REGEXP_REPLACE(COALESCE(chatwoot_contact_name, ''), '[^0-9]', '', 'g'),
    chatwoot_conversation_id
  )) as total_interactions
FROM cards
WHERE chatwoot_conversation_id IS NOT NULL
ON CONFLICT (customer_identifier) DO NOTHING;

-- 4.3 Atualizar cards existentes com customer_profile_id
UPDATE cards c
SET customer_profile_id = cp.id
FROM customer_profiles cp
WHERE generate_customer_identifier(
  c.chatwoot_contact_email,
  REGEXP_REPLACE(COALESCE(c.chatwoot_contact_name, ''), '[^0-9]', '', 'g'),
  c.chatwoot_conversation_id
) = cp.customer_identifier
AND c.customer_profile_id IS NULL;

-- 4.4 Função para incrementar estatísticas de customer_profile
CREATE OR REPLACE FUNCTION increment_customer_stat(
  profile_id UUID,
  stat_field TEXT
) RETURNS void AS $$
BEGIN
  EXECUTE format('
    UPDATE customer_profiles 
    SET %I = COALESCE(%I, 0) + 1,
        updated_at = NOW()
    WHERE id = $1
  ', stat_field, stat_field)
  USING profile_id;
END;
$$ LANGUAGE plpgsql;

-- 4.5 Trigger para atualizar total_value quando card é finalizado como won
CREATE OR REPLACE FUNCTION update_customer_total_value()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completion_type = 'won' AND NEW.customer_profile_id IS NOT NULL THEN
    UPDATE customer_profiles
    SET total_value = COALESCE(total_value, 0) + COALESCE(NEW.value, 0),
        updated_at = NOW()
    WHERE id = NEW.customer_profile_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_customer_total_value ON cards;
CREATE TRIGGER trigger_update_customer_total_value
  AFTER UPDATE OF completion_type ON cards
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_total_value();