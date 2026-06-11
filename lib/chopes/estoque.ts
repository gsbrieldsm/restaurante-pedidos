export type StatusEstoque = "OK" | "ALERTA" | "CRITICO" | "ESGOTADO";

export type Chope = {
  id: string;
  nome: string;
  estilo: string;
  torneira: number | null;
  fornecedor: string | null;
  unidade: string;
  capacidade_barril: number;
  estoque_atual: number;
  estoque_minimo: number;
  estoque_critico: number;
  ativo: boolean;
};

export type ChopeComStatus = Chope & {
  status: StatusEstoque;
  percentual: number;
};

export function calcularStatus(
  estoqueAtual: number,
  estoqueMinimo: number,
  estoqueCritico: number
): StatusEstoque {
  if (estoqueAtual <= 0) return "ESGOTADO";
  if (estoqueAtual <= estoqueCritico) return "CRITICO";
  if (estoqueAtual <= estoqueMinimo) return "ALERTA";
  return "OK";
}

export function comStatus(chope: Chope): ChopeComStatus {
  const status = calcularStatus(
    chope.estoque_atual,
    chope.estoque_minimo,
    chope.estoque_critico
  );
  const percentual = chope.capacidade_barril
    ? Math.max(
        0,
        Math.min(100, (chope.estoque_atual / chope.capacidade_barril) * 100)
      )
    : 0;
  return { ...chope, status, percentual };
}

export const STATUS_LABEL: Record<StatusEstoque, string> = {
  OK: "Em estoque",
  ALERTA: "Pedir novamente",
  CRITICO: "Crítico",
  ESGOTADO: "Esgotado",
};

export const STATUS_ORDER: StatusEstoque[] = [
  "ESGOTADO",
  "CRITICO",
  "ALERTA",
  "OK",
];
