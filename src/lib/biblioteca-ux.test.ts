import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filtrarItensBiblioteca,
  ordenarItensBiblioteca,
  preencherTituloPeloFicheiro,
  type CategoriaBiblioteca,
  type EstadoBiblioteca,
  type ItemBiblioteca,
} from "@/lib/biblioteca-ux";
import type { Documento } from "@/lib/types";

function criarItem({
  id,
  titulo,
  tipo = "Outro",
  data = "2026-07-01",
  estado = "analisado",
  categoria = "Outro",
  assunto,
  sessao,
}: {
  id: string;
  titulo: string;
  tipo?: Documento["tipo"];
  data?: string;
  estado?: EstadoBiblioteca;
  categoria?: CategoriaBiblioteca;
  assunto?: string;
  sessao?: string;
}): ItemBiblioteca {
  return {
    documento: {
      id,
      assembleiaId: "biblioteca",
      titulo,
      tipo,
      data,
      estado: "Por rever",
      createdAt: `${data}T09:00:00.000Z`,
    },
    estado,
    categoria,
    assunto,
    sessao,
  };
}

const itens = [
  criarItem({
    id: "lei-iluminacao",
    titulo: "Regulamento municipal",
    tipo: "Regulamento",
    categoria: "Lei ou regulamento",
    assunto: "Iluminação Pública",
    sessao: "Reunião de Câmara de julho",
  }),
  criarItem({
    id: "ata-mobilidade",
    titulo: "Mobilidade no centro",
    tipo: "Ata",
    categoria: "Ata",
    assunto: "Trânsito",
    sessao: "Assembleia Municipal",
  }),
];

describe("pesquisa da Biblioteca", () => {
  it("procura sem distinguir maiúsculas ou acentos nos campos indexados", () => {
    for (const pesquisa of ["REGULAMENTO", "lei OU", "iluminacao", "CÂMARA DE JULHO"]) {
      assert.deepEqual(
        filtrarItensBiblioteca(itens, { pesquisa, separador: "todos" }).map(
          (item) => item.documento.id,
        ),
        ["lei-iluminacao"],
      );
    }
  });

  it("combina a pesquisa com a categoria ativa", () => {
    assert.deepEqual(
      filtrarItensBiblioteca(itens, { pesquisa: "regulamento", separador: "leis" }).map(
        (item) => item.documento.id,
      ),
      ["lei-iluminacao"],
    );
    assert.deepEqual(
      filtrarItensBiblioteca(itens, { pesquisa: "regulamento", separador: "atas" }),
      [],
    );
  });
});

describe("ordenação da Biblioteca", () => {
  it("coloca por analisar primeiro e ordena cada grupo pela data mais recente", () => {
    const ordenados = ordenarItensBiblioteca([
      criarItem({ id: "analisado-recente", titulo: "C", data: "2026-07-18" }),
      criarItem({
        id: "pendente-antigo",
        titulo: "B",
        data: "2026-06-01",
        estado: "por analisar",
      }),
      criarItem({ id: "arquivado", titulo: "D", data: "2026-07-10", estado: "arquivado" }),
      criarItem({
        id: "pendente-recente",
        titulo: "A",
        data: "2026-07-01",
        estado: "por analisar",
      }),
    ]);

    assert.deepEqual(
      ordenados.map((item) => item.documento.id),
      ["pendente-recente", "pendente-antigo", "analisado-recente", "arquivado"],
    );
  });
});

describe("título a partir do ficheiro", () => {
  it("remove apenas a extensão quando o título está vazio", () => {
    assert.equal(
      preencherTituloPeloFicheiro("", "Regulamento.municipal.v2.pdf"),
      "Regulamento.municipal.v2",
    );
  });

  it("nunca substitui um título já escrito", () => {
    assert.equal(
      preencherTituloPeloFicheiro("Título escolhido", "outro-documento.pdf"),
      "Título escolhido",
    );
  });
});
