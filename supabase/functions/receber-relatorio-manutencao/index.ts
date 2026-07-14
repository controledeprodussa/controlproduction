import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ sucesso: false, erro: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const expectedSecret = Deno.env.get("N8N_WEBHOOK_SECRET");
  const providedSecret = req.headers.get("x-webhook-secret");

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return new Response(JSON.stringify({ sucesso: false, erro: "Não autorizado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ sucesso: false, erro: "JSON inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { numero_serie, cliente, tecnico, data_visita, relatorio, link_relatorio, relatorio_id } =
    payload as Record<string, string | undefined>;

  if (!numero_serie || !cliente || !tecnico || !data_visita || !relatorio || !relatorio_id) {
    return new Response(
      JSON.stringify({ sucesso: false, erro: "Campos obrigatórios ausentes" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await supabase
    .from("manutencoes")
    .upsert(
      {
        relatorio_id,
        numero_serie,
        cliente,
        tecnico,
        data_visita,
        relatorio,
        link_relatorio: link_relatorio ?? null,
      },
      { onConflict: "relatorio_id" },
    )
    .select()
    .single();

  if (error) {
    console.error("Erro ao inserir manutenção:", error);
    return new Response(
      JSON.stringify({ sucesso: false, erro: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ sucesso: true, manutencao: data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
