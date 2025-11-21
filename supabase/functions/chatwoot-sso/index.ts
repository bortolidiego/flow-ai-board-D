/* eslint-disable */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔑 chatwoot-sso: Iniciando função SSO');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { email, name, identifier } = await req.json();
    console.log('📧 Dados recebidos:', { email, name, identifier });

    if (!email) {
      console.error('❌ Email não fornecido');
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Verificar se usuário existe
    console.log('🔍 Buscando usuário existente...');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('❌ Erro ao listar usuários:', listError);
      throw listError;
    }

    const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    console.log('👤 Usuário encontrado:', existingUser ? 'SIM' : 'NÃO');

    let userId;

    if (existingUser) {
      userId = existingUser.id;
      console.log('✅ Usuário existente encontrado, ID:', userId);

      // Atualizar senha para garantir que o auto-login funcione
      console.log('🔄 Atualizando senha do usuário existente...');
      const generatedPassword = `Chatwoot-${identifier || 'App'}-${email}-Secure!`;

      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: generatedPassword,
        user_metadata: { full_name: name }
      });

      if (updateError) {
        console.error('❌ Erro ao atualizar usuário:', updateError);
        throw updateError;
      }

      console.log('✅ Senha atualizada com sucesso');
    } else {
      console.log('🆕 Usuário não encontrado, criando novo...');

      // Criar usuário
      const generatedPassword = `Chatwoot-${identifier || 'App'}-${email}-Secure!`;

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: { full_name: name }
      });

      if (createError) {
        console.error('❌ Erro ao criar usuário:', createError);
        throw createError;
      }

      userId = newUser.user.id;
      console.log('✅ Novo usuário criado, ID:', userId);
    }

    // 2. Garantir que ele está no Workspace (se houver apenas um, pega o primeiro)
    console.log('🏢 Verificando workspace...');
    const { data: workspaces } = await supabase.from('workspaces').select('id').limit(1);

    if (workspaces && workspaces.length > 0) {
      const workspaceId = workspaces[0].id;
      console.log('🏢 Workspace encontrado, ID:', workspaceId);

      // Verifica membership
      const { data: member } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!member) {
        console.log('👥 Usuário não é membro, adicionando...');
        const { error: memberError } = await supabase
          .from('workspace_members')
          .insert({ workspace_id: workspaceId, user_id: userId });

        if (memberError) {
          console.error('❌ Erro ao adicionar membro:', memberError);
          throw memberError;
        }
        console.log('✅ Membro adicionado ao workspace');
      } else {
        console.log('✅ Usuário já é membro do workspace');
      }

      // Garante role de USER (não admin) por padrão
      const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (!role) {
        console.log('🔒 Criando role de usuário...');
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'user' });

        if (roleError) {
          console.error('❌ Erro ao criar role:', roleError);
          throw roleError;
        }
        console.log('✅ Role de usuário criada');
      } else {
        console.log('✅ Role já existe:', role.role);
      }
    } else {
      console.log('⚠️ Nenhum workspace encontrado');
    }

    const generatedPassword = `Chatwoot-${identifier || 'App'}-${email}-Secure!`;

    console.log('🎉 SSO concluído com sucesso');
    return new Response(
      JSON.stringify({
        success: true,
        email,
        password: generatedPassword // Retorna para o front fazer o login
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Erro geral na função SSO:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});