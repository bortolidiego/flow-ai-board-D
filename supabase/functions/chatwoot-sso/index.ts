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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { email, name, identifier } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Verificar se usuário existe
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    // Senha padrão determinística para integração (Segurança por obscuridade + contexto do iframe)
    // Em produção ideal, usaríamos troca de tokens, mas isso resolve para o MVP
    const generatedPassword = `Chatwoot-${identifier || 'App'}-${email}-Secure!`;

    let userId;

    if (existingUser) {
      userId = existingUser.id;
      // Atualizar senha para garantir que o auto-login funcione
      await supabase.auth.admin.updateUserById(userId, {
        password: generatedPassword,
        user_metadata: { full_name: name }
      });
    } else {
      // Criar usuário
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: { full_name: name }
      });

      if (createError) throw createError;
      userId = newUser.user.id;
    }

    // 2. Garantir que ele está no Workspace (se houver apenas um, pega o primeiro)
    const { data: workspaces } = await supabase.from('workspaces').select('id').limit(1);
    
    if (workspaces && workspaces.length > 0) {
      const workspaceId = workspaces[0].id;
      
      // Verifica membership
      const { data: member } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('user_id', userId)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (!member) {
        await supabase.from('workspace_members').insert({
          user_id: userId,
          workspace_id: workspaceId
        });
      }

      // Garante role de USER (não admin) por padrão
      const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (!role) {
        await supabase.from('user_roles').insert({
          user_id: userId,
          role: 'user'
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        email,
        password: generatedPassword // Retorna para o front fazer o login
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});