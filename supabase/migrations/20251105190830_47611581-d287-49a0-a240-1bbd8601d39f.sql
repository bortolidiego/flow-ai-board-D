-- Correção: Adicionar search_path às funções para segurança

-- Recriar generate_customer_identifier com search_path
CREATE OR REPLACE FUNCTION generate_customer_identifier(
  p_email VARCHAR,
  p_phone VARCHAR,
  p_chatwoot_id TEXT
) RETURNS VARCHAR 
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Recriar increment_customer_stat com search_path
CREATE OR REPLACE FUNCTION increment_customer_stat(
  profile_id UUID,
  stat_field TEXT
) RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE format('
    UPDATE customer_profiles 
    SET %I = COALESCE(%I, 0) + 1,
        updated_at = NOW()
    WHERE id = $1
  ', stat_field, stat_field)
  USING profile_id;
END;
$$;

-- Recriar update_customer_total_value com search_path
CREATE OR REPLACE FUNCTION update_customer_total_value()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.completion_type = 'won' AND NEW.customer_profile_id IS NOT NULL THEN
    UPDATE customer_profiles
    SET total_value = COALESCE(total_value, 0) + COALESCE(NEW.value, 0),
        updated_at = NOW()
    WHERE id = NEW.customer_profile_id;
  END IF;
  
  RETURN NEW;
END;
$$;