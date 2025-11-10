/* eslint-disable */
// @ts-nocheck

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase secrets (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await admin.auth.getUser(token);

    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: invalid user token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    const { workspaceName } = await req.json();

    if (!workspaceName || typeof workspaceName !== "string") {
      return new Response(
        JSON.stringify({ error: "workspaceName é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Criar ou reaproveitar workspace
    const { data: existingWs } = await admin
      .from("workspaces")
      .select("id, name")
      .eq("name", workspaceName)
      .maybeSingle();

    let workspace = existingWs;
    if (!workspace) {
      const { data: ws, error: wsErr } = await admin
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
      workspace = ws;
    }

    // Vincular usuário ao workspace se necessário
    const { data: existingMember } = await admin
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingMember) {
      const { error: memberErr } = await admin
        .from("workspace_members")
        .insert({ workspace_id: workspace.id, user_id: userId });

      if (memberErr) {
        return new Response(
          JSON.stringify({ error: memberErr.message || "Falha ao vincular membro" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Definir role admin
    const { error: roleErr } = await admin
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
        workspace,
        message: "Workspace provisionado para o usuário autenticado.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in provision-current-user-workspace:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});