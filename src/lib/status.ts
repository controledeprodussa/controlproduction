export type MachineStatus =
  | "comercial"
  | "engenharia"
  | "compras"
  | "recebimento"
  | "caldeiraria"
  | "montagem"
  | "testes"
  | "expedicao"
  | "instalacao"
  | "entregue";

export const STATUS_LABEL: Record<MachineStatus, string> = {
  comercial: "Comercial",
  engenharia: "Engenharia",
  compras: "Compras",
  recebimento: "Recebimento",
  caldeiraria: "Caldeiraria",
  montagem: "Montagem",
  testes: "Testes",
  expedicao: "Expedição",
  instalacao: "Instalação",
  entregue: "Entregue",
};

export const STATUS_ORDER: MachineStatus[] = [
  "comercial",
  "engenharia",
  "compras",
  "recebimento",
  "caldeiraria",
  "montagem",
  "testes",
  "expedicao",
  "instalacao",
  "entregue",
];

export function statusClasses(s: MachineStatus): string {
  switch (s) {
    case "comercial":  return "bg-[color:var(--status-comercial)]/15 text-[color:var(--status-comercial)] ring-1 ring-[color:var(--status-comercial)]/30";
    case "engenharia": return "bg-[color:var(--status-engenharia)]/15 text-[color:var(--status-engenharia)] ring-1 ring-[color:var(--status-engenharia)]/30";
    case "compras":    return "bg-[color:var(--status-compras)]/15 text-[color:var(--status-compras)] ring-1 ring-[color:var(--status-compras)]/30";
    case "recebimento":return "bg-[color:var(--status-recebimento)]/15 text-[color:var(--status-recebimento)] ring-1 ring-[color:var(--status-recebimento)]/30";
    case "caldeiraria":return "bg-[color:var(--status-caldeiraria)]/15 text-[color:var(--status-caldeiraria)] ring-1 ring-[color:var(--status-caldeiraria)]/30";
    case "montagem":   return "bg-[color:var(--status-montagem)]/15 text-[color:var(--status-montagem)] ring-1 ring-[color:var(--status-montagem)]/30";
    case "testes":     return "bg-[color:var(--status-testes)]/15 text-[color:var(--status-testes)] ring-1 ring-[color:var(--status-testes)]/30";
    case "expedicao":  return "bg-[color:var(--status-expedicao)]/15 text-[color:var(--status-expedicao)] ring-1 ring-[color:var(--status-expedicao)]/30";
    case "instalacao": return "bg-[color:var(--status-instalacao)]/15 text-[color:var(--status-instalacao)] ring-1 ring-[color:var(--status-instalacao)]/30";
    case "entregue":   return "bg-[color:var(--status-entregue)]/15 text-[color:var(--status-entregue)] ring-1 ring-[color:var(--status-entregue)]/30";
    default:           return "bg-secondary text-muted-foreground ring-1 ring-border";
  }
}

export function progressColor(p: number, atrasado: boolean): string {
  if (p >= 100) return "bg-[color:var(--status-producao)]";
  if (atrasado) return "bg-[color:var(--status-atrasado)]";
  return "bg-[color:var(--status-producao)]";
}

/** Parse a YYYY-MM-DD date string as a local-time Date (avoid UTC shift). */
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

