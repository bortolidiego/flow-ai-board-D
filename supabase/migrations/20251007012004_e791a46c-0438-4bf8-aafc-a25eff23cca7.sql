-- Add new fields to cards table for enhanced card display
ALTER TABLE public.cards 
ADD COLUMN IF NOT EXISTS product_item text,
ADD COLUMN IF NOT EXISTS subject text;