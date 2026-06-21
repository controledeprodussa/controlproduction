export type MachineStatus = "engenharia" | "compras" | "producao" | "embarque" | "entregue";

export const STATUS_LABEL: Record<MachineStatus, string> = {
  engenharia: "Engenharia",
  compras: "Compras",
  producao: "Produção",
  embarque: "Embarque",
  entregue: "Entregue",
};

export const STATUS_ORDER: MachineStatus[] = ["engenharia", "compras", "producao", "embarque", "entregue"];

export function statusClasses(s: MachineStatus): string {
  switch (s) {
    case "engenharia": return "bg-[color:var(--status-engenharia)]/15 text-[color:var(--status-engenharia)] ring-1 ring-[color:var(--status-engenharia)]/30";
    case "compras":    return "bg-[color:var(--status-compras)]/15 text-[color:var(--status-compras)] ring-1 ring-[color:var(--status-compras)]/30";
    case "producao":   return "bg-[color:var(--status-producao)]/15 text-[color:var(--status-producao)] ring-1 ring-[color:var(--status-producao)]/30";
    case "embarque":   return "bg-[color:var(--status-embarque)]/15 text-[color:var(--status-embarque)] ring-1 ring-[color:var(--status-embarque)]/30";
    case "entregue":   return "bg-[color:var(--status-entregue)]/20 text-muted-foreground ring-1 ring-[color:var(--status-entregue)]/30";
  }
}

export function progressColor(p: number, atrasado: boolean): string {
  if (atrasado) return "bg-[color:var(--status-atrasado)]";
  if (p >= 100) return "bg-[color:var(--status-entregue)]";
  return "bg-[color:var(--status-producao)]";
}
