-- Função para exclusão em massa de cards
CREATE OR REPLACE FUNCTION public.delete_cards_bulk(card_ids UUID[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM cards WHERE id = ANY(card_ids);
END;
$$;

-- Função para transferência em massa de cards
CREATE OR REPLACE FUNCTION public.update_cards_column_bulk(card_ids UUID[], new_column_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE cards 
  SET column_id = new_column_id, updated_at = now()
  WHERE id = ANY(card_ids);
END;
$$;