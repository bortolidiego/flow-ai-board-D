/* eslint-disable */
// @ts-nocheck

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Busca usuário por email usando Admin API (paginações simples)
async function findUserByEmail(admin: any, email: string) {
  try {
    const perPage = 200;
    for (let page = 1; page <= 10; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error("listUsers error:", error);
        return null;
      }
      const found = data.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      if (found) return found;
      if (!data.users || data.users.length < perPage) break; // Última página
    }
    return null;
  } catch (err) {
    console.error("findUserByEmail failed:", err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          error: "Missing Supabase environment secrets (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { email, password, workspaceName } = await req.json();

    if (!email || !password || !workspaceName) {
      return new Response(
        JSON.stringify({ error: "email, password e workspaceName são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Provision request:", { email, workspaceName });

    // 1) Buscar usuário por email (idempotência)
    let user = await findUserByEmail(admin, email);

    if (!user) {
      console.log("User not found; creating via Admin API...");
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createErr || !created?.user) {
        console.error("createUser error:", createErr);
        return new Response(
          JSON.stringify({
            error: createErr?.message || "Falha ao criar usuário",
            hint:
              "Verifique se a Service Role Key está configurada e se o email já existe em outro projeto.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      user = created.user;
      console.log("User created:", user.id);
    } else {
      console.log("User found:", user.id);
    }

    const userId = user.id;

    // 2) Criar ou reaproveitar workspace por nome
    let workspace = null;
    {
      const { data: existingWs, error: wsSelErr } = await admin
        .from("workspaces")
        .select("id, name")
        .eq("name", workspaceName)
        .maybeSingle();

      if (wsSelErr) {
        console.error("Select workspace error:", wsSelErr);
      }

      if (existingWs) {
        workspace = existingWs;
        console.log("Workspace reused:", workspace.id);
      } else {
        console.log("Workspace not found; creating...");
        const { data: ws, error: wsErr } = await admin
          .from("workspaces")
          .insert({ name: workspaceName })
          .select("id, name")
          .single();

        if (wsErr || !ws?.id) {
          console.error("Create workspace error:", wsErr);
          return new Response(
            JSON.stringify({ error: wsErr?.message || "Falha ao criar workspace" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        workspace = ws;
        console.log("Workspace created:", workspace.id);
      }
    }

    // 3) Vincular usuário ao workspace, se ainda não estiver
    {
      const { data: existingMember, error: memberSelErr } = await admin
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspace.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (memberSelErr) {
        console.error("Select member error:", memberSelErr);
      }

      if (!existingMember) {
        const { error: memberErr } = await admin
          .from("workspace_members")
          .insert({ workspace_id: workspace.id, user_id: userId });

        if (memberErr) {
          console.error("Insert member error:", memberErr);
          return new Response(
            JSON.stringify({ error: memberErr.message || "Falha ao vincular membro" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        console.log("Member linked");
      } else {
        console.log("Member already linked");
      }
    }

    // 4) Definir role admin (upsert por user_id)
    {
      const { error: roleErr } = await admin
        .from("user_roles")
        .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id" });

      if (roleErr) {
        console.error("Upsert role error:", roleErr);
        return new Response(
          JSON.stringify({ error: roleErr.message || "Falha ao definir role admin" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("Admin role set");
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        workspace,
        message: "Usuário e workspace provisionados com sucesso (idempotente).",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in provision-user-workspace:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});