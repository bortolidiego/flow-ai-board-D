# Guia de Testes: Integração UAZAPI WhatsApp

Este guia descreve como testar a nova integração do WhatsApp (UAZAPI) no Flow AI Board.

## 1. Pré-requisitos

1.  **Banco de Dados**: Certifique-se de que as migrations foram aplicadas:
    *   `20251127131400_create_whatsapp_instances.sql`
    *   `20251127131401_create_whatsapp_messages.sql`
    *   `20251127131402_add_whatsapp_fields_to_cards.sql`

2.  **Edge Functions**: Certifique-se de que as funções foram deployadas e as variáveis de ambiente (`SUPABASE_URL`, `SERVICE_ROLE_KEY`) estão configuradas:
    *   `uazapi-webhook`
    *   `uazapi-manage-instance`
    *   `uazapi-send-message`

## 2. Testando a Criação de Instância

1.  Acesse o menu **WhatsApp** na barra lateral.
2.  Clique em **Adicionar Canal**.
3.  Preencha os dados:
    *   **Nome**: Teste 1
    *   **URL Base**: Sua URL da UAZAPI (ex: `https://api.uazapi.com`)
    *   **Admin Token**: Seu token de admin da UAZAPI
    *   **Pipeline**: Selecione um pipeline existente
4.  Clique em **Criar Instância**.
5.  **Resultado Esperado**: O card da instância deve aparecer na lista com status "Desconectado".

## 3. Testando Conexão (QR Code)

1.  No card da instância criada, clique em **Conectar**.
2.  Um diálogo deve abrir exibindo o QR Code (se a API retornar corretamente).
3.  Leia o QR Code com seu WhatsApp.
4.  **Resultado Esperado**: O status deve mudar para "Conectado" após alguns segundos (o polling verifica o status).

## 4. Testando Recebimento de Mensagens (Webhook)

1.  Envie uma mensagem de outro número para o WhatsApp conectado.
2.  Verifique se um novo Card foi criado na primeira coluna do pipeline selecionado.
3.  O card deve ter:
    *   Título: Nome do contato
    *   Descrição: Conteúdo da mensagem com timestamp
    *   Ícone do WhatsApp (se implementado na visualização do card)

## 5. Testando Envio de Mensagens

1.  Abra o card criado no passo anterior.
2.  No cabeçalho do diálogo, clique no botão **WhatsApp**.
3.  Digite uma mensagem e clique em **Enviar**.
4.  **Resultado Esperado**: A mensagem deve chegar no WhatsApp do destinatário.

## 6. Troubleshooting Comum

*   **Erro ao criar instância**: Verifique se a URL da UAZAPI está correta e se o Admin Token é válido. Verifique os logs da função `uazapi-manage-instance`.
*   **QR Code não aparece**: Verifique se a instância foi criada corretamente na UAZAPI. Alguns provedores demoram um pouco para gerar o QR Code.
*   **Mensagens não chegam**: Verifique se a URL do Webhook está configurada corretamente na UAZAPI (`.../functions/v1/uazapi-webhook`). Verifique os logs da função `uazapi-webhook`.
