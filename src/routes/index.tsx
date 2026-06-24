import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ProgressBar";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, statusClasses, progressColor, parseLocalDate, type MachineStatus } from "@/lib/status";
import { Factory, Calendar, User, Hash, AlertTriangle, CheckCircle2, Maximize2, ArrowLeft, LayoutGrid, List } from "lucide-react";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "@tanstack/react-router";

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
  const queryClient = useQueryClient();
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
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  // Realtime updates: refetch on any change to machines or processes
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "machines" }, () => {
        queryClient.invalidateQueries({ queryKey: ["machines"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "machine_processes" }, () => {
        queryClient.invalidateQueries({ queryKey: ["machines"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Full page reload every 12 hours (for kiosk/TV display)
  useEffect(() => {
    const TWELVE_HOURS = 12 * 60 * 60 * 1000;
    const t = setTimeout(() => window.location.reload(), TWELVE_HOURS);
    return () => clearTimeout(t);
  }, []);

  const ativas = machines.filter((m) => m.status !== "entregue");
  const count = (s: MachineStatus) => machines.filter((m) => m.status === s).length;

  const [fullscreen, setFullscreen] = useState(false);
  const [view, setView] = useState<"cards" | "list">("cards");
  const navigate = useNavigate();

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFullscreen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [fullscreen]);

  const ViewToggle = (
    <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5">
      <Button
        variant={view === "cards" ? "secondary" : "ghost"}
        size="sm"
        className="h-8 px-2"
        onClick={() => setView("cards")}
        aria-label="Ver em cards"
        title="Ver em cards"
      >
        <LayoutGrid className="size-4" />
      </Button>
      <Button
        variant={view === "list" ? "secondary" : "ghost"}
        size="sm"
        className="h-8 px-2"
        onClick={() => setView("list")}
        aria-label="Ver em lista"
        title="Ver em lista"
      >
        <List className="size-4" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visão geral</h1>
          <p className="text-muted-foreground mt-1">Produção em tempo real</p>
        </div>
        <div className="flex items-center gap-2">
          {ViewToggle}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setFullscreen(true)}
            aria-label="Modo tela cheia"
            title="Modo tela cheia"
          >
            <Maximize2 className="size-4" />
          </Button>
        </div>
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
        ) : view === "cards" ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ativas.map((m) => (
              <Link key={m.id} to="/maquinas/$id" params={{ id: m.id }}>
                <MachineCard m={m} />
              </Link>
            ))}
          </div>
        ) : (
          <MachineTable machines={ativas} onRowClick={(id) => navigate({ to: "/maquinas/$id", params: { id } })} />
        )}
      </section>

      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-background overflow-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 md:px-10 py-5 bg-background/95 backdrop-blur border-b border-border">
            <div className="flex items-center gap-6 min-w-0 flex-1">
              <div className="shrink-0">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Visão Geral</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Produção em tempo real</p>
              </div>
              <div className="hidden md:grid grid-cols-4 gap-2 flex-1 max-w-3xl">
                <MiniStat label="Engenharia" value={count("engenharia")} status="engenharia" />
                <MiniStat label="Compras" value={count("compras")} status="compras" />
                <MiniStat label="Produção" value={count("producao")} status="producao" />
                <MiniStat label="Embarque" value={count("embarque")} status="embarque" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {ViewToggle}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setFullscreen(false)}
                aria-label="Voltar"
                title="Voltar"
              >
                <ArrowLeft className="size-4" />
              </Button>
            </div>
          </div>
          <div className="p-6 md:p-10">
            {ativas.length === 0 ? (
              <Card className="p-10 text-center text-muted-foreground">
                Nenhuma máquina em andamento.
              </Card>
            ) : view === "cards" ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
                {ativas.map((m) => (
                  <MachineCard key={m.id} m={m} />
                ))}
              </div>
            ) : (
              <MachineTable machines={ativas} onRowClick={(id) => navigate({ to: "/maquinas/$id", params: { id } })} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MachineCard({ m }: { m: Machine }) {
  const atrasado = isAtrasado(m);
  const progresso = Math.round(Number(m.progresso));
  return (
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
        <Info icon={Hash} label="Nº de Série" value={m.numero_serie} />
        <Info icon={User} label="Cliente" value={m.cliente} />
        <Info
          icon={Calendar}
          label="Entrega"
          value={format(parseLocalDate(m.data_entrega), "dd/MM/yyyy")}
          valueClass={atrasado ? "text-[color:var(--status-atrasado)]" : ""}
        />
        <div className="flex items-start gap-2 min-w-0">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium">Prazo</div>
            <PrazoPill atrasado={atrasado} />
          </div>
        </div>
      </div>

      <div className="space-y-1.5 mt-auto">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Progresso</span>
          <span className="font-semibold">{progresso}%</span>
        </div>
        <ProgressBar value={progresso} indicatorClassName={progressColor(progresso, atrasado)} />
      </div>
    </Card>
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

function MiniStat({ label, value, status }: { label: string; value: string | number; status: MachineStatus }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 flex items-center justify-between gap-2">
      <div className="text-[10px] uppercase tracking-wider text-white font-medium truncate">{label}</div>
      <div className="text-xl font-bold tabular-nums" style={{ color: `var(--status-${status})` }}>{value}</div>
    </div>
  );
}

function PrazoPill({ atrasado }: { atrasado: boolean }) {
  if (atrasado) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mt-1 text-xs font-semibold bg-[color:var(--status-atrasado)]/15 text-[color:var(--status-atrasado)] ring-1 ring-[color:var(--status-atrasado)]/40">
        <AlertTriangle className="size-3.5" />
        Atrasada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mt-1 text-xs font-semibold bg-[color:var(--status-producao)]/15 text-[color:var(--status-producao)] ring-1 ring-[color:var(--status-producao)]/40">
      <CheckCircle2 className="size-3.5" />
      No prazo
    </span>
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

function MachineTable({ machines, onRowClick }: { machines: Machine[]; onRowClick: (id: string) => void }) {
  return (
    <Card className="rounded-2xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-center text-muted-foreground/60">Nº de Série</TableHead>
            <TableHead className="text-center text-muted-foreground/60">Cliente</TableHead>
            <TableHead className="text-center text-muted-foreground/60">Modelo</TableHead>
            <TableHead className="text-center text-muted-foreground/60">Status</TableHead>
            <TableHead className="text-center text-muted-foreground/60">Entrega</TableHead>
            <TableHead className="text-center text-muted-foreground/60">Prazo</TableHead>
            <TableHead className="text-center text-muted-foreground/60 w-[220px]">Progresso</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {machines.map((m) => {
            const atrasado = isAtrasado(m);
            const progresso = Math.round(Number(m.progresso));
            return (
              <TableRow
                key={m.id}
                onClick={() => onRowClick(m.id)}
                className="cursor-pointer"
              >
                <TableCell className="text-center font-medium">{m.numero_serie}</TableCell>
                <TableCell className="text-center">{m.cliente}</TableCell>
                <TableCell className="text-center">{m.modelo_nome ?? "—"}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Badge className={statusClasses(m.status)}>{STATUS_LABEL[m.status]}</Badge>
                  </div>
                </TableCell>
                <TableCell className={`text-center ${atrasado ? "text-[color:var(--status-atrasado)] font-medium" : ""}`}>
                  {format(parseLocalDate(m.data_entrega), "dd/MM/yyyy")}
                </TableCell>
                <TableCell>
                  <div className="flex justify-center"><PrazoPill atrasado={atrasado} /></div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <ProgressBar value={progresso} indicatorClassName={progressColor(progresso, atrasado)} className="flex-1" />
                    <span className="text-xs font-semibold tabular-nums w-10 text-right">{progresso}%</span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
