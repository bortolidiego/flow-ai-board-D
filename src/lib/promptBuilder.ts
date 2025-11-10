import { BUSINESS_TEMPLATES, OBJECTIVE_LABELS } from './promptTemplates';

export interface CustomField {
  field_name: string;
  field_label: string;
  field_type: 'text' | 'number' | 'date' | 'select' | 'email' | 'phone';
  is_required: boolean;
}

export interface AIConfig {
  business_type: string;
  objectives: string[];
  custom_prompt?: string;
  use_custom_prompt: boolean;
}

export function buildPromptFromConfig(
  config: AIConfig,
  customFields: CustomField[]
): string {
  // Se usar prompt customizado, retorna ele
  if (config.use_custom_prompt && config.custom_prompt) {
    return config.custom_prompt;
  }

  // Busca template base
  const template = BUSINESS_TEMPLATES[config.business_type] || BUSINESS_TEMPLATES.custom;
  let prompt = template.basePrompt;

  // Adiciona objetivos selecionados
  if (config.objectives.length > 0) {
    prompt += '\n\nObjetivos da análise:';
    config.objectives.forEach(objId => {
      const label = OBJECTIVE_LABELS[objId];
      if (label) {
        prompt += `\n- ${label}`;
      }
    });
  }

  // Adiciona regras de extração para campos customizados
  if (customFields.length > 0) {
    prompt += '\n\nCampos para extrair da conversa:';
    customFields.forEach(field => {
      const rule = getExtractionRule(field.field_type);
      const required = field.is_required ? ' (OBRIGATÓRIO)' : '';
      prompt += `\n- ${field.field_label} (${field.field_name}): ${rule}${required}`;
    });
  }

  // Adiciona instruções finais
  prompt += `\n\nIMPORTANTE:
- Extraia apenas informações explicitamente mencionadas na conversa
- Se uma informação não foi mencionada, deixe o campo vazio
- Mantenha consistência na formatação dos dados
- Para campos obrigatórios, faça o máximo esforço para identificar a informação`;

  return prompt;
}

export function getExtractionRule(fieldType: string): string {
  const rules: Record<string, string> = {
    text: 'capturar texto relevante mencionado',
    email: 'identificar endereço de e-mail no formato válido',
    phone: 'extrair número de telefone com DDD',
    number: 'identificar valor numérico',
    date: 'extrair data no formato ISO (YYYY-MM-DD)',
    select: 'classificar em uma das opções pré-definidas'
  };
  
  return rules[fieldType] || 'capturar informação relevante';
}

export function buildAIFunctionSchema(customFields: CustomField[]) {
  const properties: Record<string, any> = {
    conversation_summary: {
      type: 'string',
      description: 'Resumo conciso da conversa em até 3 frases'
    },
    funnel_type: {
      type: 'string',
      description: 'Tipo de funil identificado na conversa'
    },
    funnel_score: {
      type: 'integer',
      description: 'Score de conversão de 0 a 10, onde 0 = nenhuma intenção e 10 = alta intenção de compra/conversão',
      minimum: 0,
      maximum: 10
    },
    service_quality_score: {
      type: 'integer',
      description: 'Qualidade do atendimento de 0 a 10, onde 0 = péssimo e 10 = excelente',
      minimum: 0,
      maximum: 10
    }
  };

  const required = ['conversation_summary', 'funnel_type', 'funnel_score', 'service_quality_score'];

  // Adiciona campos customizados ao schema
  customFields.forEach(field => {
    properties[field.field_name] = {
      type: getSchemaType(field.field_type),
      description: field.field_label
    };

    if (field.is_required) {
      required.push(field.field_name);
    }
  });

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

export function validatePromptConfig(config: AIConfig, customFields: CustomField[]): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Verifica se há campos customizados mas nenhum objetivo selecionado
  if (customFields.length > 0 && config.objectives.length === 0 && !config.use_custom_prompt) {
    warnings.push('Você configurou campos customizados mas não selecionou objetivos. Isso pode reduzir a precisão da IA.');
  }

  // Verifica se há campos obrigatórios
  const requiredFields = customFields.filter(f => f.is_required);
  if (requiredFields.length > 0) {
    warnings.push(`${requiredFields.length} campo(s) marcado(s) como obrigatório. A IA tentará extraí-los sempre.`);
  }

  // Verifica se está usando prompt customizado sem campos
  if (config.use_custom_prompt && customFields.length === 0) {
    warnings.push('Prompt customizado sem campos configurados. Considere adicionar campos para extrair dados estruturados.');
  }

  return {
    valid: warnings.length === 0 || warnings.every(w => !w.includes('erro')),
    warnings
  };
}

export function generateExampleOutput(
  businessType: string,
  customFields: CustomField[]
): Record<string, any> {
  const template = BUSINESS_TEMPLATES[businessType];
  
  if (template?.exampleConversations.length > 0) {
    return template.exampleConversations[0].expectedOutput;
  }

  // Gera exemplo genérico baseado nos campos
  const example: Record<string, any> = {
    conversation_summary: 'Cliente demonstrou interesse em...',
    funnel_type: 'interesse',
    funnel_score: 7,
    service_quality_score: 8
  };

  customFields.forEach(field => {
    switch (field.field_type) {
      case 'email':
        example[field.field_name] = 'exemplo@email.com';
        break;
      case 'phone':
        example[field.field_name] = '(11) 98765-4321';
        break;
      case 'number':
        example[field.field_name] = 100;
        break;
      case 'date':
        example[field.field_name] = '2025-01-15';
        break;
      default:
        example[field.field_name] = `Exemplo de ${field.field_label.toLowerCase()}`;
    }
  });

  return example;
}
