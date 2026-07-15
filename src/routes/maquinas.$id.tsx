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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgressBar } from "@/components/ProgressBar";
import { STATUS_LABEL, STATUS_ORDER, statusClasses, progressColor, parseLocalDate, type MachineStatus } from "@/lib/status";
import { ArrowLeft, Calendar, User, Hash, Factory, Pencil, ChevronDown, MessageSquare, Trash2, Wrench, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/maquinas/$id")({
  head: () => ({ meta: [{ title: "Máquina · Controle de Produção" }] }),
  component: MachineDetail,
});

type Manutencao = {
  id: string;
  numero_serie: string;
  cliente: string;
  tecnico: string;
  data_visita: string;
  relatorio: string;
  link_relatorio: string | null;
  criado_em: string;
};

function MachineDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("checklist");

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

  const { data: manutencoes = [] } = useQuery({
    queryKey: ["manutencoes", machine?.numero_serie],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manutencoes")
        .select("*")
        .eq("numero_serie", machine!.numero_serie)
        .order("data_visita", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Manutencao[];
    },
    enabled: !!machine?.numero_serie,
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

  const handleDelete = async () => {
    setIsDeleting(true);
    const { error: e1 } = await supabase.from("machine_processes").delete().eq("machine_id", id);
    if (e1) { setIsDeleting(false); return toast.error(e1.message); }
    const { error } = await supabase.from("machines").delete().eq("id", id);
    setIsDeleting(false);
    if (error) return toast.error(error.message);
    toast.success("Máquina excluída");
    qc.invalidateQueries({ queryKey: ["machines"] });
    navigate({ to: "/" });
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-[color:var(--status-atrasado)] hover:text-[color:var(--status-atrasado)] hover:bg-[color:var(--status-atrasado)]/10"
                  onClick={() => setDeleting(true)}
                  aria-label="Excluir máquina"
                >
                  <Trash2 className="size-4" />
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-secondary">
          <TabsTrigger value="checklist" className="gap-1.5">
            <MessageSquare className="size-4" /> Checklist
          </TabsTrigger>
          {machine.status === "entregue" && (
            <TabsTrigger value="manutencoes" className="gap-1.5">
              <Wrench className="size-4" /> Manutenções
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="checklist">
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
        </TabsContent>

        {machine.status === "entregue" && (
          <TabsContent value="manutencoes">
            <Card className="p-6 rounded-2xl space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Manutenções</h2>
                <p className="text-sm text-muted-foreground">Histórico de visitas técnicas desta máquina.</p>
              </div>
              <div className="space-y-4">
                {manutencoes.map((m) => (
                  <MaintenanceItem key={m.id} maintenance={m} />
                ))}
                {manutencoes.length === 0 && (
                  <div className="text-sm text-muted-foreground p-6 text-center">Nenhuma manutenção registrada.</div>
                )}
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <EditMachineDialog open={editing} onOpenChange={setEditing} machine={machine} />

      <AlertDialog open={deleting} onOpenChange={(v) => !isDeleting && setDeleting(v)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir máquina?</AlertDialogTitle>
            <AlertDialogDescription>
              A máquina <strong>{machine.nome}</strong> (Nº {machine.numero_serie}) e todos os seus processos serão removidos permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-[color:var(--status-atrasado)] text-white hover:bg-[color:var(--status-atrasado)]/90"
            >
              {isDeleting ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    modelo_id: machine.modelo_id ?? "",
  });
  const [saving, setSaving] = useState(false);

  const { data: models = [] } = useQuery({
    queryKey: ["models", "visiveis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machine_models")
        .select("id, nome")
        .eq("visivel_registro", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    setForm({
      nome: machine.nome,
      numero_serie: machine.numero_serie,
      cliente: machine.cliente,
      data_entrega: machine.data_entrega,
      modelo_id: machine.modelo_id ?? "",
    });
  }, [machine, open]);

  const save = async () => {
    setSaving(true);
    try {
      const model = models.find((m: any) => m.id === form.modelo_id);
      const modeloChanged = (form.modelo_id || null) !== (machine.modelo_id || null);
      const payload = {
        nome: form.nome,
        numero_serie: form.numero_serie,
        cliente: form.cliente,
        data_entrega: form.data_entrega,
        modelo_id: form.modelo_id || null,
        modelo_nome: model?.nome ?? (modeloChanged ? null : machine.modelo_nome),
      };
      const { error } = await supabase.from("machines").update(payload).eq("id", machine.id);
      if (error) throw error;

      if (modeloChanged) {
        const { error: eDel } = await supabase.from("machine_processes").delete().eq("machine_id", machine.id);
        if (eDel) throw eDel;

        if (form.modelo_id) {
          const { data: tpls, error: eTpl } = await supabase
            .from("machine_process_templates")
            .select("nome, peso, ordem")
            .eq("model_id", form.modelo_id)
            .order("ordem");
          if (eTpl) throw eTpl;
          if (tpls && tpls.length) {
            const rows = tpls.map((t, i) => ({
              machine_id: machine.id,
              nome: t.nome,
              peso: t.peso,
              ordem: t.ordem ?? i,
            }));
            const { error: eIns } = await supabase.from("machine_processes").insert(rows);
            if (eIns) throw eIns;
          }
        }
      }

      toast.success("Máquina atualizada");
      qc.invalidateQueries({ queryKey: ["machine", machine.id] });
      qc.invalidateQueries({ queryKey: ["processes", machine.id] });
      qc.invalidateQueries({ queryKey: ["machines"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const currentModelMissing = form.modelo_id && !models.some((m: any) => m.id === form.modelo_id);

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
          <div className="space-y-2">
            <Label>Modelo</Label>
            <Select value={form.modelo_id} onValueChange={(v) => setForm({ ...form, modelo_id: v })}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Selecione um modelo" />
              </SelectTrigger>
              <SelectContent>
                {currentModelMissing && machine.modelo_nome && (
                  <SelectItem value={form.modelo_id}>{machine.modelo_nome} (oculto)</SelectItem>
                )}
                {models.length === 0 ? (
                  <div className="px-2 py-3 text-sm text-muted-foreground">Nenhum modelo disponível.</div>
                ) : (
                  models.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Ao alterar o modelo, o checklist desta máquina será substituído pelos processos do novo modelo.</p>
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

function MaintenanceItem({ maintenance }: { maintenance: Manutencao }) {
  const [expanded, setExpanded] = useState(false);
  const previewLimit = 160;
  const fullText = maintenance.relatorio ?? "";
  const hasPreview = fullText.length > previewLimit;
  const preview = hasPreview ? `${fullText.slice(0, previewLimit).trim()}…` : fullText;

  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="size-3.5" />
            <span>{format(parseLocalDate(maintenance.data_visita), "dd/MM/yyyy")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <User className="size-3.5 text-muted-foreground" />
            <span className="font-medium">{maintenance.tecnico}</span>
          </div>
        </div>
        {maintenance.link_relatorio && (
          <Button variant="outline" size="sm" asChild className="gap-1.5 w-full sm:w-auto">
            <a href={maintenance.link_relatorio} target="_blank" rel="noopener noreferrer">
              Ver relatório completo <ExternalLink className="size-3.5" />
            </a>
          </Button>
        )}
      </div>

      <div className="text-sm">
        <p className="text-muted-foreground whitespace-pre-wrap">{expanded ? fullText : preview}</p>
        {hasPreview && (
          <Button
            variant="link"
            size="sm"
            onClick={() => setExpanded((e) => !e)}
            className="p-0 h-auto mt-1 text-foreground"
          >
            {expanded ? "Mostrar menos" : "Expandir relatório"}
          </Button>
        )}
      </div>
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
