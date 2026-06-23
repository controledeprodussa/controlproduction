import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, statusClasses, type MachineStatus } from "@/lib/status";
import { Badge } from "@/components/ui/badge";

type Result = {
  id: string;
  nome: string;
  numero_serie: string;
  cliente: string;
  modelo_nome: string | null;
  status: MachineStatus;
};

export function GlobalSearch({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      const like = `%${term}%`;
      const { data, error } = await supabase
        .from("machines")
        .select("id, nome, numero_serie, cliente, modelo_nome, status")
        .or(`nome.ilike.${like},numero_serie.ilike.${like},cliente.ilike.${like}`)
        .order("data_entrega", { ascending: true })
        .limit(8);
      if (!error) setResults((data ?? []) as Result[]);
      setLoading(false);
      setActiveIdx(0);
    }, 200);
    return () => clearTimeout(handle);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const input = containerRef.current?.querySelector("input");
        (input as HTMLInputElement | null)?.focus();
        setOpen(true);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const go = (id: string) => {
    setOpen(false);
    setQ("");
    navigate({ to: "/maquinas/$id", params: { id } });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIdx]) {
      e.preventDefault();
      go(results[activeIdx].id);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showPanel = open && q.trim().length > 0;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Buscar..."
        className="pl-9 pr-9 h-10 rounded-xl bg-card border-border"
        aria-label="Buscar máquinas"
      />
      {q && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            setResults([]);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
          aria-label="Limpar busca"
        >
          <X className="size-4" />
        </button>
      )}

      {showPanel && (
        <div className="absolute left-0 right-0 mt-2 z-50 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden">
          {loading && results.length === 0 ? (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Buscando…
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Nenhum resultado encontrado.</div>
          ) : (
            <ul className="max-h-[60vh] overflow-auto py-1">
              {results.map((r, i) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => go(r.id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors",
                      i === activeIdx ? "bg-accent" : "hover:bg-accent/60",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{r.nome}</span>
                        <Badge className={cn("shrink-0", statusClasses(r.status))}>
                          {STATUS_LABEL[r.status]}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        Nº {r.numero_serie} · {r.cliente}
                        {r.modelo_nome ? ` · ${r.modelo_nome}` : ""}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
