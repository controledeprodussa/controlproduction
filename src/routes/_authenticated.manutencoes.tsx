import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseLocalDate } from "@/lib/status";
import { format, subMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Wrench,
  CalendarClock,
  Cog,
  Users,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

export const Route = createFileRoute("/_authenticated/manutencoes")({
  head: () => ({
    meta: [
      { title: "Dashboard de Manutenções · Controle de Produção" },
      { name: "description", content: "Indicadores, gráficos e histórico de manutenções registradas." },
      { property: "og:title", content: "Dashboard de Manutenções" },
      { property: "og:description", content: "Indicadores, gráficos e histórico de manutenções registradas." },
    ],
  }),
  component: ManutencoesDashboard,
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

const CHART_COLORS = [
  "var(--status-engenharia)",
  "var(--status-producao)",
  "var(--status-embarque)",
  "var(--status-compras)",
  "var(--status-entregue)",
  "var(--status-atrasado)",
];

const PAGE_SIZE = 10;

function ManutencoesDashboard() {
  const { data: all = [], isLoading } = useQuery({
    queryKey: ["manutencoes-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manutencoes")
        .select("*")
        .order("data_visita", { ascending: false });
      if (error) throw error;
      return data as Manutencao[];
    },
  });

  const { data: tecnicoRows = [] } = useQuery({
    queryKey: ["manutencao-tecnicos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manutencao_tecnicos")
        .select("manutencao_id, tecnico");
      if (error) throw error;
      return data as { manutencao_id: string; tecnico: string }[];
    },
  });

  // manutencao_id -> lista de técnicos (fallback: campo tecnico da manutenção)
  const tecnicosPorManutencao = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const r of tecnicoRows) {
      const nome = (r.tecnico ?? "").trim();
      if (!nome) continue;
      const arr = map.get(r.manutencao_id) ?? [];
      if (!arr.includes(nome)) arr.push(nome);
      map.set(r.manutencao_id, arr);
    }
    return map;
  }, [tecnicoRows]);

  const tecnicosDe = (m: Manutencao) => {
    const list = tecnicosPorManutencao.get(m.id);
    if (list && list.length) return list;
    const fallback = (m.tecnico ?? "").trim();
    return fallback ? [fallback] : [];
  };

  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [cliente, setCliente] = useState("todos");
  const [tecnico, setTecnico] = useState("todos");
  const [page, setPage] = useState(0);

  const clientes = useMemo(
    () =>
      Array.from(
        new Set(all.map((m) => (m.cliente ?? "").trim().toUpperCase()).filter(Boolean)),
      ).sort(),
    [all],
  );
  const tecnicos = useMemo(
    () => Array.from(new Set(all.flatMap((m) => tecnicosDe(m)))).sort(),
    [all, tecnicosPorManutencao],
  );

  const rows = useMemo(() => {
    return all.filter((m) => {
      if (de && m.data_visita < de) return false;
      if (ate && m.data_visita > ate) return false;
      if (cliente !== "todos" && (m.cliente ?? "").trim().toUpperCase() !== cliente) return false;
      if (tecnico !== "todos" && !tecnicosDe(m).includes(tecnico)) return false;
      return true;
    });
  }, [all, de, ate, cliente, tecnico, tecnicosPorManutencao]);

  const ultimos30 = useMemo(() => {
    const limite = new Date();
    limite.setDate(limite.getDate() - 30);
    return rows.filter((m) => parseLocalDate(m.data_visita) >= limite).length;
  }, [rows]);

  const maquinas = useMemo(() => new Set(rows.map((m) => m.numero_serie)).size, [rows]);
  const totalTecnicos = useMemo(
    () => new Set(rows.flatMap((m) => tecnicosDe(m))).size,
    [rows, tecnicosPorManutencao],
  );

  const porMes = useMemo(() => {
    const base = startOfMonth(subMonths(new Date(), 11));
    const buckets: { key: string; label: string; total: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
      buckets.push({ key: format(d, "yyyy-MM"), label: format(d, "MMM/yy", { locale: ptBR }), total: 0 });
    }
    for (const m of rows) {
      const k = m.data_visita.slice(0, 7);
      const b = buckets.find((x) => x.key === k);
      if (b) b.total += 1;
    }
    return buckets;
  }, [rows]);

  const topBy = (getKey: (m: Manutencao) => string) => {
    const map = new Map<string, number>();
    for (const m of rows) map.set(getKey(m), (map.get(getKey(m)) ?? 0) + 1);
    return Array.from(map, ([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  };

  const topClientes = useMemo(
    () => topBy((m) => (m.cliente ?? "").trim().toUpperCase() || "—"),
    [rows],
  );
  const topMaquinas = useMemo(
    () => topBy((m) => `${m.numero_serie} · ${(m.cliente ?? "").trim().toUpperCase()}`),
    [rows],
  );
  const porTecnico = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of rows) {
      const list = tecnicosDe(m);
      if (!list.length) map.set("—", (map.get("—") ?? 0) + 1);
      for (const t of list) map.set(t, (map.get(t) ?? 0) + 1);
    }
    return Array.from(map, ([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [rows, tecnicosPorManutencao]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages - 1);
  const pageRows = rows.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE);

  const resetFiltros = () => {
    setDe("");
    setAte("");
    setCliente("todos");
    setTecnico("todos");
    setPage(0);
  };

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manutenções</h1>
          <p className="text-muted-foreground mt-1">Indicadores e histórico de campo</p>
        </div>
      </header>

      {/* Filtros */}
      <Card className="rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="De">
            <Input type="date" value={de} onChange={(e) => { setDe(e.target.value); setPage(0); }} />
          </Field>
          <Field label="Até">
            <Input type="date" value={ate} onChange={(e) => { setAte(e.target.value); setPage(0); }} />
          </Field>
          <Field label="Cliente">
            <Select value={cliente} onValueChange={(v) => { setCliente(v); setPage(0); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {clientes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Técnico">
            <Select value={tecnico} onValueChange={(v) => { setTecnico(v); setPage(0); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {tecnicos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-end">
            <Button variant="outline" className="w-full" onClick={resetFiltros}>
              <RotateCcw className="size-4" /> Limpar
            </Button>
          </div>
        </div>
      </Card>

      {/* Indicadores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Stat icon={Wrench} label="Total de manutenções" value={rows.length} color="var(--status-engenharia)" />
        <Stat icon={CalendarClock} label="Últimos 30 dias" value={ultimos30} color="var(--status-producao)" />
        <Stat icon={Cog} label="Máquinas atendidas" value={maquinas} color="var(--status-embarque)" />
        <Stat icon={Users} label="Técnicos" value={totalTecnicos} color="var(--status-compras)" />
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Carregando…</div>
      ) : (
        <>
          <ChartCard title="Manutenções ao longo do tempo" subtitle="Últimos 12 meses">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={porMes} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-manut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--status-engenharia)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--status-engenharia)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)" }} />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Manutenções"
                  stroke="var(--status-engenharia)"
                  strokeWidth={2}
                  fill="url(#grad-manut)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Top clientes" subtitle="Maior número de manutenções">
              <HBar data={topClientes} color="var(--status-producao)" />
            </ChartCard>
            <ChartCard title="Top máquinas" subtitle="Nº de série · cliente">
              <HBar data={topMaquinas} color="var(--status-embarque)" width={190} />
            </ChartCard>
          </div>

          <ChartCard title="Manutenções por técnico" subtitle="Distribuição da equipe">
            <HBar data={porTecnico} multicolor />
          </ChartCard>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Manutenções recentes</h2>
            <Card className="rounded-2xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-foreground/90">Data</TableHead>
                    <TableHead className="text-foreground/90">Máquina</TableHead>
                    <TableHead className="text-foreground/90 hidden md:table-cell">Técnico</TableHead>
                    <TableHead className="text-foreground/90 hidden lg:table-cell">Resumo</TableHead>
                    <TableHead className="text-foreground/90 w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                        Nenhuma manutenção encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageRows.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {format(parseLocalDate(m.data_visita), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium">{m.numero_serie}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[180px]">{m.cliente}</div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{m.tecnico}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          <span className="line-clamp-2 max-w-[420px]">{m.relatorio}</span>
                        </TableCell>
                        <TableCell>
                          {m.link_relatorio && (
                            <a
                              href={m.link_relatorio}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center size-8 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                              title="Abrir relatório completo"
                            >
                              <ExternalLink className="size-4" />
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>

            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {rows.length} registro(s) · página {pageSafe + 1} de {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={pageSafe === 0}
                  onClick={() => setPage(pageSafe - 1)}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={pageSafe >= totalPages - 1}
                  onClick={() => setPage(pageSafe + 1)}
                  aria-label="Próxima página"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium">{label}</div>
      {children}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card className="p-4 md:p-5 rounded-2xl border border-border bg-card flex items-center gap-3 md:gap-4">
      <div
        className="size-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `color-mix(in oklab, ${color} 15%, transparent)` }}
      >
        <Icon className="size-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground truncate">{label}</div>
        <div className="text-2xl md:text-3xl font-bold tabular-nums" style={{ color }}>{value}</div>
      </div>
    </Card>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4">
        <div className="font-semibold">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
      </div>
      {children}
    </Card>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 shadow-xl">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{payload[0].value} manutenção(ões)</div>
    </div>
  );
}

function HBar({
  data,
  color = "var(--status-producao)",
  multicolor = false,
  width = 140,
}: {
  data: { name: string; total: number }[];
  color?: string;
  multicolor?: boolean;
  width?: number;
}) {
  if (data.length === 0) {
    return <div className="text-sm text-muted-foreground py-10 text-center">Sem dados no período.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="name"
          width={width}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--accent)", opacity: 0.3 }} />
        <Bar dataKey="total" name="Manutenções" radius={[0, 6, 6, 0]} fill={color} barSize={16}>
          {multicolor &&
            data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
