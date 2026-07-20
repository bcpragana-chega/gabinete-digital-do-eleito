import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const layout = read("./_app.assuntos.$dossieId.tsx");
const detail = read("./_app.assuntos.$dossieId.index.tsx");
const assuntoUx = read("../lib/assunto-ux.ts");
const documents = read("../components/dossies/DossieDocumentosCriadosSection.tsx");
const relations = read("../components/dossies/DossieRelacionadosSection.tsx");
const notes = read("../components/dossies/DossieNotasSection.tsx");
const editor = read("../components/dossies/EditarDossieDialog.tsx");
const form = read("../components/dossies/DossieForm.tsx");
const mobileNavigation = read("../components/layout/mobile-navigation.ts");
const workspaceHeader = read("../components/ui/workspace/WorkspaceHeader.tsx");

describe("detalhe mobile do Assunto", () => {
  it("carrega o mesmo Assunto na rota canónica e mantém o layout-pai fino", () => {
    assert.match(layout, /createFileRoute\("\/_app\/assuntos\/\$dossieId"\)/);
    assert.match(layout, /return <Outlet \/>/);
    assert.match(detail, /createFileRoute\("\/_app\/assuntos\/\$dossieId\/"\)/);
    assert.match(detail, /const \{ dossieId \} = Route\.useParams\(\)/);
    assert.match(detail, /const dossie = useDossie\(dossieId\)/);
    for (const hook of [
      "useNotasDossie",
      "useEventosTimelineDossie",
      "useDocumentosDoDossie",
      "useAssembleiasDoDossie",
    ]) {
      assert.match(detail, new RegExp(`${hook}\\(dossieId\\)`));
    }
  });

  it("coloca título, estado, próxima ação e contexto no início visual mobile", () => {
    assert.match(detail, /mobileCompact/);
    assert.match(detail, /className="max-md:order-1 md:p-7"/);
    assert.match(workspaceHeader, /max-md:line-clamp-2/);
    assert.match(detail, /max-md:order-2 max-md:border-l-2/);
    assert.match(detail, />\s*Próxima ação\s*</);
    assert.match(detail, /id="contexto-assunto"[\s\S]*max-md:order-3/);
    assert.match(detail, /max-md:order-4[\s\S]*title="Objetivo"/);
    assert.match(detail, /max-md:order-5[\s\S]*<DossieNotasSection/);
  });

  it("reutiliza integralmente o motor existente da próxima ação", () => {
    assert.match(detail, /const estadoUx = calcularEstadoUxAssunto\(/);
    assert.match(detail, /title=\{estadoUx\.titulo\}/);
    assert.match(detail, /description=\{estadoUx\.descricao\}/);
    assert.match(detail, /renderAcao\(estadoUx\.acaoPrincipal, true\)/);
    assert.match(detail, /estadoUx\.acoesSecundarias\.map/);
    assert.match(assuntoUx, /export function calcularEstadoUxAssunto/);
    assert.match(assuntoUx, /acaoPrincipal: \{ tipo: "editar", label: "Completar objetivo" \}/);
    assert.match(assuntoUx, /label: "Abrir e rever"/);
    assert.match(assuntoUx, /label: "Preparar sessão"/);
  });

  it("preserva estado, prioridade, arquivo e metadados sem duplicar tags no topo mobile", () => {
    assert.match(detail, /estadoLabel\(dossie\.estado\)/);
    assert.match(detail, /prioridadeTone\(dossie\.prioridade\)/);
    assert.match(detail, /arquivado &&[\s\S]*Arquivado/);
    assert.match(detail, /dossie\.tags\.map/);
    assert.match(detail, /className="max-md:hidden"/);
    assert.match(detail, /id="estado-assunto"[\s\S]*max-md:order-9/);
  });

  it("torna documentos criados linhas compactas com abertura canónica e ações existentes", () => {
    assert.match(documents, /data-documento-assunto-mobile/);
    assert.match(documents, /to="\/documentos\/\$documentoId"/);
    assert.match(documents, /params=\{\{ documentoId: documento\.id \}\}/);
    assert.match(documents, /search=\{\{ origem: "assunto", assuntoId: dossieId \}\}/);
    assert.match(documents, /aria-label=\{`Abrir documento: \$\{documento\.titulo\}`\}/);
    assert.match(documents, /\{documento\.titulo\}[\s\S]*\{documento\.tipo\}/);
    assert.match(documents, /estadoLabel\(documento\.estado\)/);
    assert.match(documents, /Download PDF: \$\{documento\.titulo\}/);
    assert.match(documents, /Exportar para Word: \$\{documento\.titulo\}/);
  });

  it("mantém documentos recebidos, Sessões e referências a pontos acessíveis", () => {
    assert.match(relations, /data-relacoes-assunto-mobile/);
    assert.match(relations, /Documentos associados/);
    assert.match(relations, /to="\/documentos\/\$documentoId"/);
    assert.match(relations, /search=\{\{ origem: "assunto", assuntoId: dossieId \}\}/);
    assert.match(relations, /Sessões relacionadas/);
    assert.match(relations, /to="\/sessoes\/\$id" params=\{\{ id: assembleia\.id \}\}/);
    assert.match(documents, /metaAssociacao\(documento\)/);
    assert.match(documents, /documento\.pontoId/);
    assert.match(documents, /Associado ao ponto/);
  });

  it("preserva ações e edição com os mesmos handlers, validação e persistência", () => {
    assert.match(detail, /<EditarDossieDialog/);
    assert.match(detail, /onClick=\{\(\) => void arquivar\(\)\}/);
    assert.match(detail, /await arquivarDossie\(dossie\.id\)/);
    assert.match(editor, /await editarDossie\(dossie\.id, values\)/);
    assert.match(editor, /<DossieForm/);
    assert.match(form, /onSubmit/);
    assert.match(form, /className="[^"]*w-full/);
    assert.match(notes, /adicionarNotaDossie|editarNotaDossie|apagarNotaDossie/);
    assert.match(relations, /associarDocumento|associarAssembleia|desassociarDocumento/);
  });

  it("preserva estados vazios e o regresso mobile canónico", () => {
    assert.match(detail, /title="Assunto não encontrado"/);
    assert.match(detail, /to="\/assuntos"/);
    assert.match(documents, /Ainda não há documentos deste assunto\./);
    assert.match(relations, /Sem documentos reais associados\./);
    assert.match(relations, /Sem sessões ligadas\./);
    assert.match(notes, /Ainda não há notas neste assunto\./);
    assert.match(
      mobileNavigation,
      /if \(\/\^\\\/assuntos\\\/\[\^\/\]\+\$\/\.test\(pathname\)\) return "\/assuntos"/,
    );
  });

  it("bloqueia overflow e protege títulos e descrições longos entre 320 e 430 px", () => {
    assert.match(detail, /overflow-x-hidden/);
    assert.match(workspaceHeader, /max-md:line-clamp-2/);
    assert.match(documents, /min-w-0 flex-1 truncate text-sm/);
    assert.match(relations, /min-w-0 flex-1/);
    assert.match(relations, /truncate text-sm font-semibold/);
    assert.doesNotMatch(detail + documents + relations, /overflow-x-auto|overflow-x-scroll/);
    assert.doesNotMatch(detail, /min-w-\[(?:320|375|390|430)px\]/);
  });

  it("preserva ordem, painéis, ações e densidade desktop a partir de 768 px", () => {
    assert.match(detail, /mb-6 hidden[\s\S]*md:flex/);
    assert.match(detail, /md:p-7/);
    assert.match(detail, /bodyClassName="max-md:contents"/);
    assert.match(detail, /contentClassName="max-md:contents"/);
    assert.match(detail, /sidebarClassName="max-md:contents"/);
    assert.match(documents, /mt-5 hidden gap-3 md:grid/);
    assert.match(relations, /className="mt-4 space-y-4 md:hidden" data-relacoes-assunto-mobile/);

    const documentos = detail.indexOf('id="documentos-assunto"');
    const acompanhamento = detail.indexOf("<DossieAcompanhamentoSection");
    const contexto = detail.indexOf('id="estado-assunto"');
    const seguimento = detail.indexOf('title="Seguimento do assunto"');
    const relacoes = detail.indexOf('id="relacoes-assunto"');
    assert.ok(documentos < acompanhamento && acompanhamento < contexto);
    assert.ok(contexto < seguimento && seguimento < relacoes);
  });
});
