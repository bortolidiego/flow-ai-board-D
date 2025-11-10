-- Inserir template completo: Loja de Eletrônicos com Assistência Técnica
INSERT INTO behavior_templates (name, business_type, description, is_system, config)
VALUES (
  'Loja de Eletrônicos com Assistência Técnica',
  'electronics_repair',
  'Template completo para lojas de eletrônicos com serviços de reparo. Inclui controle de SLA, monitoramento de tempo de atendimento e movimentação automática inteligente.',
  true,
  '{
    "stages": [
      { "name": "Novo Contato", "position": 0 },
      { "name": "Em Atendimento", "position": 1 },
      { "name": "Aguardando", "position": 2 },
      { "name": "Finalizado", "position": 3 }
    ],
    "custom_fields": [
      {
        "field_name": "tipo_solicitacao",
        "field_label": "Tipo de Solicitação",
        "field_type": "select",
        "is_required": true,
        "position": 0,
        "field_options": ["Venda", "Assistência Técnica", "Troca/Garantia", "Dúvida"]
      },
      {
        "field_name": "produto_modelo",
        "field_label": "Produto/Modelo",
        "field_type": "text",
        "is_required": true,
        "position": 1
      },
      {
        "field_name": "imei_serie",
        "field_label": "IMEI/Número de Série",
        "field_type": "text",
        "is_required": false,
        "position": 2
      },
      {
        "field_name": "problema_relatado",
        "field_label": "Problema Relatado",
        "field_type": "text",
        "is_required": false,
        "position": 3
      },
      {
        "field_name": "tipo_reparo",
        "field_label": "Tipo de Reparo",
        "field_type": "select",
        "is_required": false,
        "position": 4,
        "field_options": ["Tela", "Bateria", "Placa", "Câmera", "Software", "Água", "Outro"]
      },
      {
        "field_name": "estado_aparelho",
        "field_label": "Estado do Aparelho",
        "field_type": "select",
        "is_required": false,
        "position": 5,
        "field_options": ["Funcional", "Parcialmente Funcional", "Não Liga", "Dano Físico"]
      },
      {
        "field_name": "status_reparo",
        "field_label": "Status do Reparo",
        "field_type": "select",
        "is_required": false,
        "position": 6,
        "field_options": ["Aguardando Diagnóstico", "Orçamento Enviado", "Aprovado", "Em Reparo", "Aguardando Peça", "Pronto", "Cancelado"]
      },
      {
        "field_name": "valor_orcado",
        "field_label": "Valor Orçado",
        "field_type": "number",
        "is_required": false,
        "position": 7
      },
      {
        "field_name": "prazo_estimado",
        "field_label": "Prazo Estimado",
        "field_type": "date",
        "is_required": false,
        "position": 8
      },
      {
        "field_name": "forma_pagamento",
        "field_label": "Forma de Pagamento",
        "field_type": "select",
        "is_required": false,
        "position": 9,
        "field_options": ["À vista", "Cartão", "PIX", "Parcelado", "Garantia"]
      },
      {
        "field_name": "nps",
        "field_label": "NPS (0-10)",
        "field_type": "number",
        "is_required": false,
        "position": 10
      },
      {
        "field_name": "data_primeira_resposta",
        "field_label": "Data Primeira Resposta",
        "field_type": "date",
        "is_required": false,
        "position": 11
      },
      {
        "field_name": "tempo_primeira_resposta",
        "field_label": "Tempo Primeira Resposta (min)",
        "field_type": "number",
        "is_required": false,
        "position": 12
      },
      {
        "field_name": "ultima_interacao_cliente",
        "field_label": "Última Interação Cliente",
        "field_type": "date",
        "is_required": false,
        "position": 13
      },
      {
        "field_name": "ultima_interacao_agente",
        "field_label": "Última Interação Agente",
        "field_type": "date",
        "is_required": false,
        "position": 14
      },
      {
        "field_name": "tempo_aguardando",
        "field_label": "Tempo Aguardando (min)",
        "field_type": "number",
        "is_required": false,
        "position": 15
      },
      {
        "field_name": "sla_definido",
        "field_label": "SLA Definido (min)",
        "field_type": "number",
        "is_required": false,
        "position": 16
      },
      {
        "field_name": "status_sla",
        "field_label": "Status SLA",
        "field_type": "select",
        "is_required": false,
        "position": 17,
        "field_options": ["Dentro do SLA", "Próximo do Limite", "Estourado"]
      },
      {
        "field_name": "prioridade_atendimento",
        "field_label": "Prioridade Atendimento",
        "field_type": "select",
        "is_required": false,
        "position": 18,
        "field_options": ["Baixa", "Normal", "Alta", "Imediata"]
      },
      {
        "field_name": "motivo_urgencia",
        "field_label": "Motivo Urgência",
        "field_type": "text",
        "is_required": false,
        "position": 19
      }
    ],
    "intention_types": [
      { "intention_type": "compra", "intention_label": "Compra Nova", "color": "#10b981", "position": 0 },
      { "intention_type": "orcamento_reparo", "intention_label": "Orçamento Reparo", "color": "#3b82f6", "position": 1 },
      { "intention_type": "garantia", "intention_label": "Garantia/Troca", "color": "#f59e0b", "position": 2 },
      { "intention_type": "duvida_tecnica", "intention_label": "Dúvida Técnica", "color": "#8b5cf6", "position": 3 },
      { "intention_type": "aprovacao_orcamento", "intention_label": "Aprovar Orçamento", "color": "#06b6d4", "position": 4 },
      { "intention_type": "reclamacao", "intention_label": "Reclamação", "color": "#ef4444", "position": 5 },
      { "intention_type": "retirada", "intention_label": "Retirar Aparelho", "color": "#14b8a6", "position": 6 },
      { "intention_type": "acompanhamento", "intention_label": "Acompanhamento", "color": "#6366f1", "position": 7 }
    ],
    "move_rules": {
      "rules": [
        {
          "id": "rule_sla_estourado",
          "name": "Escalar quando SLA estourado",
          "enabled": true,
          "priority": 1,
          "conditions": {
            "operator": "AND",
            "criteria": [
              { "field": "custom_field:status_sla", "operator": "=", "value": "Estourado" },
              { "field": "conversation_status", "operator": "=", "value": "open" }
            ]
          },
          "action": {
            "type": "move_to_column",
            "target": "Em Atendimento"
          }
        },
        {
          "id": "rule_reparo_pronto",
          "name": "Mover para Finalizado quando reparo pronto",
          "enabled": true,
          "priority": 2,
          "conditions": {
            "operator": "OR",
            "criteria": [
              { "field": "custom_field:status_reparo", "operator": "=", "value": "Pronto" },
              { "field": "custom_field:status_reparo", "operator": "=", "value": "Cancelado" }
            ]
          },
          "action": {
            "type": "move_to_column",
            "target": "Finalizado"
          }
        },
        {
          "id": "rule_aguardando_peca",
          "name": "Mover para Aguardando quando esperando peça",
          "enabled": true,
          "priority": 3,
          "conditions": {
            "operator": "OR",
            "criteria": [
              { "field": "custom_field:status_reparo", "operator": "=", "value": "Aguardando Peça" },
              { "field": "custom_field:status_reparo", "operator": "=", "value": "Orçamento Enviado" }
            ]
          },
          "action": {
            "type": "move_to_column",
            "target": "Aguardando"
          }
        },
        {
          "id": "rule_orcamento_aprovado",
          "name": "Mover para Em Atendimento quando aprovado",
          "enabled": true,
          "priority": 4,
          "conditions": {
            "operator": "AND",
            "criteria": [
              { "field": "custom_field:status_reparo", "operator": "=", "value": "Aprovado" },
              { "field": "intention_type", "operator": "=", "value": "aprovacao_orcamento" }
            ]
          },
          "action": {
            "type": "move_to_column",
            "target": "Em Atendimento"
          }
        },
        {
          "id": "rule_urgencia_imediata",
          "name": "Priorizar casos imediatos",
          "enabled": true,
          "priority": 5,
          "conditions": {
            "operator": "AND",
            "criteria": [
              { "field": "custom_field:prioridade_atendimento", "operator": "=", "value": "Imediata" },
              { "field": "conversation_status", "operator": "=", "value": "open" }
            ]
          },
          "action": {
            "type": "move_to_column",
            "target": "Em Atendimento"
          }
        }
      ]
    },
    "ai_config": {
      "business_type": "electronics_repair",
      "model_name": "google/gemini-2.5-flash",
      "objectives": [
        "qualify_leads",
        "identify_sales_opportunities",
        "extract_contact_data",
        "detect_technical_issues",
        "identify_repair_type",
        "assess_customer_satisfaction",
        "detect_urgency_signals",
        "assess_customer_sentiment",
        "calculate_response_metrics"
      ],
      "analyze_on_close": true,
      "analyze_on_message": false,
      "generated_prompt": "Você é um analista de conversas de uma loja de eletrônicos com assistência técnica.\\nSeu objetivo é identificar se é venda ou reparo, extrair informações técnicas, qualificar o atendimento e monitorar tempos de resposta.\\n\\nFoque em:\\n- Tipo de solicitação (venda, reparo, garantia, dúvida)\\n- Modelo do aparelho mencionado (celulares, notebooks, tablets, etc.)\\n- Problema técnico relatado (se for reparo)\\n- Tipo de reparo necessário (tela, bateria, placa, etc)\\n- Urgência do cliente e sinais de pressa\\n- Valor ou orçamento mencionado\\n- Satisfação com o atendimento e tempo de espera\\n- Confirmação de venda/aprovação de orçamento\\n- Timestamps de mensagens para calcular tempos de resposta\\n\\nPara reparos, sempre tente identificar:\\n1. O que está defeituoso\\n2. Como o problema ocorreu (queda, água, etc)\\n3. Condição geral do aparelho\\n4. Se o cliente está com pressa ou pode aguardar\\n\\nPara análise de SLA:\\n- Identifique quando o cliente enviou a primeira mensagem\\n- Identifique quando o agente respondeu pela primeira vez\\n- Identifique sinais de urgência (\\\"urgente\\\", \\\"rápido\\\", \\\"preciso hoje\\\", etc.)\\n- Classifique a prioridade baseado no tipo de problema e urgência\\n- Avalie se o cliente está insatisfeito com o tempo de espera\\n\\nSeja técnico e preciso nas extrações.",
      "examples": [
        {
          "input": "Oi, meu iPhone 14 caiu e a tela quebrou. Quanto custa pra trocar? É urgente!",
          "expectedOutput": {
            "product_item": "iPhone 14",
            "problema_relatado": "Tela quebrada após queda",
            "tipo_reparo": "Tela",
            "tipo_solicitacao": "Assistência Técnica",
            "intention_type": "orcamento_reparo",
            "intention_score": 8,
            "prioridade_atendimento": "Alta",
            "motivo_urgencia": "Cliente mencionou urgência"
          }
        },
        {
          "input": "Quero comprar um Samsung Galaxy S24, vocês têm em estoque?",
          "expectedOutput": {
            "product_item": "Samsung Galaxy S24",
            "tipo_solicitacao": "Venda",
            "intention_type": "compra",
            "intention_score": 9,
            "prioridade_atendimento": "Normal"
          }
        },
        {
          "input": "Aprovado! Pode fazer o reparo. Quando fica pronto?",
          "expectedOutput": {
            "status_reparo": "Aprovado",
            "intention_type": "aprovacao_orcamento",
            "intention_score": 10
          }
        },
        {
          "input": "Meu notebook está com problema na bateria, descarrega muito rápido. Mas não é urgente.",
          "expectedOutput": {
            "problema_relatado": "Bateria descarregando rápido",
            "tipo_reparo": "Bateria",
            "tipo_solicitacao": "Assistência Técnica",
            "intention_type": "orcamento_reparo",
            "intention_score": 7,
            "prioridade_atendimento": "Baixa"
          }
        }
      ]
    }
  }'::jsonb
);