// Estrutura de agrupamento do checklist — compartilhada entre modelos e visualização de máquinas

export interface ChecklistGroup {
  nome: string;
  peso: number;
  subitens: string[];
}

export const CHECKLIST_GROUPS: ChecklistGroup[] = [
  { nome: "Comercial",   peso: 5,  subitens: ["Comercial"] },
  { nome: "Engenharia",  peso: 10, subitens: ["Engenharia"] },
  { nome: "Compras",     peso: 10, subitens: ["Compras"] },
  { nome: "Recebimento", peso: 5,  subitens: ["Recebimento"] },
  { nome: "Caldeiraria", peso: 20, subitens: ["Corte", "Solda", "Pintura"] },
  { nome: "Montagem",    peso: 30, subitens: ["Elétrica", "Mecânica", "Pneumática", "Programação"] },
  { nome: "Testes",      peso: 10, subitens: ["Testes Mecânicos", "Testes Elétricos"] },
  { nome: "Expedição",   peso: 5,  subitens: ["Expedição"] },
  { nome: "Instalação",  peso: 5,  subitens: ["Instalação"] },
];

// ─── Tipos do editor agrupado ───────────────────────────────────────────────

export type SubItem = { nome: string; peso: number };

/**
 * Estado do editor agrupado.
 * isSingle=true  → item único (nome = grupNome), armazenado como 1 processo no banco
 * isSingle=false → grupo com subitens (ex: Caldeiraria), cada subitem salvo separadamente
 */
export type GrupoEdit = {
  grupNome: string;
  isSingle: boolean;
  subitems: SubItem[];
};

// ─── Template padrão Lufati ──────────────────────────────────────────────────

/** 15 processos padrão já no formato GrupoEdit — use diretamente sem conversão */
export const DEFAULT_GRUPOS: GrupoEdit[] = [
  { grupNome: "Comercial",   isSingle: true,  subitems: [{ nome: "Comercial",   peso: 5  }] },
  { grupNome: "Engenharia",  isSingle: true,  subitems: [{ nome: "Engenharia",  peso: 10 }] },
  { grupNome: "Compras",     isSingle: true,  subitems: [{ nome: "Compras",     peso: 10 }] },
  { grupNome: "Recebimento", isSingle: true,  subitems: [{ nome: "Recebimento", peso: 5  }] },
  {
    grupNome: "Caldeiraria", isSingle: false,
    subitems: [
      { nome: "Corte",   peso: 5  },
      { nome: "Solda",   peso: 10 },
      { nome: "Pintura", peso: 5  },
    ],
  },
  {
    grupNome: "Montagem", isSingle: false,
    subitems: [
      { nome: "Elétrica",    peso: 10 },
      { nome: "Mecânica",    peso: 10 },
      { nome: "Pneumática",  peso: 5  },
      { nome: "Programação", peso: 5  },
    ],
  },
  {
    grupNome: "Testes", isSingle: false,
    subitems: [
      { nome: "Testes Mecânicos", peso: 5 },
      { nome: "Testes Elétricos", peso: 5 },
    ],
  },
  { grupNome: "Expedição",  isSingle: true, subitems: [{ nome: "Expedição",  peso: 5 }] },
  { grupNome: "Instalação", isSingle: true, subitems: [{ nome: "Instalação", peso: 5 }] },
];

/** Template padrão como lista plana (para compatibilidade) */
export const DEFAULT_PROCESSOS: { nome: string; peso: number }[] = [
  { nome: "Comercial",        peso: 5  },
  { nome: "Engenharia",       peso: 10 },
  { nome: "Compras",          peso: 10 },
  { nome: "Recebimento",      peso: 5  },
  { nome: "Corte",            peso: 5  },
  { nome: "Solda",            peso: 10 },
  { nome: "Pintura",          peso: 5  },
  { nome: "Elétrica",         peso: 10 },
  { nome: "Mecânica",         peso: 10 },
  { nome: "Pneumática",       peso: 5  },
  { nome: "Programação",      peso: 5  },
  { nome: "Testes Mecânicos", peso: 5  },
  { nome: "Testes Elétricos", peso: 5  },
  { nome: "Expedição",        peso: 5  },
  { nome: "Instalação",       peso: 5  },
];

// ─── Funções de conversão ────────────────────────────────────────────────────

/** Converte lista plana do banco em grupos para o editor */
export function flatToGrupos(processos: { nome: string; peso: number }[]): GrupoEdit[] {
  const grupos: GrupoEdit[] = [];
  const matchedNames = new Set<string>();

  for (const g of CHECKLIST_GROUPS) {
    const isSingle = g.subitens.length === 1 && g.subitens[0] === g.nome;
    const matched = g.subitens
      .map((s) => processos.find((p) => p.nome === s))
      .filter((x): x is { nome: string; peso: number } => x !== undefined);

    if (matched.length === 0) continue;
    matched.forEach((m) => matchedNames.add(m.nome));

    if (isSingle) {
      grupos.push({ grupNome: g.nome, isSingle: true, subitems: [{ nome: matched[0].nome, peso: matched[0].peso }] });
    } else {
      grupos.push({ grupNome: g.nome, isSingle: false, subitems: matched.map((m) => ({ nome: m.nome, peso: m.peso })) });
    }
  }

  // Itens não reconhecidos → exibe como item simples
  for (const p of processos) {
    if (!matchedNames.has(p.nome)) {
      grupos.push({ grupNome: p.nome, isSingle: true, subitems: [{ nome: p.nome, peso: p.peso }] });
    }
  }

  return grupos;
}

/** Converte grupos do editor de volta para lista plana para salvar no banco */
export function gruposToFlat(grupos: GrupoEdit[]): { nome: string; peso: number }[] {
  return grupos.flatMap((g) => g.subitems.map((s) => ({ nome: s.nome, peso: s.peso })));
}
