-- Adicionar coluna deleted_at na tabela cards
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Atualizar função de delete para fazer soft delete
CREATE OR REPLACE FUNCTION public.delete_cards_bulk(card_ids uuid[])
 RETURNS void
 LANGUAGE sql
AS $function$
  UPDATE public.cards
  SET deleted_at = NOW()
  WHERE id = ANY(card_ids);
$function$;

-- Criar função de restauração
CREATE OR REPLACE FUNCTION public.restore_cards_bulk(card_ids uuid[])
 RETURNS void
 LANGUAGE sql
AS $function$
  UPDATE public.cards
  SET deleted_at = NULL
  WHERE id = ANY(card_ids);
$function$;