import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ProgressBar";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, statusClasses, progressColor, parseLocalDate, type MachineStatus } from "@/lib/status";
import { Factory, Calendar, User, Hash, AlertTriangle, CheckCircle2 } from "lucide-react";
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return m.status !== "entregue" && parseLocalDate(m.data_entrega) < today;
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

  const ativas = machines.filter((m) => m.status !== "entregue");
  const count = (s: MachineStatus) => machines.filter((m) => m.status === s).length;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Visão geral</h1>
        <p className="text-muted-foreground mt-1">Produção em tempo real</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Engenharia" value={count("engenharia")} status="engenharia" />
        <StatCard label="Compras" value={count("compras")} status="compras" />
        <StatCard label="Produção" value={count("producao")} status="producao" />
        <StatCard label="Embarque" value={count("embarque")} status="embarque" />
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Máquinas em andamento</h2>
        {isLoading ? (
          <div className="text-muted-foreground">Carregando…</div>
        ) : ativas.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            Nenhuma máquina em andamento. Vá em <span className="text-foreground font-medium">Criar</span> para começar.
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ativas.map((m) => {
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
                        <div className="size-11 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                          <Factory className="size-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-lg leading-tight truncate">{m.nome}</div>
                          <div className="text-sm text-muted-foreground truncate mt-0.5">{m.modelo_nome ?? "—"}</div>
                        </div>
                      </div>
                      <Badge className={statusClasses(m.status)}>{STATUS_LABEL[m.status]}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Info icon={Hash} label="Série" value={m.numero_serie} />
                      <Info icon={User} label="Cliente" value={m.cliente} />
                      <Info
                        icon={Calendar}
                        label="Entrega"
                        value={format(new Date(m.data_entrega), "dd/MM/yyyy")}
                        valueClass={atrasado ? "text-[color:var(--status-atrasado)]" : ""}
                      />
                      <Info
                        icon={AlertTriangle}
                        label="Prazo"
                        value={atrasado ? "Atrasada" : "No prazo"}
                        valueClass={`font-semibold ${atrasado ? "text-[color:var(--status-atrasado)]" : "text-[color:var(--status-producao)]"}`}
                      />
                    </div>

                    <div className="space-y-1.5 mt-auto">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-semibold">{progresso}%</span>
                      </div>
                      <ProgressBar value={progresso} indicatorClassName={progressColor(progresso, atrasado)} />
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

function StatCard({ label, value, status }: { label: string; value: string | number; status?: MachineStatus }) {
  return (
    <Card className="p-5 rounded-2xl border border-border bg-card">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className="mt-2 text-3xl font-bold"
        style={status ? { color: `var(--status-${status})` } : undefined}
      >
        {value}
      </div>
    </Card>
  );
}

function Info({ icon: Icon, label, value, valueClass = "" }: { icon: any; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <Icon className="size-3.5 text-muted-foreground shrink-0 mt-1" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium">{label}</div>
        {value && <div className={`text-sm font-medium truncate mt-0.5 ${valueClass}`}>{value}</div>}
      </div>
    </div>
  );
}
