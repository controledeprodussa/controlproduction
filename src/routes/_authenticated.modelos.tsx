import { createFileRoute } from "@tanstack/react-router";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Pencil, GripVertical, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type GrupoEdit, flatToGrupos, gruposToFlat, DEFAULT_PROCESSOS } from "@/lib/checklist";

export const Route = createFileRoute("/_authenticated/modelos")({
  head: () => ({ meta: [{ title: "Modelos · Controle de Produção" }] }),
  component: ModelosPage,
});

function ModelosPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Modelos</h1>
        <p className="text-muted-foreground mt-1">Cadastre, edite e defina quais modelos aparecem no registro de máquinas</p>
      </header>
      <ModeloForm />
      <ModelosList />
    </div>
  );
}

// ─── Editor de Processos Agrupado ────────────────────────────────────────────

function ProcessosEditorAgrupado({
  grupos,
  setGrupos,
}: {
  grupos: GrupoEdit[];
  setGrupos: (g: GrupoEdit[]) => void;
}) {
  const total = grupos.reduce(
    (s, g) => s + g.subitems.reduce((ss, si) => ss + Number(si.peso || 0), 0),
    0
  );

  const updateSubitem = (gi: number, si: number, field: keyof GrupoEdit["subitems"][number], value: string | number) => {
    setGrupos(
      grupos.map((g, i) =>
        i !== gi
          ? g
          : { ...g, subitems: g.subitems.map((s, j) => (j !== si ? s : { ...s, [field]: value })) }
      )
    );
  };

  const removeSubitem = (gi: number, si: number) => {
    const next = grupos
      .map((g, i) => (i !== gi ? g : { ...g, subitems: g.subitems.filter((_, j) => j !== si) }))
      .filter((g) => g.subitems.length > 0);
    setGrupos(next);
  };

  const removeGroup = (gi: number) => setGrupos(grupos.filter((_, i) => i !== gi));

  const addSubitemToGroup = (gi: number) =>
    setGrupos(
      grupos.map((g, i) => (i !== gi ? g : { ...g, subitems: [...g.subitems, { nome: "", peso: 0 }] }))
    );

  const updateSingleName = (gi: number, nome: string) =>
    setGrupos(grupos.map((g, i) => (i !== gi ? g : { ...g, grupNome: nome, subitems: [{ ...g.subitems[0], nome }] })));

  const updateGroupName = (gi: number, nome: string) =>
    setGrupos(grupos.map((g, i) => (i !== gi ? g : { ...g, grupNome: nome })));

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label>Processos (checklist)</Label>
        <div className={`text-sm font-medium tabular-nums ${total === 100 ? "text-[color:var(--status-producao)]" : "text-[color:var(--status-atrasado)]"}`}>
          Total: {total}%
        </div>
      </div>

      {/* Grupos */}
      <div className="space-y-2">
        {grupos.map((g, gi) =>
          g.isSingle ? (
            /* Item simples */
            <div key={gi} className="flex gap-2 items-center">
              <Input
                value={g.subitems[0]?.nome ?? ""}
                onChange={(e) => updateSingleName(gi, e.target.value)}
                placeholder="Nome do processo"
                className="bg-secondary border-border flex-1"
              />
              <Input
                type="number"
                min={0}
                max={100}
                value={g.subitems[0]?.peso ?? 0}
                onChange={(e) => updateSubitem(gi, 0, "peso", Number(e.target.value))}
                placeholder="%"
                className="bg-secondary border-border w-20"
              />
              <Button variant="ghost" size="icon" onClick={() => removeGroup(gi)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ) : (
            /* Grupo com subitens */
            <div key={gi} className="rounded-xl border border-border overflow-hidden">
              {/* Cabeçalho do grupo */}
              <div className="flex items-center gap-2 px-3 py-2 bg-secondary/60 border-b border-border">
                <Input
                  value={g.grupNome}
                  onChange={(e) => updateGroupName(gi, e.target.value)}
                  placeholder="Nome do grupo"
                  className="bg-transparent border-none shadow-none flex-1 h-7 p-0 text-sm font-semibold focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <div className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {g.subitems.reduce((s, si) => s + Number(si.peso || 0), 0)}%
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs h-7 px-2"
                  onClick={() => addSubitemToGroup(gi)}
                >
                  <Plus className="size-3" /> Subitem
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => removeGroup(gi)}
                >
                  <Trash2 className="size-3.5 text-[color:var(--status-atrasado)]" />
                </Button>
              </div>
              {/* Subitens */}
              <div className="divide-y divide-border">
                {g.subitems.map((s, si) => (
                  <div key={si} className="flex gap-2 items-center px-3 py-2 bg-secondary/20">
                    <span className="text-xs text-muted-foreground shrink-0 select-none">↳</span>
                    <Input
                      value={s.nome}
                      onChange={(e) => updateSubitem(gi, si, "nome", e.target.value)}
                      placeholder="Nome do subitem"
                      className="bg-secondary border-border flex-1 h-8 text-sm"
                    />
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={s.peso}
                      onChange={(e) => updateSubitem(gi, si, "peso", Number(e.target.value))}
                      placeholder="%"
                      className="bg-secondary border-border w-20 h-8 text-sm"
                    />
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => removeSubitem(gi, si)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>

      {/* Botões de ação */}
      <div className="flex gap-2 flex-wrap pt-1">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() =>
            setGrupos([...grupos, { grupNome: "", isSingle: true, subitems: [{ nome: "", peso: 0 }] }])
          }
        >
          <Plus className="size-3.5" /> Item simples
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() =>
            setGrupos([...grupos, { grupNome: "Novo Grupo", isSingle: false, subitems: [{ nome: "", peso: 0 }] }])
          }
        >
          <Plus className="size-3.5" /> Grupo com subitens
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground ml-auto"
          onClick={() => setGrupos(flatToGrupos(DEFAULT_PROCESSOS))}
          title="Restaurar os 15 processos padrão Lufati"
        >
          <RotateCcw className="size-3.5" /> Restaurar padrão
        </Button>
      </div>
    </div>
  );
}

// ─── Formulário de Novo Modelo ─────────────────────────────────────────────

function ModeloForm() {
  const qc = useQueryClient();
  const companyId = useCompanyId();
  const [nome, setNome] = useState("");
  const [grupos, setGrupos] = useState<GrupoEdit[]>(flatToGrupos(DEFAULT_PROCESSOS));
  const [saving, setSaving] = useState(false);

  const total = grupos.reduce((s, g) => s + g.subitems.reduce((ss, si) => ss + Number(si.peso || 0), 0), 0);

  const submit = async () => {
    if (!nome.trim()) return toast.error("Informe o nome do modelo");
    const processos = gruposToFlat(grupos);
    if (processos.some((p) => !p.nome.trim())) return toast.error("Preencha o nome de todos os processos");
    if (total !== 100) return toast.error(`O total dos pesos deve ser 100% (atual: ${total}%)`);

    setSaving(true);
    try {
      if (!companyId) throw new Error("Empresa do usuário não encontrada");
      const { data: maxRow } = await supabase.from("machine_models").select("ordem").order("ordem", { ascending: false }).limit(1).maybeSingle();
      const nextOrdem = (maxRow?.ordem ?? -1) + 1;
      const { data: model, error } = await supabase.from("machine_models").insert({ nome, company_id: companyId, ordem: nextOrdem }).select().single();
      if (error) throw error;
      const rows = processos.map((p, i) => ({ model_id: model.id, nome: p.nome, peso: p.peso, ordem: i }));
      const { error: e2 } = await supabase.from("machine_process_templates").insert(rows);
      if (e2) throw e2;
      toast.success("Modelo criado!");
      setNome("");
      setGrupos(flatToGrupos(DEFAULT_PROCESSOS));
      qc.invalidateQueries({ queryKey: ["models"] });
      qc.invalidateQueries({ queryKey: ["models-full"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6 rounded-2xl space-y-6">
      <h2 className="text-lg font-semibold">Novo modelo</h2>
      <div className="space-y-2">
        <Label>Nome do Modelo</Label>
        <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Prensa Hidráulica" className="bg-secondary border-border h-11" />
      </div>
      <ProcessosEditorAgrupado grupos={grupos} setGrupos={setGrupos} />
      <Button onClick={submit} disabled={saving} className="w-full h-11">
        {saving ? "Salvando…" : "Salvar Modelo"}
      </Button>
    </Card>
  );
}

// ─── Lista de Modelos ──────────────────────────────────────────────────────

function ModelosList() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [deleting, setDeleting] = useState<any | null>(null);

  const { data: models = [] } = useQuery({
    queryKey: ["models-full"],
    queryFn: async () => {
      const { data: ms, error } = await supabase.from("machine_models").select("id, nome, created_at, visivel_registro, ordem").order("ordem", { ascending: true }).order("created_at", { ascending: true });
      if (error) throw error;
      const { data: tpls } = await supabase.from("machine_process_templates").select("*").order("ordem");
      return (ms ?? []).map((m) => ({ ...m, processos: (tpls ?? []).filter((t) => t.model_id === m.id) }));
    },
  });

  const toggleVisivel = async (m: any, value: boolean) => {
    const { error } = await supabase.from("machine_models").update({ visivel_registro: value }).eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success(value ? "Modelo visível no registro" : "Modelo oculto no registro");
    qc.invalidateQueries({ queryKey: ["models"] });
    qc.invalidateQueries({ queryKey: ["models-full"] });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = models.findIndex((m: any) => m.id === active.id);
    const newIndex = models.findIndex((m: any) => m.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(models as any[], oldIndex, newIndex);
    qc.setQueryData(["models-full"], reordered.map((m, i) => ({ ...m, ordem: i })));
    try {
      await Promise.all(reordered.map((m: any, i: number) => supabase.from("machine_models").update({ ordem: i }).eq("id", m.id)));
      qc.invalidateQueries({ queryKey: ["models"] });
      qc.invalidateQueries({ queryKey: ["models-full"] });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao reordenar");
      qc.invalidateQueries({ queryKey: ["models-full"] });
    }
  };

  const remove = async () => {
    if (!deleting) return;
    const { error: e1 } = await supabase.from("machine_process_templates").delete().eq("model_id", deleting.id);
    if (e1) return toast.error(e1.message);
    const { error } = await supabase.from("machine_models").delete().eq("id", deleting.id);
    if (error) return toast.error(error.message);
    toast.success("Modelo excluído");
    setDeleting(null);
    qc.invalidateQueries({ queryKey: ["models"] });
    qc.invalidateQueries({ queryKey: ["models-full"] });
  };

  return (
    <Card className="p-6 rounded-2xl space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Modelos cadastrados</h2>
        <p className="text-xs text-muted-foreground mt-1">Use o interruptor para definir se o modelo aparece no registro. Arraste pelo ícone <GripVertical className="inline size-3 -mt-0.5" /> para reordenar como eles aparecem no seletor.</p>
      </div>
      {models.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nenhum modelo cadastrado ainda.</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={models.map((m: any) => m.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {models.map((m: any) => (
                <SortableModelRow
                  key={m.id}
                  model={m}
                  onToggleVisivel={(v) => toggleVisivel(m, v)}
                  onEdit={() => setEditing(m)}
                  onDelete={() => setDeleting(m)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {editing && <EditModelDialog model={editing} onClose={() => setEditing(null)} />}

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              O modelo <strong>{deleting?.nome}</strong> será removido. Máquinas já registradas não serão afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ─── Linha Sortable ────────────────────────────────────────────────────────

function SortableModelRow({
  model: m,
  onToggleVisivel,
  onEdit,
  onDelete,
}: {
  model: any;
  onToggleVisivel: (v: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: m.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : "auto" as const,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between gap-3 p-4 rounded-xl border border-border bg-secondary/40"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Arrastar para reordenar"
        className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 -ml-1"
      >
        <GripVertical className="size-5" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{m.nome}</div>
        <div className="text-xs text-muted-foreground truncate">
          {m.processos.length} processo{m.processos.length === 1 ? "" : "s"} · {m.processos.map((p: any) => p.nome).join(", ") || "—"}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Switch checked={!!m.visivel_registro} onCheckedChange={onToggleVisivel} aria-label="Visível no registro" />
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {m.visivel_registro ? "Visível" : "Oculto"}
          </span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Editar modelo">
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Excluir modelo">
            <Trash2 className="size-4 text-[color:var(--status-atrasado)]" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Dialog de Edição ─────────────────────────────────────────────────────

function EditModelDialog({ model, onClose }: { model: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [nome, setNome] = useState(model.nome);
  const [grupos, setGrupos] = useState<GrupoEdit[]>(
    flatToGrupos(model.processos.map((p: any) => ({ nome: p.nome, peso: Number(p.peso) })))
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNome(model.nome);
    setGrupos(flatToGrupos(model.processos.map((p: any) => ({ nome: p.nome, peso: Number(p.peso) }))));
  }, [model]);

  const total = grupos.reduce((s, g) => s + g.subitems.reduce((ss, si) => ss + Number(si.peso || 0), 0), 0);

  const save = async () => {
    if (!nome.trim()) return toast.error("Informe o nome");
    const processos = gruposToFlat(grupos);
    if (processos.some((p) => !p.nome.trim())) return toast.error("Preencha o nome de todos os processos");
    if (total !== 100) return toast.error(`Total deve ser 100% (atual: ${total}%)`);

    setSaving(true);
    try {
      const { error: e0 } = await supabase.from("machine_models").update({ nome }).eq("id", model.id);
      if (e0) throw e0;
      const { error: e1 } = await supabase.from("machine_process_templates").delete().eq("model_id", model.id);
      if (e1) throw e1;
      const rows = processos.map((p, i) => ({ model_id: model.id, nome: p.nome, peso: p.peso, ordem: i }));
      const { error: e2 } = await supabase.from("machine_process_templates").insert(rows);
      if (e2) throw e2;
      toast.success("Modelo atualizado");
      qc.invalidateQueries({ queryKey: ["models"] });
      qc.invalidateQueries({ queryKey: ["models-full"] });
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar modelo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <ProcessosEditorAgrupado grupos={grupos} setGrupos={setGrupos} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
