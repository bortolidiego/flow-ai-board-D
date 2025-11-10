-- Create pipeline_ai_config table for visual AI configuration
CREATE TABLE public.pipeline_ai_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  
  -- Visual Configuration
  business_type TEXT DEFAULT 'custom',
  template_id TEXT,
  
  -- Objectives (array of strings)
  objectives TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Auto-generated Prompt
  generated_prompt TEXT NOT NULL DEFAULT 'Você é um assistente de análise de conversas. Analise a conversa e extraia informações estruturadas.',
  
  -- Advanced mode (if user edits manually)
  custom_prompt TEXT,
  use_custom_prompt BOOLEAN DEFAULT false,
  
  -- User examples
  examples JSONB DEFAULT '[]'::jsonb,
  
  -- Movement rules
  move_rules JSONB DEFAULT '[]'::jsonb,
  
  -- Settings
  model_name TEXT DEFAULT 'google/gemini-2.5-flash',
  analyze_on_message BOOLEAN DEFAULT true,
  analyze_on_close BOOLEAN DEFAULT true,
  
  -- Metrics
  success_rate NUMERIC DEFAULT 0,
  last_analyzed_at TIMESTAMP WITH TIME ZONE,
  total_analyses INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(pipeline_id)
);

-- Enable Row Level Security
ALTER TABLE public.pipeline_ai_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view ai_config" 
ON public.pipeline_ai_config 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert ai_config" 
ON public.pipeline_ai_config 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update ai_config" 
ON public.pipeline_ai_config 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete ai_config" 
ON public.pipeline_ai_config 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pipeline_ai_config_updated_at
BEFORE UPDATE ON public.pipeline_ai_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();