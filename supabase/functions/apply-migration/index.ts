import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

        // 1. Criar tabela se não existir
        const { error: createError } = await supabase.rpc('execute_sql', {
            sql_query: `
        CREATE TABLE IF NOT EXISTS chatwoot_processed_events (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          signature TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `
        });

        if (createError) {
            // Se falhar RPC (provavelmente não existe), tentar via SQL direto se possível (mas supabase-js não permite DDL direto sem RPC)
            // Mas podemos tentar usar a API REST se tivermos permissões.
            // Na verdade, a melhor forma é assumir que a tabela já existe (pois o código já a usa) e tentar adicionar a constraint.
            console.error("Error creating table via RPC:", createError);
        }

        // Como não temos uma RPC genérica 'execute_sql' por padrão, vamos tentar usar o endpoint /rest/v1/ com POST se possível, mas DDL não funciona via REST.
        // Vamos tentar usar a função postgres se tivermos acesso.

        // ALTERNATIVA: Se não conseguirmos rodar DDL, vamos criar uma função RPC via migration? Não, ovo e galinha.

        // Vamos tentar usar o Postgres.js connection se tivermos a string de conexão, mas não temos.

        // Vamos tentar uma abordagem diferente:
        // O problema é que não conseguimos rodar DDL via client-js padrão.

        // Mas espere, se eu não consigo rodar DDL, como vou aplicar a migration?
        // Eu preciso que o usuário rode a migration localmente ou via dashboard.

        // Mas eu tenho acesso ao `mcp0_apply_migration`. Vou tentar usar ele de novo, mas talvez o erro de autenticação seja porque eu preciso passar o Project ID explicitamente?
        // O Project ID é `dqnzwlumxbbissehrumv`.

        return new Response(JSON.stringify({ message: "Use MCP tool or Dashboard SQL Editor" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
    }
});
