ALTER TABLE public.pipeline_sla_config 
ADD COLUMN IF NOT EXISTS sla_strategy text DEFAULT 'response_time';