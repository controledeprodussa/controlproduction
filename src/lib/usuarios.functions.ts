import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type EditInput = {
  id: string;
  nome?: string;
  usuario?: string;
  role?: "admin" | "user";
  senha?: string;
};

export const editarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: EditInput) => {
    if (!data?.id) throw new Error("Usuário inválido");
    if (data.usuario && !/^[a-z0-9_.-]{3,32}$/.test(data.usuario.trim().toLowerCase())) {
      throw new Error("Usuário inválido (3-32 caracteres: letras, números, _.-)");
    }
    if (data.senha && data.senha.length < 6) {
      throw new Error("Senha deve ter pelo menos 6 caracteres");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    // Só administradores da mesma empresa podem editar
    const { data: me, error: meErr } = await context.supabase
      .from("profiles")
      .select("role, company_id")
      .eq("id", context.userId)
      .single();
    if (meErr || !me || me.role !== "admin") {
      throw new Error("Apenas administradores podem editar usuários");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target, error: targetErr } = await supabaseAdmin
      .from("profiles")
      .select("id, company_id, usuario")
      .eq("id", data.id)
      .single();
    if (targetErr || !target) throw new Error("Usuário não encontrado");
    if (target.company_id !== me.company_id) throw new Error("Usuário de outra empresa");

    const usuario = data.usuario?.trim().toLowerCase();

    if (usuario && usuario !== target.usuario) {
      const { data: dup } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("usuario", usuario)
        .neq("id", data.id)
        .maybeSingle();
      if (dup) throw new Error("Já existe um usuário com esse nome de acesso");
    }

    // Atualiza credenciais no Auth quando necessário
    const authUpdate: { email?: string; password?: string; user_metadata?: Record<string, unknown> } = {};
    if (usuario && usuario !== target.usuario) {
      authUpdate.email = `${usuario}@lufati.internal`;
      authUpdate.user_metadata = { usuario, role: data.role, nome: data.nome ?? usuario };
    }
    if (data.senha) authUpdate.password = data.senha;
    if (Object.keys(authUpdate).length > 0) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, authUpdate);
      if (error) throw new Error(error.message);
    }

    const profileUpdate: { nome?: string | null; usuario?: string; role?: string } = {};
    if (data.nome !== undefined) profileUpdate.nome = data.nome.trim() || null;
    if (usuario) profileUpdate.usuario = usuario;
    if (data.role) profileUpdate.role = data.role;

    if (Object.keys(profileUpdate).length > 0) {
      const { error } = await supabaseAdmin.from("profiles").update(profileUpdate).eq("id", data.id);
      if (error) throw new Error(error.message);
    }

    return { ok: true };
  });
