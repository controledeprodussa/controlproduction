// Estrutura de agrupamento do checklist — compartilhada entre modelos e visualização de máquinas
export const CHECKLIST_GROUPS = [
  { nome: "Comercial",   subitens: ["Comercial"] },
  { nome: "Engenharia",  subitens: ["Engenharia"] },
  { nome: "Compras",     subitens: ["Compras"] },
  { nome: "Recebimento", subitens: ["Recebimento"] },
  { nome: "Caldeiraria", subitens: ["Corte", "Solda", "Pintura"] },
  { nome: "Montagem",    subitens: ["Elétrica", "Mecânica", "Pneumática", "Programação"] },
  { nome: "Testes",      subitens: ["Testes Mecânicos", "Testes Elétricos"] },
  { nome: "Expedição",   subitens: ["Expedição"] },
  { nome: "Instalação",  subitens: ["Instalação"] },
] as const;

/** Template padrão Lufati com 15 processos totalizando 100% */
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

export type SubItem = { nome: string; peso: number };

/**
 * Estado do editor agrupado.
 * isSingle=true  → item único (nome = grupNome), armazenado como 1 processo no banco
 * isSingle=false → grupo com subitens (ex: Caldeiraria), subitens são armazenados separadamente
 */
export type GrupoEdit = {
  grupNome: string;
  isSingle: boolean;
  subitems: SubItem[];
};

/** Converte lista plana do banco em grupos para o editor */
export function flatToGrupos(processos: { nome: string; peso: number }[]): GrupoEdit[] {
  const grupos: GrupoEdit[] = [];
  const matchedNames = new Set<string>();

  for (const g of CHECKLIST_GROUPS) {
    const isSingle = g.subitens.length === 1 && g.subitens[0] === g.nome;
    const matched = g.subitens
      .map((s) => processos.find((p) => p.nome === s))
      .filter(Boolean) as { nome: string; peso: number }[];

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
