import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ProgressBar";
import { STATUS_LABEL, STATUS_ORDER, statusClasses, progressColor, type MachineStatus } from "@/lib/status";
import { Search, ArrowUpAZ, ArrowDownZA } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/maquinas/")({
  head: () => ({ meta: [{ title: "Máquinas · Controle de Produção" }] }),
  component: MachinesList,
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

function MachinesList() {
  const [filter, setFilter] = useState<MachineStatus | "todos">("todos");
  const [search, setSearch] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const { data: machines = [] } = useQuery({
    queryKey: ["machines"],
    queryFn: async () => {
      const { data, error } = await supabase.from("machines").select("*");
      if (error) throw error;
      return data as Machine[];
    },
  });

  const q = search.toLowerCase();
  const filtered = machines.filter((m) => {
    const matchesStatus = filter === "todos" || m.status === filter;
    const matchesSearch = !q ||
      m.nome.toLowerCase().includes(q) ||
      m.cliente.toLowerCase().includes(q) ||
      m.numero_serie.toLowerCase().includes(q) ||
      (m.modelo_nome ?? "").toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    const valA = (a.numero_serie || "").trim();
    const valB = (b.numero_serie || "").trim();

    const isAStandard = /^\d+$/.test(valA);
    const isBStandard = /^\d+$/.test(valB);

    // Standard format (digits only) always comes first
    if (isAStandard && !isBStandard) return -1;
    if (!isAStandard && isBStandard) return 1;

    // Both are standard format, compare numerically
    if (isAStandard && isBStandard) {
      const numA = parseInt(valA, 10);
      const numB = parseInt(valB, 10);
      return sortDirection === "asc" ? numA - numB : numB - numA;
    }

    // Both are non-standard format, compare alphabetically
    const comparison = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: "base" });
    return sortDirection === "asc" ? comparison : -comparison;
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Máquinas</h1>
        <p className="text-muted-foreground mt-1">Todas as máquinas registradas</p>
      </header>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nome, cliente, série ou modelo…"
            className="pl-10 h-11 rounded-xl bg-card border-border"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
          className="h-11 px-4 gap-2 rounded-xl border-border bg-card shrink-0"
        >
          {sortDirection === "asc" ? (
            <>
              <ArrowUpAZ className="size-4" />
              <span>Série: Crescente</span>
            </>
          ) : (
            <>
              <ArrowDownZA className="size-4" />
              <span>Série: Decrescente</span>
            </>
          )}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip active={filter === "todos"} onClick={() => setFilter("todos")}>Todos</FilterChip>
        {STATUS_ORDER.map((s) => (
          <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)}>
            {STATUS_LABEL[s]}
          </FilterChip>
        ))}
      </div>

      <div className="space-y-2">
        {sorted.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">Nenhuma máquina encontrada.</Card>
        ) : sorted.map((m) => {
          const atrasado = m.status !== "entregue" && new Date(m.data_entrega) < new Date(new Date().toDateString());
          const progresso = Math.round(Number(m.progresso));
          return (
            <Link key={m.id} to="/maquinas/$id" params={{ id: m.id }}>
              <Card className={`p-4 rounded-2xl hover:bg-accent/40 transition-colors flex flex-col md:flex-row md:items-center gap-4 ${atrasado ? "border-[color:var(--status-atrasado)]/40" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold truncate">{m.nome}</div>
                    <Badge className={statusClasses(m.status)}>{STATUS_LABEL[m.status]}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 truncate">
                    {m.numero_serie} · {m.cliente} · {m.modelo_nome ?? "—"}
                  </div>
                </div>
                <div className="md:w-64 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Entrega: {format(new Date(m.data_entrega), "dd/MM/yyyy")}</span>
                    <span className="font-semibold">{progresso}%</span>
                  </div>
                  <ProgressBar value={progresso} indicatorClassName={progressColor(progresso, atrasado)} />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-full text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
