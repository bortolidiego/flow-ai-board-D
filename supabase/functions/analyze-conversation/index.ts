import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Helper function to get schema type from field type
function getSchemaType(fieldType: string): string {
  const typeMap: Record<string, string> = {
    text: 'string',
    email: 'string',
    phone: 'string',
    number: 'number',
    date: 'string',
    select: 'string'
  };
  return typeMap[fieldType] || 'string';
}

// Helper function to build AI function schema dynamically
function buildAIFunctionSchema(customFields: any[], funnelTypes: string[]) {
  const properties: Record<string, any> = {
    summary: {
      type: 'string',
      description: 'Resumo conciso da conversa em 2-3 frases'
    },
    subject: {
      type: 'string',
      description: 'Assunto principal da conversa'
    },
    product_item: {
      type: 'string',
      description: 'Produto ou serviço mencionado'
    },
    value: {
      type: 'number',
      description: 'Valor monetário se mencionado'
    },
    conversation_status: {
      type: 'string',
      enum: ['open', 'closed'],
      description: 'Status da conversa'
    },
    win_confirmation: {
      type: 'string',
      description: 'Detalhes se negócio foi ganho'
    },
    loss_reason: {
      type: 'string',
      description: 'Motivo se negócio foi perdido'
    },
    funnel_analysis: {
      type: 'object',
      properties: {
        score: {
          type: 'integer',
          description: 'Score de 0-100 do funil baseado em TODA a conversa',
          minimum: 0,
          maximum: 100
        },
        type: {
          type: 'string',
          enum: funnelTypes.length > 0 ? funnelTypes : ['compra', 'suporte', 'informação'],
          description: `Tipo de funil do cliente. ESCOLHA APENAS UM: ${funnelTypes.join(', ')}`
        }
      },
      required: ['score', 'type']
    },
    service_quality: {
      type: 'object',
      properties: {
        score: {
          type: 'integer',
          description: 'Score de 0-100 da qualidade de atendimento avaliando TODA a conversa, não apenas trechos',
          minimum: 0,
          maximum: 100
        },
        suggestions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Sugestões de melhoria baseadas em toda a interação'
        }
      },
      required: ['score', 'suggestions']
    },
    lifecycle_detection: {
      type: 'object',
      description: 'Análise do estágio atual no ciclo de vida da intenção',
      properties: {
        current_stage: {
          type: 'string',
          description: 'Nome da etapa atual baseada no contexto da conversa'
        },
        reasoning: {
          type: 'string',
          description: 'Justificativa de 1-2 frases para a escolha da etapa'
        },
        progress_estimate: {
          type: 'integer',
          minimum: 0,
          maximum: 100,
          description: 'Estimativa de progresso percentual no ciclo (0-100%)'
        },
        is_terminal: {
          type: 'boolean',
          description: 'Se a conversa chegou em um estado terminal (won/lost/resolved)'
        }
      },
      required: ['current_stage', 'progress_estimate', 'is_terminal']
    },
    lead_data: {
      type: 'object',
      properties: {
        full_name: { type: 'string' },
        cpf: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        address: { type: 'string' },
        gender: { type: 'string' },
        birthday: { type: 'string' }
      }
    },
    custom_fields: {
      type: 'object',
      description: 'Campos customizados extraídos da conversa',
      properties: {}
    }
  };

  const required = ['summary', 'funnel_analysis', 'service_quality'];

  // Add custom fields to the schema
  if (customFields && customFields.length > 0) {
    customFields.forEach((field: any) => {
      const fieldSchema: any = {
        type: getSchemaType(field.field_type),
        description: field.field_label
      };
      
      // Add enum for SELECT fields
      if (field.field_type === 'select' && field.field_options && field.field_options.length > 0) {
        fieldSchema.enum = field.field_options;
        fieldSchema.description += `. ESCOLHA APENAS UM: ${field.field_options.join(', ')}`;
      }
      
      properties.custom_fields.properties[field.field_name] = fieldSchema;
    });
  }

  return {
    name: 'analyze_conversation',
    description: 'Analisa a conversa e extrai informações estruturadas',
    parameters: {
      type: 'object',
      properties,
      required,
      additionalProperties: false
    }
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authentication - accept both user tokens and service role key
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    let user = null;
    
    // Check if it's a service role key (internal call from webhook)
    if (token === supabaseKey) {
      console.log('Service role authentication - internal call');
      // For service role, we'll skip user verification but still verify ownership later
    } else {
      // Regular user authentication
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authUser) {
        console.error('Authentication error:', authError);
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      user = authUser;
    }

    const { cardId } = await req.json();

    if (!cardId) {
      throw new Error('cardId is required');
    }

    // Buscar dados do card e pipeline_id com verificação de ownership
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select(`
        *,
        column:columns!inner(
          pipeline_id,
          pipelines!inner(workspace_id)
        )
      `)
      .eq('id', cardId)
      .single();

    if (cardError || !card) {
      console.error('Card error:', cardError);
      throw new Error('Card not found');
    }

    const workspaceId = (card.column as any)?.pipelines?.workspace_id;
    console.log('Card details:', {
      cardId: card.id,
      workspaceId,
      userId: user?.id
    });

    // Verify ownership (only if user is authenticated, skip for service role)
    if (user) {
      // Verificar se o usuário é membro do workspace
      const { data: membership, error: membershipError } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (membershipError || !membership) {
        console.error('Membership verification failed:', membershipError);
        return new Response(
          JSON.stringify({ error: 'Forbidden: You are not a member of this workspace' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const pipelineId = (card.column as any).pipeline_id;
    const conversationText = card.description || '';
    
    if (!conversationText.trim()) {
      console.log('No conversation to analyze');
      return new Response(
        JSON.stringify({ message: 'No conversation to analyze' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar configuração completa do pipeline
    const [
      { data: customFields },
      { data: funnelConfigs },
      { data: aiConfig }
    ] = await Promise.all([
      supabase
        .from('pipeline_custom_fields')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('position'),
      supabase
        .from('funnel_config')
        .select('*')
        .eq('pipeline_id', pipelineId),
      supabase
        .from('pipeline_ai_config')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .maybeSingle()
    ]);

    // Use default values if no config exists
    const modelName = aiConfig?.model_name || 'google/gemini-2.5-flash-lite';
    // Detect provider from model string (e.g., "openai/gpt-4o-mini" or "google/gemini-2.5-flash-lite")
    const [providerPrefix, rawModelId] = modelName.includes('/') ? modelName.split('/') : ['google', modelName];
    const provider = providerPrefix.toLowerCase();
    const systemPrompt = aiConfig?.use_custom_prompt && aiConfig?.custom_prompt
      ? aiConfig.custom_prompt
      : aiConfig?.generated_prompt || 'Você é um assistente de análise de conversas. Analise a conversa e extraia informações estruturadas.';

    const funnelTypes = funnelConfigs?.map((fc: any) => fc.funnel_type) || ['compra', 'suporte', 'informação'];
    const funnelLabels = funnelConfigs?.map((fc: any) => `${fc.funnel_name} (${fc.funnel_type})`) || funnelTypes;

    // Build dynamic schema with funnel types
    const functionSchema = buildAIFunctionSchema(customFields || [], funnelTypes);

    // Preparar informações de ciclo de vida para o prompt
    let lifecycleInfo = '';
    if (funnelConfigs && funnelConfigs.length > 0) {
      lifecycleInfo = '\n\n## CICLOS DE VIDA DOS FUNIS\n';
      funnelConfigs.forEach((fc: any) => {
        if (fc.lifecycle_stages && fc.lifecycle_stages.length > 0) {
          const stageNames = fc.lifecycle_stages.map((s: any) => s.stage_name).join(', ');
          lifecycleInfo += `\n**${fc.funnel_name}** possui as etapas: ${stageNames}\n`;
          lifecycleInfo += `Etapas disponíveis:\n`;
          fc.lifecycle_stages.forEach((s: any) => {
            lifecycleInfo += `- ${s.stage_name} (progresso base: ${s.progress_percent}%${s.is_terminal ? ', TERMINAL' : ''})\n`;
          });
        }
      });
    }

    console.log('Analyzing conversation for card:', cardId);
    console.log('Using model:', modelName);
    console.log('Custom fields:', customFields?.length || 0);
    console.log('Attempting analysis with Lovable AI...');

    // Construir instruções de formato de mensagem
    const formatInstructions = `

## IMPORTANTE: FORMATO DAS MENSAGENS

As mensagens na conversa seguem este formato:
- \`[HH:MM] 🧑‍💼 Atendente Nome: mensagem\` → Mensagem do ATENDENTE
- \`[HH:MM] 👤 Cliente Nome: mensagem\` → Mensagem do CLIENTE

**Regras de identificação:**
- Mensagens com emoji 🧑‍💼 são SEMPRE do atendente
- Mensagens com emoji 👤 são SEMPRE do cliente
- O nome após o emoji indica quem enviou a mensagem
- Analise TODA a conversa, não apenas partes dela
- Avalie o contexto completo para scores e classificações`;

    // Roteamento por provedor com schema dinâmico
    let response: Response;
    let usingFallback = false;

    if (provider === 'openai') {
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const openaiModel = rawModelId; // ex.: gpt-4o-mini, gpt-4o, o3-mini
      console.log('Analyzing with OpenAI model:', openaiModel);

      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: openaiModel,
          messages: [
            {
              role: 'system',
              content: `${systemPrompt}${formatInstructions}

IMPORTANTE:
- Avalie a conversa COMPLETA, desde o início até o momento atual, não apenas trechos ou o início
- Para qualidade de atendimento: considere toda a interação, tempo de resposta, resolução de problemas
- Para funil: analise a evolução da conversa e identifique o funil ATUAL do cliente

Tipos de funil disponíveis (escolha APENAS UM): ${funnelLabels.join(', ')}${lifecycleInfo}

Para o campo "lifecycle_detection", você DEVE identificar em qual etapa a conversa está atualmente baseada no contexto, estimar o progresso percentual (0-100%) considerando toda a jornada, e marcar como terminal se a conversa chegou a uma resolução final.`
            },
            {
              role: 'user',
              content: conversationText
            }
          ],
          tools: [
            {
              type: 'function',
              function: functionSchema
            }
          ],
          tool_choice: { type: 'function', function: { name: 'analyze_conversation' } },
          max_completion_tokens: 2000
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }
    } else {
      // Usar Lovable para modelos Google/Gemini, com fallback para OpenAI se necessário
      const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
      if (!lovableApiKey) {
        console.warn('LOVABLE_API_KEY não configurada, caindo para OpenAI automaticamente.');
        const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
        if (!openaiApiKey) {
          throw new Error('Neither Lovable nor OpenAI keys are configured');
        }
        usingFallback = true;
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `${systemPrompt}${formatInstructions}

IMPORTANTE:
- Avalie a conversa COMPLETA, desde o início até o momento atual, não apenas trechos ou o início
- Para qualidade de atendimento: considere toda a interação, tempo de resposta, resolução de problemas
- Para funil: analise a evolução da conversa e identifique o funil ATUAL do cliente

Tipos de funil disponíveis (escolha APENAS UM): ${funnelLabels.join(', ')}${lifecycleInfo}

Para o campo "lifecycle_detection", você DEVE identificar em qual etapa a conversa está atualmente baseada no contexto, estimar o progresso percentual (0-100%) considerando toda a jornada, e marcar como terminal se a conversa chegou a uma resolução final.`
              },
              {
                role: 'user',
                content: conversationText
              }
            ],
            tools: [
              {
                type: 'function',
                function: functionSchema
              }
            ],
            tool_choice: { type: 'function', function: { name: 'analyze_conversation' } },
            max_completion_tokens: 2000
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('OpenAI API error:', response.status, errorText);
          throw new Error(`OpenAI API error: ${response.status}`);
        }
      } else {
        console.log('Attempting analysis with Lovable AI model:', modelName);
        response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              {
                role: 'system',
                content: `${systemPrompt}${formatInstructions}

IMPORTANTE:
- Avalie a conversa COMPLETA, desde o início até o momento atual, não apenas trechos ou o início
- Para qualidade de atendimento: considere toda a interação, tempo de resposta, resolução de problemas
- Para funil: analise a evolução da conversa e identifique o funil ATUAL do cliente

Tipos de funil disponíveis (escolha APENAS UM): ${funnelLabels.join(', ')}${lifecycleInfo}

Para o campo "lifecycle_detection", você DEVE identificar em qual etapa a conversa está atualmente baseada no contexto, estimar o progresso percentual (0-100%) considerando toda a jornada, e marcar como terminal se a conversa chegou a uma resolução final.`
              },
              {
                role: 'user',
                content: conversationText
              }
            ],
            tools: [
              {
                type: 'function',
                function: functionSchema
              }
            ],
            tool_choice: { type: 'function', function: { name: 'analyze_conversation' } }
          }),
        });

        // Fallback para OpenAI quando 402 (sem créditos)
        if (response.status === 402) {
          console.warn('Lovable AI: sem créditos (402). Falling back to OpenAI.');
          const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
          if (!openaiApiKey) {
            throw new Error('OpenAI API key not configured for fallback');
          }
          usingFallback = true;
          response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: `${systemPrompt}${formatInstructions}

IMPORTANTE:
- Avalie a conversa COMPLETA, desde o início até o momento atual, não apenas trechos ou o início
- Para qualidade de atendimento: considere toda a interação, tempo de resposta, resolução de problemas
- Para funil: analise a evolução da conversa e identifique o funil ATUAL do cliente

Tipos de funil disponíveis (escolha APENAS UM): ${funnelLabels.join(', ')}${lifecycleInfo}

Para o campo "lifecycle_detection", você DEVE identificar em qual etapa a conversa está atualmente baseada no contexto, estimar o progresso percentual (0-100%) considerando toda a jornada, e marcar como terminal se a conversa chegou a uma resolução final.`
                },
                {
                  role: 'user',
                  content: conversationText
                }
              ],
              tools: [
                {
                  type: 'function',
                  function: functionSchema
                }
              ],
              tool_choice: { type: 'function', function: { name: 'analyze_conversation' } },
              max_completion_tokens: 2000
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenAI API error:', response.status, errorText);
            throw new Error(`OpenAI API error: ${response.status}`);
          }
        } else if (!response.ok) {
          const errorText = await response.text();
          console.error('Lovable AI error:', response.status, errorText);
          throw new Error(`Lovable AI error: ${response.status}`);
        }
      }
    }

    console.log(`Analysis completed using ${usingFallback ? 'OpenAI' : 'Lovable AI'}`)

    const aiData = await response.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    // Tratamento robusto de JSON parsing
    let analysis;
    try {
      const rawArgs = toolCall.function.arguments?.trim() || '{}';
      
      // Tentar remover texto após o último '}'
      const lastBraceIndex = rawArgs.lastIndexOf('}');
      const cleanedArgs = lastBraceIndex !== -1 
        ? rawArgs.substring(0, lastBraceIndex + 1)
        : rawArgs;
      
      analysis = JSON.parse(cleanedArgs);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('Raw arguments:', toolCall.function.arguments?.substring(0, 500));
      throw new Error(`Invalid JSON from AI: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Validar campos essenciais
    if (!analysis.funnel_analysis || !analysis.service_quality) {
      throw new Error('Missing required fields in AI response');
    }

    console.log('Analysis completed:', {
      has_lifecycle: !!analysis.lifecycle_detection,
      has_current_stage: !!analysis.lifecycle_detection?.current_stage,
      funnel_type: analysis.funnel_analysis?.type,
      subject: analysis.subject,
      summary: analysis.summary?.substring(0, 100)
    });

    // Processar ciclo de vida
    let currentLifecycleStage = null;
    let lifecycleProgressPercent = 0;
    let resolutionStatus = null;
    let isMonetaryLocked = false;

    const detectedFunnel = funnelConfigs?.find(
      (fc: any) => fc.funnel_type === analysis.funnel_analysis.type
    );

    // Processar ciclo de vida com validação completa
    if (analysis.lifecycle_detection && 
        analysis.lifecycle_detection.current_stage && 
        detectedFunnel && 
        detectedFunnel.lifecycle_stages) {
      
      const detectedStage = String(analysis.lifecycle_detection.current_stage).trim();
      
      if (detectedStage) {
        const stageConfig = detectedFunnel.lifecycle_stages.find(
          (s: any) => {
            const stageName = String(s.stage_name || '').toLowerCase();
            return stageName === detectedStage.toLowerCase();
          }
        );
        
        if (stageConfig) {
          currentLifecycleStage = stageConfig.stage_name;
          lifecycleProgressPercent = analysis.lifecycle_detection.progress_estimate || stageConfig.progress_percent;
          
          // Se estágio terminal, definir resolution_status
          if (stageConfig.is_terminal) {
            resolutionStatus = stageConfig.resolution_status || 'resolved';
          }
          
          console.log(`✅ Lifecycle detected: stage=${currentLifecycleStage}, progress=${lifecycleProgressPercent}%, resolution=${resolutionStatus}`);
        } else {
          console.warn(`⚠️ Stage "${detectedStage}" not found in lifecycle_stages for funnel "${detectedFunnel.funnel_type}"`);
        }
      }
    } else {
      console.log('ℹ️ No lifecycle detection in analysis or missing configuration');
    }

    // Sistema de trava monetária
    const previousFunnelType = card.funnel_type;
    const newFunnelType = analysis.funnel_analysis.type;

    const previousConfig = funnelConfigs?.find((fc: any) => fc.funnel_type === previousFunnelType);
    const newConfig = funnelConfigs?.find((fc: any) => fc.funnel_type === newFunnelType);

    // Se mudou de monetária para não-monetária, travar
    if (previousConfig?.is_monetary && !newConfig?.is_monetary && card.value && card.value > 0) {
      isMonetaryLocked = true;
      console.log(`Card locked: changed from monetary (${previousFunnelType}) to non-monetary (${newFunnelType})`);
    }

    // Contar mensagens na conversa
    const messageCount = (conversationText.match(/\[\d{2}:\d{2}\]/g) || []).length;

    // Buscar lead_data atual para snapshot
    const { data: currentLeadData } = await supabase
      .from('lead_data')
      .select('*')
      .eq('card_id', cardId)
      .maybeSingle();

    // FASE 2: SALVAR SNAPSHOT COMPLETO NO HISTÓRICO ANTES DE ATUALIZAR
    const historySnapshot = {
      card_id: cardId,
      analyzed_at: new Date().toISOString(),
      funnel_type: analysis.funnel_analysis.type,
      funnel_score: analysis.funnel_analysis.score,
      service_quality_score: analysis.service_quality.score,
      service_quality_suggestions: analysis.service_quality.suggestions || [],
      conversation_summary: analysis.summary,
      subject: analysis.subject || null,
      product_item: analysis.product_item || null,
      value: analysis.value || null,
      conversation_status: analysis.conversation_status || null,
      win_confirmation: analysis.win_confirmation || null,
      loss_reason: analysis.loss_reason || null,
      custom_fields_snapshot: analysis.custom_fields || {},
      lead_data_snapshot: currentLeadData || {},
      trigger_source: 'manual', // ou 'message', 'close', 'cron' dependendo do contexto
      conversation_length: messageCount,
      model_used: usingFallback ? 'gpt-5-nano-2025-08-07' : modelName
    };

    const { error: historyError } = await supabase
      .from('card_analysis_history')
      .insert(historySnapshot);

    if (historyError) {
      console.error('Error saving analysis history:', historyError);
      // Não falhar a operação, apenas logar o erro
    } else {
      console.log('Analysis history saved successfully');
    }

    // Atualizar card com análises de IA e custom fields (valores ATUAIS)
    const updateData: any = {
      conversation_summary: analysis.summary,
      funnel_score: analysis.funnel_analysis.score,
      funnel_type: analysis.funnel_analysis.type,
      service_quality_score: analysis.service_quality.score,
      ai_suggestions: analysis.service_quality.suggestions,
      
      // NOVOS CAMPOS DE CICLO DE VIDA
      current_lifecycle_stage: currentLifecycleStage,
      lifecycle_progress_percent: lifecycleProgressPercent,
      resolution_status: resolutionStatus,
      is_monetary_locked: isMonetaryLocked || card.is_monetary_locked || false,
      last_activity_at: new Date().toISOString(),
      
      updated_at: new Date().toISOString()
    };

    // Adicionar campos opcionais se existirem
    if (analysis.subject) updateData.subject = analysis.subject;
    if (analysis.product_item) updateData.product_item = analysis.product_item;
    if (analysis.value) updateData.value = analysis.value;
    if (analysis.conversation_status) updateData.conversation_status = analysis.conversation_status;
    if (analysis.win_confirmation) updateData.win_confirmation = analysis.win_confirmation;
    if (analysis.loss_reason) updateData.loss_reason = analysis.loss_reason;

    // Salvar custom fields em custom_fields_data (JSONB)
    if (analysis.custom_fields && Object.keys(analysis.custom_fields).length > 0) {
      updateData.custom_fields_data = analysis.custom_fields;
      console.log('Saving custom fields:', analysis.custom_fields);
    }

    const { error: updateCardError } = await supabase
      .from('cards')
      .update(updateData)
      .eq('id', cardId);

    if (updateCardError) {
      console.error('Error updating card:', updateCardError);
      throw updateCardError;
    }

    // NOVA LÓGICA: Verificar regras de movimentação baseadas em lifecycle
    const { data: columns } = await supabase
      .from('columns')
      .select('id, name, position')
      .eq('pipeline_id', pipelineId)
      .order('position');

    if (!columns || columns.length <= 1) {
      console.log('Not enough columns to move cards');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Analysis completed but card movement skipped (not enough columns)'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let targetColumnId = null;

    if (currentLifecycleStage) {
      const { data: movementRules } = await supabase
        .from('pipeline_movement_rules')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .eq('funnel_type', newFunnelType)
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      
      if (movementRules && movementRules.length > 0) {
        console.log(`Found ${movementRules.length} movement rules for funnel ${newFunnelType}`);
        
        for (const rule of movementRules) {
          // Verificar condição: lifecycle stage
          if (rule.when_lifecycle_stage === currentLifecycleStage) {
            console.log(`Rule matched: move to column "${rule.move_to_column_name}" when stage is "${currentLifecycleStage}"`);
            
            // Buscar coluna de destino
            const { data: targetColumn } = await supabase
              .from('columns')
              .select('id')
              .eq('pipeline_id', pipelineId)
              .eq('name', rule.move_to_column_name)
              .maybeSingle();
            
            if (targetColumn) {
              targetColumnId = targetColumn.id;
              console.log(`Target column found: ${targetColumnId}`);
              break; // Primeira regra que atende
            }
          }
        }
      }
    }

    // Aplicar movimentação se houver mudança
    if (targetColumnId && targetColumnId !== card.column_id) {
      const { error: moveError } = await supabase
        .from('cards')
        .update({ 
          column_id: targetColumnId,
          updated_at: new Date().toISOString()
        })
        .eq('id', cardId);

      if (moveError) {
        console.error('Error moving card:', moveError);
      } else {
        console.log(`Card moved from column ${card.column_id} to ${targetColumnId} based on lifecycle rule`);
      }
    }

    const currentColumnPosition = columns.findIndex(col => col.id === card.column_id);
    const moveRules = aiConfig?.move_rules?.rules || [];
    
    // Se houver regras customizadas ativas, processar por prioridade
    if (moveRules && moveRules.length > 0) {
      console.log(`Processing ${moveRules.length} custom move rules`);
      
      // Ordenar regras por prioridade
      const sortedRules = [...moveRules]
        .filter((rule: any) => rule.enabled)
        .sort((a: any, b: any) => a.priority - b.priority);

      for (const rule of sortedRules) {
        let conditionsMet = false;
        const operator = rule.conditions.operator;
        
        // Avaliar condições
        const results = rule.conditions.criteria.map((criterion: any) => {
          let fieldValue: any;
          
          // Obter valor do campo
          if (criterion.field.startsWith('custom_field.')) {
            const fieldName = criterion.field.replace('custom_field.', '');
            fieldValue = analysis.custom_fields?.[fieldName];
          } else {
            switch (criterion.field) {
              case 'intention_score':
                fieldValue = analysis.intention_analysis.score;
                break;
              case 'service_quality_score':
                fieldValue = analysis.service_quality.score;
                break;
              case 'conversation_status':
                fieldValue = analysis.conversation_status;
                break;
              case 'value':
                fieldValue = analysis.value;
                break;
              default:
                fieldValue = null;
            }
          }

          // Aplicar operador
          switch (criterion.operator) {
            case '>':
              return fieldValue > criterion.value;
            case '<':
              return fieldValue < criterion.value;
            case '>=':
              return fieldValue >= criterion.value;
            case '<=':
              return fieldValue <= criterion.value;
            case '=':
              return fieldValue == criterion.value;
            case 'contains':
              return String(fieldValue).toLowerCase().includes(String(criterion.value).toLowerCase());
            case 'not_contains':
              return !String(fieldValue).toLowerCase().includes(String(criterion.value).toLowerCase());
            default:
              return false;
          }
        });

        // Verificar se condições foram atendidas
        if (operator === 'AND') {
          conditionsMet = results.every((r: boolean) => r);
        } else {
          conditionsMet = results.some((r: boolean) => r);
        }

        // Se condições atendidas, aplicar ação
        if (conditionsMet) {
          console.log(`Rule "${rule.name}" triggered`);
          
          switch (rule.action.type) {
            case 'move_to_column':
              targetColumnId = rule.action.target;
              break;
            case 'move_forward':
              const forwardPosition = Math.min(
                currentColumnPosition + Number(rule.action.target),
                columns.length - 1
              );
              targetColumnId = columns[forwardPosition].id;
              break;
            case 'move_backward':
              const backwardPosition = Math.max(
                currentColumnPosition - Number(rule.action.target),
                0
              );
              targetColumnId = columns[backwardPosition].id;
              break;
            case 'complete_card':
              // Buscar coluna "Finalizados"
              const finalColumn = columns.find(col => 
                col.name.toLowerCase() === 'finalizados' || 
                col.name.toLowerCase() === 'finalized'
              );
              
              if (finalColumn && rule.action.completion_type) {
                console.log(`Auto-completing card as ${rule.action.completion_type} via rule: ${rule.name}`);
                
                // Atualizar card com completion
                const { error: completionError } = await supabase
                  .from('cards')
                  .update({
                    column_id: finalColumn.id,
                    completion_type: rule.action.completion_type,
                    completion_reason: `Auto-finalizado por regra: ${rule.name}`,
                    completed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', cardId);
                
                if (completionError) {
                  console.error('Error completing card:', completionError);
                } else {
                  console.log(`Card ${cardId} completed as ${rule.action.completion_type}`);
                  
                  // Atualizar customer_profile stats se existir
                  if (card.customer_profile_id) {
                    const statField = rule.action.completion_type === 'won' ? 'total_won' :
                                     rule.action.completion_type === 'lost' ? 'total_lost' : 'total_completed';
                    
                    const { error: profileError } = await supabase.rpc('increment_customer_stat', {
                      profile_id: card.customer_profile_id,
                      stat_field: statField
                    });
                    
                    if (profileError) {
                      console.error('Error updating customer profile stats:', profileError);
                    }
                  }
                }
                
                // Marcar que já foi movido para não aplicar lógica padrão
                targetColumnId = finalColumn.id;
              }
              break;
          }
          
          break; // Primeira regra que atende para
        }
      }
    }
    
    // Se não houver regras customizadas ou nenhuma foi ativada, aplicar regras padrão inteligentes
    if (!targetColumnId) {
      console.log('No custom rules triggered, applying default intelligent rules');
      
      // Lógica padrão de movimentação baseada na análise
      const intentionScore = analysis.intention_analysis.score;
      const conversationStatus = analysis.conversation_status;
      
      // Se negócio fechado (ganho), mover para última coluna
      if (analysis.win_confirmation && analysis.win_confirmation.trim()) {
        targetColumnId = columns[columns.length - 1].id;
        console.log('Moving to final stage (win confirmed)');
      }
      // Se negócio perdido, mover para coluna específica se existir "Perdidos" ou manter na atual
      else if (analysis.loss_reason && analysis.loss_reason.trim()) {
        const lostColumn = columns.find(col => 
          col.name.toLowerCase().includes('perdido') || 
          col.name.toLowerCase().includes('lost')
        );
        if (lostColumn) {
          targetColumnId = lostColumn.id;
          console.log('Moving to lost stage');
        }
      }
      // Se alta intenção (>70) e conversa ainda aberta, avançar uma etapa
      else if (intentionScore > 70 && conversationStatus === 'open') {
        const nextPosition = Math.min(currentColumnPosition + 1, columns.length - 2);
        targetColumnId = columns[nextPosition].id;
        console.log('Moving forward (high intention)');
      }
      // Se média intenção (40-70) e na primeira coluna, mover para segunda
      else if (intentionScore >= 40 && intentionScore <= 70 && currentColumnPosition === 0) {
        targetColumnId = columns[1]?.id;
        console.log('Moving to qualification stage');
      }
      // Se baixa intenção (<30), mover para coluna de descartados/inativos se existir
      else if (intentionScore < 30) {
        const inactiveColumn = columns.find(col => 
          col.name.toLowerCase().includes('inativo') || 
          col.name.toLowerCase().includes('descartado') ||
          col.name.toLowerCase().includes('inactive')
        );
        if (inactiveColumn) {
          targetColumnId = inactiveColumn.id;
          console.log('Moving to inactive stage');
        }
      }
    }

    // Aplicar movimentação se houver mudança
    if (targetColumnId && targetColumnId !== card.column_id) {
      const { error: moveError } = await supabase
        .from('cards')
        .update({ column_id: targetColumnId, updated_at: new Date().toISOString() })
        .eq('id', cardId);

      if (moveError) {
        console.error('Error moving card:', moveError);
      } else {
        console.log(`Card moved from column ${card.column_id} to ${targetColumnId}`);
      }
    }

    // Criar ou atualizar lead_data
    const leadData = analysis.lead_data || {};
    const { data: existingLead } = await supabase
      .from('lead_data')
      .select('id')
      .eq('card_id', cardId)
      .maybeSingle();

    if (existingLead) {
      // Atualizar apenas campos não vazios
      const updateData: any = { updated_at: new Date().toISOString() };
      Object.keys(leadData).forEach(key => {
        if (leadData[key]) updateData[key] = leadData[key];
      });

      await supabase
        .from('lead_data')
        .update(updateData)
        .eq('id', existingLead.id);
    } else {
      await supabase
        .from('lead_data')
        .insert({
          card_id: cardId,
          ...leadData
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis: {
          summary: analysis.summary,
          intentionScore: analysis.intention_analysis.score,
          intentionType: analysis.intention_analysis.type,
          serviceQualityScore: analysis.service_quality.score,
          suggestions: analysis.service_quality.suggestions
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-conversation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});