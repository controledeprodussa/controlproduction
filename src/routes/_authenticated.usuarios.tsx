import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, ShieldCheck, Building2, Loader2, Pencil } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { editarUsuario } from "@/lib/usuarios.functions";


export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({ meta: [{ title: "Usuários · Controle de Produção" }] }),
  beforeLoad: async () => {
    const { supabase: _sb } = await import("@/integrations/supabase/client");
    const { data: userData } = await _sb.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data: profile } = await _sb
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();
    if (!profile || profile.role !== "admin") throw redirect({ to: "/" });
  },
  component: UsuariosPage,
});

function UsuariosPage() {
  const { data: me, isLoading: meLoading } = useCurrentProfile();
  const qc = useQueryClient();

  const usuariosQuery = useQuery({
    queryKey: ["usuarios-list"],
    enabled: !!me && me.role === "admin",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, usuario, nome, role, company_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const companiesQuery = useQuery({
    queryKey: ["companies-list"],
    enabled: !!me && me.role === "admin",
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [companyId, setCompanyId] = useState<string>("");
  const [newCoOpen, setNewCoOpen] = useState(false);
  const [newCoNome, setNewCoNome] = useState("");

  type EditState = { id: string; usuario: string; nome: string; role: "admin" | "user"; senha: string };
  const [edit, setEdit] = useState<EditState | null>(null);
  const editarFn = useServerFn(editarUsuario);

  const updateUser = useMutation({
    mutationFn: async (e: EditState) =>
      editarFn({
        data: {
          id: e.id,
          usuario: e.usuario,
          nome: e.nome,
          role: e.role,
          senha: e.senha || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Usuário atualizado");
      setEdit(null);
      qc.invalidateQueries({ queryKey: ["usuarios-list"] });
      qc.invalidateQueries({ queryKey: ["current-profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const createCompany = useMutation({
    mutationFn: async (nome: string) => {
      const { data, error } = await supabase.from("companies").insert({ nome }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (c) => {
      toast.success("Empresa criada");
      setCompanyId(c.id);
      setNewCoOpen(false);
      setNewCoNome("");
      qc.invalidateQueries({ queryKey: ["companies-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createUser = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const { data, error } = await supabase.functions.invoke("criar-usuario", {
        body: {
          usuario,
          senha,
          role,
          company_id: companyId || me?.company_id,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (error) {
        // functions.invoke may embed body error message
        const msg = (data as { error?: string } | null)?.error ?? error.message;
        throw new Error(msg);
      }
      if (data && (data as { error?: string }).error) throw new Error((data as { error: string }).error);
      return data;
    },
    onSuccess: () => {
      toast.success("Usuário criado");
      setUsuario(""); setSenha(""); setRole("user");
      qc.invalidateQueries({ queryKey: ["usuarios-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (meLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!me || me.role !== "admin") {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <ShieldCheck className="size-10 mx-auto text-muted-foreground mb-3" />
        <h1 className="text-xl font-semibold">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground mt-2">Somente administradores podem acessar esta página.</p>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario.trim() || !senha) return toast.error("Preencha usuário e senha");
    createUser.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
        <p className="text-sm text-muted-foreground">Gerencie os acessos ao sistema.</p>
      </div>

      <Card className="p-6 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="size-4 text-primary" />
          <h2 className="font-medium">Novo usuário</h2>
        </div>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Usuário</Label>
            <Input value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="ex: joao" className="bg-secondary" />
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className="bg-secondary" />
          </div>
          <div className="space-y-2">
            <Label>Empresa</Label>
            <div className="flex gap-2">
              <Select value={companyId || me.company_id} onValueChange={setCompanyId}>
                <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {companiesQuery.data?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={() => setNewCoOpen(true)}>
                <Building2 className="size-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Papel</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "admin" | "user")}>
              <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuário</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={createUser.isPending} className="w-full md:w-auto">
              {createUser.isPending ? "Criando…" : "Criar usuário"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6 rounded-2xl">
        <h2 className="font-medium mb-4">Usuários cadastrados</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-4">Usuário</th>
                <th className="py-2 pr-4">Nome</th>
                <th className="py-2 pr-4">Papel</th>
                <th className="py-2 pr-4">Criado em</th>
                <th className="py-2 pr-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuariosQuery.data?.map((u) => (
                <tr key={u.id} className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium">{u.usuario ?? "—"}</td>
                  <td className="py-2 pr-4">{u.nome ?? "—"}</td>
                  <td className="py-2 pr-4">
                    <span className={u.role === "admin" ? "text-primary" : "text-muted-foreground"}>
                      {u.role === "admin" ? "Administrador" : "Usuário"}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">{new Date(u.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="py-2 pr-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Editar ${u.usuario ?? ""}`}
                      onClick={() =>
                        setEdit({
                          id: u.id,
                          usuario: u.usuario ?? "",
                          nome: u.nome ?? "",
                          role: (u.role as "admin" | "user") ?? "user",
                          senha: "",
                        })
                      }
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {usuariosQuery.data?.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Nenhum usuário</td></tr>
              )}

            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar usuário</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Usuário</Label>
                <Input
                  value={edit.usuario}
                  onChange={(e) => setEdit({ ...edit, usuario: e.target.value })}
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={edit.nome}
                  onChange={(e) => setEdit({ ...edit, nome: e.target.value })}
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label>Papel</Label>
                <Select value={edit.role} onValueChange={(v) => setEdit({ ...edit, role: v as "admin" | "user" })}>
                  <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nova senha (opcional)</Label>
                <Input
                  type="password"
                  value={edit.senha}
                  onChange={(e) => setEdit({ ...edit, senha: e.target.value })}
                  placeholder="Deixe em branco para manter"
                  className="bg-secondary"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button disabled={updateUser.isPending} onClick={() => edit && updateUser.mutate(edit)}>
              {updateUser.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={newCoOpen} onOpenChange={setNewCoOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova empresa</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={newCoNome} onChange={(e) => setNewCoNome(e.target.value)} className="bg-secondary" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCoOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => newCoNome.trim() && createCompany.mutate(newCoNome.trim())}
              disabled={createCompany.isPending}
            >
              {createCompany.isPending ? "Criando…" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
