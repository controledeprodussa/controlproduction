import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProgressBar } from "@/components/ProgressBar";
import { STATUS_LABEL, STATUS_ORDER, statusClasses, progressColor, type MachineStatus } from "@/lib/status";
import { ArrowLeft, Calendar, User, Hash, Factory } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/maquinas/$id")({
  head: () => ({ meta: [{ title: "Máquina · Controle de Produção" }] }),
  component: MachineDetail,
});

function MachineDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: machine } = useQuery({
    queryKey: ["machine", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("machines").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: processes = [] } = useQuery({
    queryKey: ["processes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machine_processes")
        .select("*")
        .eq("machine_id", id)
        .order("ordem");
      if (error) throw error;
      return data;
    },
  });

  const toggle = async (procId: string, done: boolean) => {
    const { error } = await supabase
      .from("machine_processes")
      .update({ concluido: done, concluido_em: done ? new Date().toISOString() : null })
      .eq("id", procId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["processes", id] });
    qc.invalidateQueries({ queryKey: ["machine", id] });
    qc.invalidateQueries({ queryKey: ["machines"] });
  };

  const updateStatus = async (status: MachineStatus) => {
    const { error } = await supabase.from("machines").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    qc.invalidateQueries({ queryKey: ["machine", id] });
    qc.invalidateQueries({ queryKey: ["machines"] });
  };

  if (!machine) return <div className="text-muted-foreground">Carregando…</div>;

  const atrasado = machine.status !== "entregue" && new Date(machine.data_entrega) < new Date(new Date().toDateString());
  const progresso = Math.round(Number(machine.progresso));

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Voltar
      </Link>

      <Card className="p-6 rounded-2xl space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-2xl bg-secondary flex items-center justify-center">
              <Factory className="size-7 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{machine.nome}</h1>
              <p className="text-sm text-muted-foreground">{machine.modelo_nome ?? "—"}</p>
            </div>
          </div>
          <Badge className={`${statusClasses(machine.status as MachineStatus)} text-sm px-3 py-1`}>
            {STATUS_LABEL[machine.status as MachineStatus]}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <InfoBlock icon={Hash} label="Série" value={machine.numero_serie} />
          <InfoBlock icon={User} label="Cliente" value={machine.cliente} />
          <InfoBlock
            icon={Calendar}
            label="Entrega"
            value={format(new Date(machine.data_entrega), "dd/MM/yyyy")}
            valueClass={atrasado ? "text-[color:var(--status-atrasado)]" : ""}
          />
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Status</div>
            <Select value={machine.status} onValueChange={(v) => updateStatus(v as MachineStatus)}>
              <SelectTrigger className="bg-secondary border-border h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso da produção</span>
            <span className="font-semibold">{progresso}%</span>
          </div>
          <ProgressBar value={progresso} className="h-3" indicatorClassName={progressColor(progresso, atrasado)} />
        </div>
      </Card>

      <Card className="p-6 rounded-2xl space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Checklist de Produção</h2>
          <p className="text-sm text-muted-foreground">Marque os processos concluídos — o progresso atualiza automaticamente.</p>
        </div>
        <div className="space-y-2">
          {processes.map((p) => (
            <label
              key={p.id}
              className={`flex items-center gap-4 p-4 rounded-xl border border-border bg-secondary/40 hover:bg-secondary transition-colors cursor-pointer ${
                p.concluido ? "opacity-70" : ""
              }`}
            >
              <Checkbox checked={p.concluido} onCheckedChange={(v) => toggle(p.id, !!v)} />
              <div className="flex-1 min-w-0">
                <div className={`font-medium ${p.concluido ? "line-through text-muted-foreground" : ""}`}>{p.nome}</div>
                {p.concluido && p.concluido_em && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Concluído em {format(new Date(p.concluido_em), "dd/MM/yyyy HH:mm")}
                  </div>
                )}
              </div>
              <div className="text-sm font-semibold text-muted-foreground tabular-nums">{Number(p.peso)}%</div>
            </label>
          ))}
          {processes.length === 0 && (
            <div className="text-sm text-muted-foreground p-6 text-center">Sem processos cadastrados.</div>
          )}
        </div>
      </Card>
    </div>
  );
}

function InfoBlock({ icon: Icon, label, value, valueClass = "" }: { icon: any; label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className={`font-medium ${valueClass}`}>{value}</div>
    </div>
  );
}
