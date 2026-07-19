import type { Documento } from "@/lib/types";

export type CategoriaBiblioteca =
  | "Lei ou regulamento"
  | "Programa eleitoral"
  | "Ata"
  | "Relatório"
  | "Contrato"
  | "Notícia"
  | "Outro";

export type SeparadorBiblioteca =
  | "todos"
  | "por-tratar"
  | "leis"
  | "programas"
  | "atas"
  | "relatorios"
  | "outros";

export type EstadoBiblioteca = "Por rever" | "Revisto" | "Arquivado";

export type ItemBiblioteca = {
  documento: Documento;
  estado: EstadoBiblioteca;
  categoria: CategoriaBiblioteca;
  assunto?: string;
  sessao?: string;
};

const categoriasConhecidas: CategoriaBiblioteca[] = [
  "Lei ou regulamento",
  "Programa eleitoral",
  "Ata",
  "Relatório",
  "Contrato",
  "Notícia",
  "Outro",
];

export function categoriaDocumentoBiblioteca(documento: Documento): CategoriaBiblioteca {
  const categoriaGuardada = documento.notas?.match(/\[Biblioteca: ([^\]]+)\]/)?.[1];

  if (categoriasConhecidas.includes(categoriaGuardada as CategoriaBiblioteca)) {
    return categoriaGuardada as CategoriaBiblioteca;
  }

  if (documento.tipo === "Ata") return "Ata";
  if (documento.tipo === "Relatório") return "Relatório";
  if (documento.tipo === "Regulamento") return "Lei ou regulamento";
  return "Outro";
}

export function separadorDaCategoria(categoria: CategoriaBiblioteca): SeparadorBiblioteca {
  if (categoria === "Lei ou regulamento") return "leis";
  if (categoria === "Programa eleitoral") return "programas";
  if (categoria === "Ata") return "atas";
  if (categoria === "Relatório") return "relatorios";
  return "outros";
}

function normalizarPesquisa(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT")
    .trim();
}

export function filtrarItensBiblioteca(
  itens: ItemBiblioteca[],
  { pesquisa, separador }: { pesquisa: string; separador: SeparadorBiblioteca },
) {
  const termo = normalizarPesquisa(pesquisa);

  return itens.filter((item) => {
    const correspondeAoSeparador =
      separador === "todos" ||
      (separador === "por-tratar"
        ? item.estado === "Por rever"
        : separadorDaCategoria(item.categoria) === separador);

    if (!correspondeAoSeparador) return false;
    if (!termo) return true;

    return [
      item.documento.titulo,
      item.documento.tipo,
      item.categoria,
      item.assunto,
      item.sessao,
    ].some((valor) => normalizarPesquisa(valor ?? "").includes(termo));
  });
}

export function ordenarItensBiblioteca(itens: ItemBiblioteca[]) {
  // Regra da Biblioteca: por rever primeiro; dentro de cada grupo, data mais recente primeiro.
  return [...itens].sort((a, b) => {
    const prioridadeA = a.estado === "Por rever" ? 0 : 1;
    const prioridadeB = b.estado === "Por rever" ? 0 : 1;
    if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB;

    const porData = b.documento.data.localeCompare(a.documento.data);
    if (porData !== 0) return porData;

    const porTitulo = a.documento.titulo.localeCompare(b.documento.titulo, "pt-PT");
    if (porTitulo !== 0) return porTitulo;
    return a.documento.id.localeCompare(b.documento.id);
  });
}

export function preencherTituloPeloFicheiro(tituloAtual: string, nomeFicheiro?: string) {
  if (tituloAtual.trim() || !nomeFicheiro) return tituloAtual;
  return nomeFicheiro.replace(/\.[^./\\]+$/, "").trim();
}
