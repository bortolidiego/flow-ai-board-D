export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  basePrompt: string;
  defaultObjectives: string[];
  extractionRules: Record<string, string>;
  exampleConversations: Array<{
    input: string;
    expectedOutput: Record<string, any>;
  }>;
  moveRules: Array<{
    condition: string;
    when_conversation?: string;
    allowed_stages?: string[];
    target_stage?: string;
    extract_fields?: string[];
  }>;
}

export const BUSINESS_TEMPLATES: Record<string, PromptTemplate> = {
  ecommerce: {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Otimizado para lojas online e vendas de produtos',
    icon: 'ShoppingCart',
    basePrompt: `Você é um analista de conversas de e-commerce.
Seu objetivo é identificar oportunidades de venda e qualificar leads.

Foque em:
- Produtos ou serviços mencionados pelo cliente
- Interesse de compra e estágio da negociação
- Valor do pedido ou orçamento mencionado
- Objeções ou dúvidas do cliente
- Confirmação de compra ou desistência

Seja preciso e extraia apenas informações explicitamente mencionadas.`,
    defaultObjectives: [
      'qualify_leads',
      'identify_sales_opportunities',
      'extract_contact_data',
      'detect_products_of_interest'
    ],
    extractionRules: {
      text: 'capturar texto relevante mencionado',
      email: 'identificar endereço de e-mail mencionado',
      phone: 'extrair número de telefone',
      number: 'identificar valor numérico (preço, quantidade)',
      date: 'extrair data de entrega ou prazo mencionado',
      select: 'classificar em uma das opções disponíveis'
    },
    exampleConversations: [
      {
        input: 'Olá, quanto custa o Notebook Dell Inspiron?',
        expectedOutput: {
          product_item: 'Notebook Dell Inspiron',
          funnel_type: 'compra',
          funnel_score: 7
        }
      },
      {
        input: 'Fechei a compra! Podem enviar para meu email joao@email.com',
        expectedOutput: {
          win_confirmation: 'Compra confirmada',
          email: 'joao@email.com',
          funnel_type: 'compra_fechada',
          funnel_score: 10
        }
      }
    ],
    moveRules: [
      {
        condition: 'has_value',
        when_conversation: 'closed',
        allowed_stages: ['Ganho', 'Perdido'],
        extract_fields: ['win_confirmation', 'loss_reason']
      }
    ]
  },

  services: {
    id: 'services',
    name: 'Serviços',
    description: 'Para empresas de consultoria, serviços e atendimento',
    icon: 'Briefcase',
    basePrompt: `Você é um analista de conversas de prestação de serviços.
Seu objetivo é qualificar leads e identificar necessidades dos clientes.

Foque em:
- Tipo de serviço solicitado
- Urgência e prazo necessário
- Orçamento ou valor esperado
- Requisitos específicos mencionados
- Experiência anterior do cliente
- Objeções ou preocupações

Extraia apenas informações claramente mencionadas na conversa.`,
    defaultObjectives: [
      'qualify_leads',
      'extract_contact_data',
      'assess_customer_satisfaction',
      'identify_service_needs'
    ],
    extractionRules: {
      text: 'capturar detalhes do serviço solicitado',
      email: 'identificar e-mail do cliente',
      phone: 'extrair telefone de contato',
      date: 'identificar prazo ou data desejada',
      select: 'classificar tipo de serviço ou urgência'
    },
    exampleConversations: [
      {
        input: 'Preciso de uma consultoria jurídica para abrir minha empresa',
        expectedOutput: {
          subject: 'Consultoria jurídica',
          funnel_type: 'contratacao_servico',
          funnel_score: 8
        }
      }
    ],
    moveRules: [
      {
        condition: 'has_value',
        when_conversation: 'closed',
        allowed_stages: ['Contratado', 'Não Contratado'],
        extract_fields: ['win_confirmation', 'loss_reason']
      }
    ]
  },

  real_estate: {
    id: 'real_estate',
    name: 'Imobiliária',
    description: 'Para venda e locação de imóveis',
    icon: 'Home',
    basePrompt: `Você é um analista de conversas imobiliárias.
Seu objetivo é qualificar leads interessados em compra ou locação de imóveis.

Foque em:
- Tipo de imóvel de interesse (casa, apartamento, terreno)
- Finalidade (compra, locação, investimento)
- Localização ou região desejada
- Faixa de preço ou orçamento
- Características desejadas (quartos, vagas, área)
- Urgência na negociação
- Visitas agendadas ou realizadas

Seja objetivo e extraia apenas dados mencionados explicitamente.`,
    defaultObjectives: [
      'qualify_leads',
      'identify_property_interests',
      'extract_contact_data',
      'detect_urgency'
    ],
    extractionRules: {
      text: 'capturar detalhes do imóvel desejado',
      email: 'identificar e-mail',
      phone: 'extrair telefone',
      number: 'identificar valor ou faixa de preço',
      select: 'classificar tipo de imóvel ou finalidade'
    },
    exampleConversations: [
      {
        input: 'Busco apartamento 2 quartos na zona sul, até R$ 300 mil',
        expectedOutput: {
          product_item: 'Apartamento 2 quartos',
          value: 300000,
          funnel_type: 'compra',
          funnel_score: 8
        }
      }
    ],
    moveRules: [
      {
        condition: 'has_value',
        when_conversation: 'closed',
        allowed_stages: ['Venda Fechada', 'Desistiu'],
        extract_fields: ['win_confirmation', 'loss_reason']
      }
    ]
  },

  healthcare: {
    id: 'healthcare',
    name: 'Saúde',
    description: 'Para clínicas, hospitais e serviços de saúde',
    icon: 'Heart',
    basePrompt: `Você é um analista de conversas na área da saúde.
Seu objetivo é qualificar agendamentos e identificar necessidades dos pacientes.

Foque em:
- Tipo de consulta ou procedimento solicitado
- Sintomas ou queixas mencionadas
- Urgência do atendimento
- Preferência de data e horário
- Convênio médico ou particular
- Histórico relevante mencionado

IMPORTANTE: Mantenha sigilo e respeito às informações de saúde.
Extraia apenas o necessário para qualificar o atendimento.`,
    defaultObjectives: [
      'schedule_appointments',
      'extract_contact_data',
      'identify_service_needs',
      'assess_urgency'
    ],
    extractionRules: {
      text: 'capturar tipo de consulta ou sintoma',
      email: 'identificar e-mail',
      phone: 'extrair telefone',
      date: 'identificar data desejada para consulta',
      select: 'classificar especialidade ou tipo de atendimento'
    },
    exampleConversations: [
      {
        input: 'Preciso agendar consulta com cardiologista, preferência manhã',
        expectedOutput: {
          subject: 'Consulta Cardiologia',
          funnel_type: 'agendamento',
          funnel_score: 9
        }
      }
    ],
    moveRules: [
      {
        condition: 'has_value',
        when_conversation: 'closed',
        allowed_stages: ['Agendado', 'Cancelado'],
        extract_fields: ['win_confirmation', 'loss_reason']
      }
    ]
  },

  education: {
    id: 'education',
    name: 'Educação',
    description: 'Para escolas, cursos e instituições de ensino',
    icon: 'GraduationCap',
    basePrompt: `Você é um analista de conversas educacionais.
Seu objetivo é qualificar leads interessados em cursos e programas educacionais.

Foque em:
- Curso ou programa de interesse
- Nível de escolaridade do interessado
- Modalidade desejada (presencial, online, híbrido)
- Objetivos educacionais ou profissionais
- Disponibilidade de horários
- Orçamento ou condições de pagamento
- Experiência prévia na área

Seja claro e extraia informações relevantes para matrícula.`,
    defaultObjectives: [
      'qualify_leads',
      'identify_course_interests',
      'extract_contact_data',
      'assess_student_profile'
    ],
    extractionRules: {
      text: 'capturar curso de interesse e objetivos',
      email: 'identificar e-mail',
      phone: 'extrair telefone',
      date: 'identificar data de início desejada',
      select: 'classificar modalidade ou nível'
    },
    exampleConversations: [
      {
        input: 'Quero me matricular no curso de inglês avançado, online',
        expectedOutput: {
          product_item: 'Curso de Inglês Avançado',
          funnel_type: 'matricula',
          funnel_score: 9
        }
      }
    ],
    moveRules: [
      {
        condition: 'has_value',
        when_conversation: 'closed',
        allowed_stages: ['Matriculado', 'Desistiu'],
        extract_fields: ['win_confirmation', 'loss_reason']
      }
    ]
  },

  support: {
    id: 'support',
    name: 'Suporte Técnico',
    description: 'Para atendimento e suporte ao cliente',
    icon: 'Headphones',
    basePrompt: `Você é um analista de conversas de suporte técnico.
Seu objetivo é categorizar problemas e avaliar qualidade do atendimento.

Foque em:
- Tipo de problema ou dúvida relatada
- Produto ou serviço relacionado
- Gravidade do problema (crítico, moderado, leve)
- Resolução fornecida ou pendências
- Satisfação do cliente com o atendimento
- Necessidade de escalação
- Tempo de resposta e resolução

Priorize clareza e categorização precisa dos tickets.`,
    defaultObjectives: [
      'categorize_issues',
      'assess_customer_satisfaction',
      'detect_problems',
      'evaluate_resolution'
    ],
    extractionRules: {
      text: 'capturar descrição do problema',
      select: 'classificar tipo de problema ou gravidade',
      number: 'identificar código de erro ou ticket'
    },
    exampleConversations: [
      {
        input: 'Meu produto chegou com defeito, não liga',
        expectedOutput: {
          subject: 'Produto com defeito',
          funnel_type: 'reclamacao',
          service_quality_score: 3
        }
      }
    ],
    moveRules: [
      {
        condition: 'has_value',
        when_conversation: 'closed',
        allowed_stages: ['Resolvido', 'Não Resolvido'],
        extract_fields: ['win_confirmation', 'loss_reason']
      }
    ]
  },

  custom: {
    id: 'custom',
    name: 'Personalizado',
    description: 'Configure do zero para seu negócio específico',
    icon: 'Settings',
    basePrompt: `Você é um assistente de análise de conversas.
Analise a conversa e extraia informações estruturadas de forma precisa.

Seja objetivo e extraia apenas informações explicitamente mencionadas.
Mantenha consistência na formatação dos dados extraídos.`,
    defaultObjectives: [],
    extractionRules: {
      text: 'capturar texto relevante mencionado',
      email: 'identificar endereço de e-mail',
      phone: 'extrair número de telefone',
      number: 'identificar valor numérico',
      date: 'extrair data mencionada',
      select: 'classificar em uma das opções'
    },
    exampleConversations: [],
    moveRules: []
  }
};

export const OBJECTIVE_LABELS: Record<string, string> = {
  qualify_leads: 'Qualificar leads',
  identify_sales_opportunities: 'Identificar oportunidades de venda',
  extract_contact_data: 'Extrair dados de contato',
  assess_customer_satisfaction: 'Avaliar satisfação do cliente',
  detect_problems: 'Detectar problemas/reclamações',
  identify_products_of_interest: 'Identificar produtos de interesse',
  schedule_appointments: 'Agendar consultas/visitas',
  categorize_issues: 'Categorizar problemas',
  identify_service_needs: 'Identificar necessidades de serviço',
  identify_property_interests: 'Identificar interesse imobiliário',
  identify_course_interests: 'Identificar interesse em cursos',
  detect_urgency: 'Detectar urgência',
  assess_student_profile: 'Avaliar perfil do aluno',
  evaluate_resolution: 'Avaliar resolução'
};

export const OBJECTIVE_DESCRIPTIONS: Record<string, string> = {
  qualify_leads: 'Identificar e classificar potenciais clientes com base no interesse demonstrado',
  identify_sales_opportunities: 'Detectar momentos propícios para oferta de produtos ou serviços',
  extract_contact_data: 'Capturar informações de contato como email, telefone e endereço',
  assess_customer_satisfaction: 'Medir o nível de satisfação do cliente com o atendimento',
  detect_problems: 'Identificar reclamações, problemas ou insatisfações mencionadas',
  identify_products_of_interest: 'Reconhecer quais produtos ou serviços o cliente demonstra interesse',
  schedule_appointments: 'Identificar intenção de agendamento e preferências de data/horário',
  categorize_issues: 'Classificar o tipo de problema ou solicitação do cliente',
  identify_service_needs: 'Identificar que tipo de serviço o cliente necessita',
  identify_property_interests: 'Detectar características de imóvel desejado',
  identify_course_interests: 'Identificar cursos ou programas educacionais de interesse',
  detect_urgency: 'Avaliar o nível de urgência da solicitação',
  assess_student_profile: 'Entender perfil e necessidades educacionais do aluno',
  evaluate_resolution: 'Verificar se o problema foi resolvido satisfatoriamente'
};

export const AI_MODELS = [
  {
    id: 'google/gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    description: 'Mais rápido e econômico - Ideal para classificação e resumos',
    recommended: true
  },
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Equilibrado - Boa performance e custo'
  },
  {
    id: 'google/gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Mais poderoso - Melhor para análises complexas'
  }
];
