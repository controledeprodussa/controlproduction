import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProgressBar } from "@/components/ProgressBar";
import { STATUS_LABEL, STATUS_ORDER, statusClasses, progressColor, parseLocalDate, type MachineStatus } from "@/lib/status";
import { ArrowLeft, Calendar, User, Hash, Factory, Pencil, ChevronDown, MessageSquare, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/maquinas/$id")({
  head: () => ({ meta: [{ title: "Máquina · Controle de Produção" }] }),
  component: MachineDetail,
});

function MachineDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

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

  const today = new Date(); today.setHours(0,0,0,0);
  const atrasado = machine.status !== "entregue" && parseLocalDate(machine.data_entrega) < today;
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
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{machine.nome}</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setEditing(true)}
                  aria-label="Editar máquina"
                >
                  <Pencil className="size-4" />
                </Button>
              </div>
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
            value={format(parseLocalDate(machine.data_entrega), "dd/MM/yyyy")}
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
          {processes.map((p: any) => (
            <ProcessItem key={p.id} proc={p} onToggle={toggle} machineId={id} />
          ))}
          {processes.length === 0 && (
            <div className="text-sm text-muted-foreground p-6 text-center">Sem processos cadastrados.</div>
          )}
        </div>
      </Card>

      <EditMachineDialog open={editing} onOpenChange={setEditing} machine={machine} />
    </div>
  );
}

function ProcessItem({ proc, onToggle, machineId }: { proc: any; onToggle: (id: string, done: boolean) => void; machineId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [obs, setObs] = useState(proc.observacao ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setObs(proc.observacao ?? ""); }, [proc.observacao]);

  const saveObs = async () => {
    setSaving(true);
    const { error } = await supabase.from("machine_processes").update({ observacao: obs || null }).eq("id", proc.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Observação salva");
    qc.invalidateQueries({ queryKey: ["processes", machineId] });
  };

  const hasObs = !!(proc.observacao && proc.observacao.trim());

  return (
    <div className={`rounded-xl border border-border bg-secondary/40 ${proc.concluido ? "opacity-80" : ""}`}>
      <div className="flex items-center gap-4 p-4">
        <Checkbox checked={proc.concluido} onCheckedChange={(v) => onToggle(proc.id, !!v)} />
        <div className="flex-1 min-w-0">
          <div className={`font-medium ${proc.concluido ? "line-through text-muted-foreground" : ""}`}>{proc.nome}</div>
          {proc.concluido && proc.concluido_em && (
            <div className="text-xs text-muted-foreground mt-0.5">
              Concluído em {format(new Date(proc.concluido_em), "dd/MM/yyyy HH:mm")}
            </div>
          )}
        </div>
        <div className="text-sm font-semibold text-muted-foreground tabular-nums">{Number(proc.peso)}%</div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen((o) => !o)}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <MessageSquare className={`size-3.5 ${hasObs ? "text-[color:var(--status-engenharia)]" : ""}`} />
          Obs
          <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </Button>
      </div>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          <Textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Adicione observações sobre este processo…"
            className="bg-background border-border min-h-[80px]"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={saveObs} disabled={saving}>
              {saving ? "Salvando…" : "Salvar observação"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EditMachineDialog({ open, onOpenChange, machine }: { open: boolean; onOpenChange: (v: boolean) => void; machine: any }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: machine.nome,
    numero_serie: machine.numero_serie,
    cliente: machine.cliente,
    data_entrega: machine.data_entrega,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      nome: machine.nome,
      numero_serie: machine.numero_serie,
      cliente: machine.cliente,
      data_entrega: machine.data_entrega,
    });
  }, [machine, open]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("machines").update(form).eq("id", machine.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Máquina atualizada");
    qc.invalidateQueries({ queryKey: ["machine", machine.id] });
    qc.invalidateQueries({ queryKey: ["machines"] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar máquina</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Número de Série</Label>
            <Input value={form.numero_serie} onChange={(e) => setForm({ ...form, numero_serie: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Input value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Data de Entrega</Label>
            <Input type="date" value={form.data_entrega} onChange={(e) => setForm({ ...form, data_entrega: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
