import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "Sessão inválida" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(url, serviceKey);
  const { data: caller, error: callerErr } = await admin
    .from("profiles").select("role, company_id").eq("id", userData.user.id).single();
  if (callerErr || !caller || caller.role !== "admin") {
    return new Response(JSON.stringify({ error: "Apenas administradores podem criar usuários" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: { usuario?: string; senha?: string; company_id?: string; role?: string };
  try { payload = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const usuario = (payload.usuario ?? "").trim().toLowerCase();
  const senha = payload.senha ?? "";
  const company_id = payload.company_id ?? caller.company_id;
  const role = payload.role === "admin" ? "admin" : "user";

  if (!/^[a-z0-9_.-]{3,32}$/.test(usuario)) {
    return new Response(JSON.stringify({ error: "Usuário inválido (3-32 chars: letras, números, _.-)" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (senha.length < 6) {
    return new Response(JSON.stringify({ error: "Senha deve ter pelo menos 6 caracteres" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const email = `${usuario}@lufati.internal`;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email, password: senha, email_confirm: true,
    user_metadata: { usuario, role, company_id, nome: usuario },
  });
  if (createErr || !created.user) {
    return new Response(JSON.stringify({ error: createErr?.message ?? "Erro ao criar usuário" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Ensure profile matches requested company/role (trigger uses metadata, but be defensive)
  await admin.from("profiles").upsert({
    id: created.user.id, company_id, usuario, role, nome: usuario,
  }, { onConflict: "id" });

  return new Response(JSON.stringify({ ok: true, user_id: created.user.id }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
