import * as XLSX from "xlsx";

export type LinhaRelatorio = {
  produto: string;
  quantidade: number;
};

const COLUNAS_PRODUTO = [
  "produto",
  "item",
  "descricao",
  "descrição",
  "nome",
  "bebida",
];

const COLUNAS_QUANTIDADE = [
  "quantidade",
  "qtd",
  "qtde",
  "qtd.",
  "vendido",
  "vendidos",
  "vendas",
  "total vendido",
];

function normalizar(texto: string): string {
  return texto
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function encontrarColuna(headers: string[], candidatos: string[]): number {
  const normalizados = headers.map(normalizar);

  for (const candidato of candidatos) {
    const idx = normalizados.findIndex((h) => h === candidato);
    if (idx !== -1) return idx;
  }
  for (const candidato of candidatos) {
    const idx = normalizados.findIndex((h) => h.includes(candidato));
    if (idx !== -1) return idx;
  }
  return -1;
}

export function parseRelatorio(buffer: ArrayBuffer): {
  linhas: LinhaRelatorio[];
  erro?: string;
} {
  const workbook = XLSX.read(buffer, { type: "array" });
  const primeiraAba = workbook.SheetNames[0];
  const sheet = workbook.Sheets[primeiraAba];

  const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  });

  if (data.length < 2) {
    return { linhas: [], erro: "Planilha vazia ou sem dados" };
  }

  let headerRowIndex = 0;
  let colunaProduto = -1;
  let colunaQuantidade = -1;

  for (let i = 0; i < Math.min(data.length, 5); i++) {
    const headers = data[i].map((c) => String(c ?? ""));
    const p = encontrarColuna(headers, COLUNAS_PRODUTO);
    const q = encontrarColuna(headers, COLUNAS_QUANTIDADE);
    if (p !== -1 && q !== -1) {
      headerRowIndex = i;
      colunaProduto = p;
      colunaQuantidade = q;
      break;
    }
  }

  if (colunaProduto === -1 || colunaQuantidade === -1) {
    return {
      linhas: [],
      erro:
        "Não foi possível identificar as colunas de produto e quantidade no relatório",
    };
  }

  const linhas: LinhaRelatorio[] = [];

  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    const produto = String(row[colunaProduto] ?? "").trim();
    const quantidadeRaw = row[colunaQuantidade];

    if (!produto) continue;

    const quantidade =
      typeof quantidadeRaw === "number"
        ? quantidadeRaw
        : parseFloat(
            String(quantidadeRaw ?? "0")
              .replace(/\./g, "")
              .replace(",", ".")
          );

    if (isNaN(quantidade)) continue;

    linhas.push({ produto, quantidade });
  }

  return { linhas };
}
