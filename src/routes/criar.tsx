import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Wrench, PackagePlus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/criar")({
  head: () => ({ meta: [{ title: "Criar · Controle de Produção" }] }),
  component: CriarPage,
});

function CriarPage() {
  const [tab, setTab] = useState<"modelo" | "maquina">("modelo");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Criar</h1>
        <p className="text-muted-foreground mt-1">Cadastre modelos e registre máquinas</p>
      </header>

      <div className="flex gap-2">
        <TabButton active={tab === "modelo"} onClick={() => setTab("modelo")} icon={<Wrench className="size-4" />}>
          Modelo de Máquina
        </TabButton>
        <TabButton active={tab === "maquina"} onClick={() => setTab("maquina")} icon={<PackagePlus className="size-4" />}>
          Registrar Máquina
        </TabButton>
      </div>

      {tab === "modelo" ? <ModeloForm /> : <MaquinaForm />}
    </div>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border border-border"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function ModeloForm() {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [processos, setProcessos] = useState<{ nome: string; peso: number }[]>([
    { nome: "Solda", peso: 30 },
    { nome: "Pintura", peso: 20 },
    { nome: "Montagem", peso: 50 },
  ]);
  const [saving, setSaving] = useState(false);

  const total = processos.reduce((s, p) => s + Number(p.peso || 0), 0);

  const submit = async () => {
    if (!nome.trim()) return toast.error("Informe o nome do modelo");
    if (processos.some((p) => !p.nome.trim())) return toast.error("Preencha o nome de todos os processos");
    if (total !== 100) return toast.error(`O total dos pesos deve ser 100% (atual: ${total}%)`);

    setSaving(true);
    try {
      const { data: model, error } = await supabase.from("machine_models").insert({ nome }).select().single();
      if (error) throw error;
      const rows = processos.map((p, i) => ({ model_id: model.id, nome: p.nome, peso: p.peso, ordem: i }));
      const { error: e2 } = await supabase.from("machine_process_templates").insert(rows);
      if (e2) throw e2;
      toast.success("Modelo criado!");
      setNome("");
      setProcessos([{ nome: "", peso: 0 }]);
      qc.invalidateQueries({ queryKey: ["models"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6 rounded-2xl space-y-6">
      <div className="space-y-2">
        <Label>Nome do Modelo</Label>
        <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Prensa Hidráulica" className="bg-secondary border-border h-11" />
      </div>

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
                onChange={(e) => setProcessos((arr) => arr.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))}
                placeholder="Nome do processo"
                className="bg-secondary border-border flex-1"
              />
              <Input
                type="number"
                value={p.peso}
                onChange={(e) => setProcessos((arr) => arr.map((x, j) => (j === i ? { ...x, peso: Number(e.target.value) } : x)))}
                placeholder="%"
                className="bg-secondary border-border w-24"
              />
              <Button variant="ghost" size="icon" onClick={() => setProcessos((arr) => arr.filter((_, j) => j !== i))}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" onClick={() => setProcessos((arr) => [...arr, { nome: "", peso: 0 }])} className="gap-2">
          <Plus className="size-4" /> Adicionar processo
        </Button>
      </div>

      <Button onClick={submit} disabled={saving} className="w-full h-11">
        {saving ? "Salvando…" : "Salvar Modelo"}
      </Button>
    </Card>
  );
}

function MaquinaForm() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({ nome: "", numero_serie: "", cliente: "", data_entrega: "", modelo_id: "" });
  const [saving, setSaving] = useState(false);

  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: async () => {
      const { data, error } = await supabase.from("machine_models").select("id, nome").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const submit = async () => {
    if (!form.nome || !form.numero_serie || !form.cliente || !form.data_entrega || !form.modelo_id) {
      return toast.error("Preencha todos os campos");
    }
    setSaving(true);
    try {
      const model = models.find((m: any) => m.id === form.modelo_id);
      const { data: tpls, error: e0 } = await supabase
        .from("machine_process_templates")
        .select("nome, peso, ordem")
        .eq("model_id", form.modelo_id)
        .order("ordem");
      if (e0) throw e0;

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
        })
        .select()
        .single();
      if (error) throw error;

      if (tpls?.length) {
        const rows = tpls.map((t) => ({ machine_id: machine.id, nome: t.nome, peso: t.peso, ordem: t.ordem }));
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
          <Select value={form.modelo_id} onValueChange={(v) => setForm({ ...form, modelo_id: v })}>
            <SelectTrigger className="bg-secondary border-border h-11">
              <SelectValue placeholder="Selecione um modelo" />
            </SelectTrigger>
            <SelectContent>
              {models.length === 0 ? (
                <div className="px-2 py-3 text-sm text-muted-foreground">Crie um modelo primeiro</div>
              ) : (
                models.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button onClick={submit} disabled={saving} className="w-full h-11">
        {saving ? "Salvando…" : "Registrar Máquina"}
      </Button>
    </Card>
  );
}
