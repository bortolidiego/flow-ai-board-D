if (data && typeof data === 'object' && 'id' in data && data.id) {
      const integration = data as unknown as EvolutionIntegration;
      setHasIntegration(true);
      setIntegrationId(integration.id);
      setInstanceName(integration.instance_name);
      setInstanceAlias(integration.instance_alias || '');
      setWebhookUrl(integration.webhook_url);
      setApiUrl(integration.api_url);
      setApiKey(integration.api_key);
      setPhoneNumber(integration.phone_number || '');
      setActive(integration.active);
      setAutoCreateCards(integration.auto_create_cards ?? true);
      setAnalyzeMessages(integration.analyze_messages ?? true);
      setLastConnection(integration.last_connection || null);
      setStatus(integration.status || 'disconnected');
    }