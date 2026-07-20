import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const list = read("./_app.biblioteca.tsx");
const canonicalDetail = read("./_app.documentos.$documentoId.tsx");
const ux = read("../lib/biblioteca-ux.ts");

describe("lista mobile da Biblioteca", () => {
  it("mantém a abertura integral do Documento na rota canónica", () => {
    assert.match(list, /to="\/documentos\/\$documentoId"/);
    assert.match(list, /params=\{\{ documentoId: documento\.id \}\}/);
    assert.match(list, /search=\{\{ origem: "biblioteca" \}\}/);
    assert.match(list, /aria-label=\{`Abrir documento: \$\{documento\.titulo\}`\}/);
    assert.match(list, /className="absolute inset-0 z-0/);
    assert.match(canonicalDetail, /createFileRoute\("\/_app\/documentos\/\$documentoId"\)/);
  });

  it("preserva os sete filtros, pesquisa local e handlers", () => {
    for (const filtro of [
      "todos",
      "por-tratar",
      "leis",
      "programas",
      "atas",
      "relatorios",
      "outros",
    ]) {
      assert.match(list, new RegExp(`id: "${filtro}"`));
    }
    assert.match(list, /filtrarItensBiblioteca\(itensBiblioteca/);
    assert.match(list, /pesquisa,[\s\S]*separador: separadorAtivo/);
    assert.match(list, /onChange=\{\(event\) => setPesquisa\(event\.target\.value\)\}/);
    assert.match(list, /setSeparadorAtivo\(value as SeparadorId\)/);
    assert.match(list, /onClick=\{\(\) => setPesquisa\(""\)\}/);
  });

  it("mantém a ordenação documental determinística existente", () => {
    assert.match(list, /ordenarItensBiblioteca\(/);
    assert.match(ux, /a\.estado === "Por rever" \? 0 : 1/);
    assert.match(ux, /b\.documento\.data\.localeCompare\(a\.documento\.data\)/);
    assert.match(ux, /a\.documento\.titulo\.localeCompare\(b\.documento\.titulo, "pt-PT"\)/);
    assert.match(ux, /a\.documento\.id\.localeCompare\(b\.documento\.id\)/);
  });

  it("compõe título, tipo, associações e metadata em até três linhas compactas", () => {
    assert.match(list, /data-documento-mobile/);
    assert.match(list, /\{documento\.titulo\}/);
    assert.match(list, /dot=\{false\}[\s\S]*\{documento\.tipo\}/);
    assert.match(list, /const temAssociacoes = Boolean\(assunto \|\| sessao\)/);
    assert.match(list, /temAssociacoes &&[\s\S]*\{associacoes\}/);
    assert.match(list, /formatarDataBibliotecaMobile\(documento\.data\)/);
    assert.match(list, /\{estado\}/);
    assert.match(list, /\{acaoAbrir\}/);
  });

  it("usa somente tipo, estado, associação e ações já existentes", () => {
    assert.match(list, /categoriaDocumentoBiblioteca\(documento\)/);
    assert.match(list, /documento\.tipo/);
    assert.match(list, /listarDossiesAssociadosAoDocumento\(documento\.id\)\[0\]/);
    assert.match(list, /assembleias\.find\(/);
    assert.match(list, /dossies\.find\(/);
    assert.match(list, /estado === "Por rever" \? "Rever documento" : "Abrir documento"/);
    assert.match(list, /<InstitutionalDocumentIntake documentoInicial=\{documento\} \/>/);
  });

  it("preserva todos os estados vazios atuais", () => {
    for (const mensagem of [
      "A Biblioteca ainda está vazia",
      "Nenhum documento encontrado",
      "Não há documentos por rever",
      "Sem documentos nesta categoria",
    ]) {
      assert.match(list, new RegExp(mensagem));
    }
    assert.match(
      list,
      /<EmptyState title=\{estadoVazio\.title\} description=\{estadoVazio\.description\} \/>/,
    );
  });

  it("substitui a faixa mobile por filtro compacto e impede scroll horizontal", () => {
    assert.match(list, /aria-label="Filtrar Biblioteca"/);
    assert.match(list, /md:hidden/);
    assert.match(list, /contentClassName="overflow-x-hidden"/);
    assert.match(list, /data-biblioteca-list/);
    assert.doesNotMatch(list, /overflow-x-auto|overflow-x-scroll/);
  });

  it("protege títulos extensos e larguras entre 320 e 430 px", () => {
    assert.match(list, /min-w-0 flex-1 truncate text-sm/);
    assert.match(list, /max-w-\[42%\] shrink-0 truncate/);
    assert.match(list, /min-w-0 overflow-hidden/);
    assert.doesNotMatch(list, /min-w-\[(?:320|375|390|430)px\]/);
  });

  it("preserva tabela, cinco colunas, ações e densidade desktop em 768 px", () => {
    for (const coluna of ["Documento", "Tipo", "Associado a", "Data", "Ação"]) {
      assert.match(list, new RegExp(`<span>${coluna}</span>`));
    }
    assert.match(list, /-mx-1 hidden min-w-0 flex-1 basis-full items-center gap-0\.5 px-1 md:flex/);
    assert.match(list, /hidden min-h-8[\s\S]*md:grid/);
    assert.match(list, /md:grid-cols-\[minmax\(14rem,2fr\)/);
    assert.match(list, /formatarData\(documento\.data\)/);
    assert.match(list, /\{categoria\}[\s\S]*\{documento\.tipo\}/);
    assert.match(list, /<InstitutionalDocumentIntake documentoInicial=\{documento\} \/>/);
    assert.match(list, /md:inline-flex/);
  });
});
