import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, statusClasses, progressColor, type MachineStatus } from "@/lib/status";
import { Factory, Calendar, User, Hash, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard · Controle de Produção" }] }),
  component: Dashboard,
});

type Machine = {
  id: string;
  nome: string;
  numero_serie: string;
  cliente: string;
  data_entrega: string;
  modelo_nome: string | null;
  status: MachineStatus;
  progresso: number;
};

function isAtrasado(m: Machine) {
  return m.status !== "entregue" && new Date(m.data_entrega) < new Date(new Date().toDateString());
}

function Dashboard() {
  const { data: machines = [], isLoading } = useQuery({
    queryKey: ["machines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machines")
        .select("*")
        .order("data_entrega", { ascending: true });
      if (error) throw error;
      return data as Machine[];
    },
  });

  const emProducao = machines.filter((m) => m.status === "producao").length;
  const entregues = machines.filter((m) => m.status === "entregue").length;
  const atrasadas = machines.filter(isAtrasado).length;
  const media = machines.length
    ? Math.round(machines.reduce((s, m) => s + Number(m.progresso), 0) / machines.length)
    : 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Visão geral</h1>
        <p className="text-muted-foreground mt-1">Produção em tempo real</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Em Produção" value={emProducao} />
        <StatCard label="Entregues" value={entregues} />
        <StatCard label="Atrasadas" value={atrasadas} accent={atrasadas > 0 ? "danger" : undefined} />
        <StatCard label="Produção Média" value={`${media}%`} />
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Máquinas</h2>
        {isLoading ? (
          <div className="text-muted-foreground">Carregando…</div>
        ) : machines.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            Nenhuma máquina cadastrada ainda. Vá em <span className="text-foreground font-medium">Criar</span> para começar.
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {machines.map((m) => {
              const atrasado = isAtrasado(m);
              const progresso = Math.round(Number(m.progresso));
              return (
                <Link key={m.id} to="/maquinas/$id" params={{ id: m.id }}>
                  <Card
                    className={`p-5 rounded-2xl bg-card hover:bg-accent/40 transition-all hover:-translate-y-0.5 hover:shadow-xl border ${
                      atrasado ? "border-[color:var(--status-atrasado)]/40" : "border-border"
                    } cursor-pointer h-full flex flex-col gap-4`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                          <Factory className="size-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{m.nome}</div>
                          <div className="text-xs text-muted-foreground truncate">{m.modelo_nome ?? "—"}</div>
                        </div>
                      </div>
                      <Badge className={statusClasses(m.status)}>{STATUS_LABEL[m.status]}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <Info icon={Hash} label="Série" value={m.numero_serie} />
                      <Info icon={User} label="Cliente" value={m.cliente} />
                      <Info
                        icon={Calendar}
                        label="Entrega"
                        value={format(new Date(m.data_entrega), "dd/MM/yyyy")}
                        valueClass={atrasado ? "text-[color:var(--status-atrasado)]" : ""}
                      />
                      <Info icon={AlertTriangle} label={atrasado ? "Atrasada" : "No prazo"} value="" valueClass={atrasado ? "text-[color:var(--status-atrasado)]" : "text-muted-foreground"} />
                    </div>

                    <div className="space-y-1.5 mt-auto">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-semibold">{progresso}%</span>
                      </div>
                      <Progress
                        value={progresso}
                        className="h-2 bg-secondary"
                        indicatorClassName={progressColor(progresso, atrasado)}
                      />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: "danger" }) {
  return (
    <Card className="p-5 rounded-2xl border border-border bg-card">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 text-3xl font-bold ${accent === "danger" ? "text-[color:var(--status-atrasado)]" : ""}`}>
        {value}
      </div>
    </Card>
  );
}

function Info({ icon: Icon, label, value, valueClass = "" }: { icon: any; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon className="size-3.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        {value && <div className={`truncate ${valueClass}`}>{value}</div>}
      </div>
    </div>
  );
}
