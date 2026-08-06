import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Factory } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Entrar · Controle de Produção" }] }),
  component: AuthPage,
});

function usuarioToEmail(u: string) {
  return `${u.trim().toLowerCase()}@lufati.internal`;
}

function AuthPage() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario.trim()) return toast.error("Informe o usuário");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: usuarioToEmail(usuario),
      password,
    });
    setLoading(false);
    if (error) return toast.error("Usuário ou senha inválidos");
    toast.success("Bem-vindo!");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-3 justify-center">
          <div className="size-11 rounded-xl bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center">
            <Factory className="size-6 text-primary" />
          </div>
          <div>
            <div className="font-semibold text-lg tracking-tight">Controle de Produção</div>
            <div className="text-xs text-muted-foreground">Acesse sua conta</div>
          </div>
        </div>

        <Card className="p-6 rounded-2xl">
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label>Usuário</Label>
              <Input
                type="text"
                required
                autoComplete="username"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                onClick={(e) => e.currentTarget.focus()}
                className="bg-secondary border-border h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onClick={(e) => e.currentTarget.focus()}
                className="bg-secondary border-border h-11"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11">
              {loading ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
