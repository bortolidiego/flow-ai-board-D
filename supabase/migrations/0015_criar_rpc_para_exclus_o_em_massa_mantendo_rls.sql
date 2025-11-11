-- Função pública para deletar cards em massa; RLS continuará valendo
CREATE OR REPLACE FUNCTION public.delete_cards_bulk(card_ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY INVOKER
AS $$
  DELETE FROM public.cards
  WHERE id = ANY(card_ids);
$$;

-- Permitir execução via API (roles usadas pelo PostgREST)
GRANT EXECUTE ON FUNCTION public.delete_cards_bulk(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_cards_bulk(uuid[]) TO anon;