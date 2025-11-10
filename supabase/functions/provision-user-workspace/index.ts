import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { email, password, workspaceName } = await req.json();

    if (!email || !password || !workspaceName) {
      return new Response(
        JSON.stringify({ error: "email, password e workspaceName são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Criar usuário (confirmado) via Admin API
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createErr || !created?.user) {
      return new Response(
        JSON.stringify({ error: createErr?.message || "Falha ao criar usuário" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = created.user.id;

    // Criar workspace
    const { data: ws, error: wsErr } = await supabase
      .from("workspaces")
      .insert({ name: workspaceName })
      .select("id, name")
      .single();

    if (wsErr || !ws?.id) {
      return new Response(
        JSON.stringify({ error: wsErr?.message || "Falha ao criar workspace" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vincular usuário ao workspace
    const { error: memberErr } = await supabase
      .from("workspace_members")
      .insert({ workspace_id: ws.id, user_id: userId });

    if (memberErr) {
      return new Response(
        JSON.stringify({ error: memberErr.message || "Falha ao vincular membro ao workspace" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Definir role admin
    const { error: roleErr } = await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id" });

    if (roleErr) {
      return new Response(
        JSON.stringify({ error: roleErr.message || "Falha ao definir role admin" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        workspace: ws,
        message: "Usuário e workspace criados com sucesso",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in provision-user-workspace:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});