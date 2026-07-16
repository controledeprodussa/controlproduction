import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCompanyId } from "@/hooks/useCompanyId";

export const Route = createFileRoute("/_authenticated/criar")({
  head: () => ({ meta: [{ title: "Registrar Máquina · Controle de Produção" }] }),
  component: CriarPage,
});

type Processo = { nome: string; peso: number };

function CriarPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Registrar Máquina</h1>
        <p className="text-muted-foreground mt-1">Registre uma nova máquina a partir de um modelo</p>
      </header>
      <MaquinaForm />
    </div>
  );
}

function ProcessosEditor({ processos, setProcessos }: { processos: Processo[]; setProcessos: (p: Processo[]) => void }) {
  const total = processos.reduce((s, p) => s + Number(p.peso || 0), 0);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Processos (checklist)</Label>
        <div className={`text-sm font-medium ${total === 100 ? "text-[color:var(--status-producao)]" : "text-[color:var(--status-atrasado)]"}`}>
          Total: {total}%
        </div>
      </div>
      <div className="space-y-2">
        {processos.map((p, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={p.nome}
              onChange={(e) => setProcessos(processos.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))}
              placeholder="Nome do processo"
              className="bg-secondary border-border flex-1"
            />
            <Input
              type="number"
              value={p.peso}
              onChange={(e) => setProcessos(processos.map((x, j) => (j === i ? { ...x, peso: Number(e.target.value) } : x)))}
              placeholder="%"
              className="bg-secondary border-border w-24"
            />
            <Button variant="ghost" size="icon" onClick={() => setProcessos(processos.filter((_, j) => j !== i))}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button variant="outline" onClick={() => setProcessos([...processos, { nome: "", peso: 0 }])} className="gap-2">
        <Plus className="size-4" /> Adicionar processo
      </Button>
    </div>
  );
}

function MaquinaForm() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const companyId = useCompanyId();
  const [form, setForm] = useState({ nome: "", numero_serie: "", cliente: "", data_entrega: "", modelo_id: "" });
  const [processos, setProcessos] = useState<Processo[]>([]);
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

  const total = processos.reduce((s, p) => s + Number(p.peso || 0), 0);

  const onModeloChange = async (modelo_id: string) => {
    setForm((f) => ({ ...f, modelo_id }));
    const { data: tpls, error } = await supabase
      .from("machine_process_templates")
      .select("nome, peso, ordem")
      .eq("model_id", modelo_id)
      .order("ordem");
    if (error) {
      toast.error(error.message);
      return;
    }
    setProcessos((tpls ?? []).map((t) => ({ nome: t.nome, peso: Number(t.peso) })));
  };

  const submit = async () => {
    if (!form.nome || !form.numero_serie || !form.cliente || !form.data_entrega || !form.modelo_id) {
      return toast.error("Preencha todos os campos");
    }
    if (processos.some((p) => !p.nome.trim())) return toast.error("Preencha o nome de todos os processos");
    if (total !== 100) return toast.error(`O total dos pesos deve ser 100% (atual: ${total}%)`);

    setSaving(true);
    try {
      const model = models.find((m: any) => m.id === form.modelo_id);

      if (!companyId) throw new Error("Empresa do usuário não encontrada");
      const { data: machine, error } = await supabase
        .from("machines")
        .insert({
          nome: form.nome,
          numero_serie: form.numero_serie,
          cliente: form.cliente,
          data_entrega: form.data_entrega,
          modelo_id: form.modelo_id,
          modelo_nome: model?.nome ?? null,
          status: "engenharia",
          company_id: companyId,
        })
        .select()
        .single();
      if (error) throw error;

      if (processos.length) {
        const rows = processos.map((p, i) => ({ machine_id: machine.id, nome: p.nome, peso: p.peso, ordem: i }));
        const { error: e2 } = await supabase.from("machine_processes").insert(rows);
        if (e2) throw e2;
      }

      toast.success("Máquina registrada!");
      qc.invalidateQueries({ queryKey: ["machines"] });
      navigate({ to: "/maquinas/$id", params: { id: machine.id } });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6 rounded-2xl space-y-5">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nome da Máquina</Label>
          <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: CNC 500" className="bg-secondary border-border h-11" />
        </div>
        <div className="space-y-2">
          <Label>Número de Série</Label>
          <Input value={form.numero_serie} onChange={(e) => setForm({ ...form, numero_serie: e.target.value })} placeholder="CN500-00012" className="bg-secondary border-border h-11" />
        </div>
        <div className="space-y-2">
          <Label>Cliente</Label>
          <Input value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} placeholder="Metalúrgica Alfa" className="bg-secondary border-border h-11" />
        </div>
        <div className="space-y-2">
          <Label>Data de Entrega</Label>
          <Input type="date" value={form.data_entrega} onChange={(e) => setForm({ ...form, data_entrega: e.target.value })} className="bg-secondary border-border h-11" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Modelo</Label>
          <Select value={form.modelo_id} onValueChange={onModeloChange}>
            <SelectTrigger className="bg-secondary border-border h-11">
              <SelectValue placeholder="Selecione um modelo" />
            </SelectTrigger>
            <SelectContent>
              {models.length === 0 ? (
                <div className="px-2 py-3 text-sm text-muted-foreground">Nenhum modelo disponível. Verifique a aba Modelos.</div>
              ) : (
                models.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {form.modelo_id && (
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-3">
            Ajuste o checklist de produção desta máquina. Alterações aqui não afetam o modelo.
          </p>
          <ProcessosEditor processos={processos} setProcessos={setProcessos} />
        </div>
      )}

      <Button onClick={submit} disabled={saving} className="w-full h-11">
        {saving ? "Salvando…" : "Registrar Máquina"}
      </Button>
    </Card>
  );
}
