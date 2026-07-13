import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

function fonte(nome: string) {
  return readFileSync(resolve(process.cwd(), "src/routes", nome), "utf8");
}

describe("composição das rotas de Assunto", () => {
  const layout = fonte("_app.assuntos.$dossieId.tsx");
  const index = fonte("_app.assuntos.$dossieId.index.tsx");
  const editor = fonte("_app.documentos.$documentoId.tsx");
  const documentosAssunto = readFileSync(
    resolve(process.cwd(), "src/components/dossies/DossieDocumentosCriadosSection.tsx"),
    "utf8",
  );
  const sessao = fonte("_app.sessoes.$id.tsx");
  const novoAssunto = readFileSync(
    resolve(process.cwd(), "src/components/dossies/NovoAssuntoWizard.tsx"),
    "utf8",
  );
  const relacionados = readFileSync(
    resolve(process.cwd(), "src/components/dossies/DossieRelacionadosSection.tsx"),
    "utf8",
  );
  const legado = fonte("_app.assuntos.$dossieId.documentos.$documentoId.tsx");
  const legadoDossie = fonte("_app.dossies.$dossieId.documentos.$documentoId.tsx");
  const legadoSessao = fonte("_app.sessoes.$id.preparacao.documentos-a-criar.$rascunhoId.tsx");

  it("rota-pai é exclusivamente um layout com Outlet", () => {
    assert.match(layout, /return <Outlet \/>/);
    assert.doesNotMatch(layout, /DossieDocumentosCriadosSection|WorkspaceLayout|DossieDetalhePage/);
  });

  it("detalhe completo do Assunto está na rota index", () => {
    assert.match(index, /createFileRoute\("\/_app\/assuntos\/\$dossieId\/"\)/);
    assert.match(index, /component: DossieDetalhePage/);
    assert.match(index, /<DossieDocumentosCriadosSection dossieId=\{dossie\.id\}/);
  });

  it("rota canónica monta apenas o editor documental e a antiga redireciona", () => {
    assert.match(editor, /createFileRoute\("\/_app\/documentos\/\$documentoId"\)/);
    assert.doesNotMatch(editor, /DossieDocumentosCriadosSection|function DossieDetalhePage/);
    assert.match(legado, /to="\/documentos\/\$documentoId"/);
    assert.match(legadoDossie, /to="\/documentos\/\$documentoId"/);
    assert.match(legadoSessao, /to="\/documentos\/\$documentoId"/);
  });

  it("criação confirmada abre o editor canónico e bloqueia cliques repetidos", () => {
    assert.match(documentosAssunto, /const criacaoEmCurso = useRef\(false\)/);
    assert.match(documentosAssunto, /if \(!user\?\.id \|\| criacaoEmCurso\.current\) return/);
    assert.match(documentosAssunto, /criacaoEmCurso\.current = true/);
    assert.match(
      documentosAssunto,
      /to: "\/documentos\/\$documentoId",\s+params: \{ documentoId: response\.documento\.id \}/,
    );
    const respostaPersistida = documentosAssunto.indexOf(
      "const response = (await gerarDocumentoAssistido",
    );
    const sucesso = documentosAssunto.indexOf(
      'setSucesso("Documento preparado e guardado. Já pode abri-lo para revisão.")',
    );
    const navegacao = documentosAssunto.indexOf("params: { documentoId: response.documento.id }");
    assert.ok(respostaPersistida >= 0);
    assert.ok(sucesso > respostaPersistida);
    assert.ok(navegacao > sucesso);
  });

  it("editor apresenta loading e estados recuperáveis em vez de página vazia", () => {
    assert.match(editor, /A carregar documento\.\.\./);
    assert.match(editor, /Tentar novamente/);
    assert.match(editor, /O documento não foi encontrado\./);
    assert.doesNotMatch(editor, /if \(!documento\) \{\s+return null;/);
  });

  it("permite navegar Sessão → Assunto → Sessão e criar um Assunto já associado", () => {
    assert.match(sessao, /<NovoAssuntoWizard assembleiaId=\{id\} \/>/);
    assert.match(sessao, /to="\/assuntos\/\$dossieId"/);
    assert.match(relacionados, /to="\/sessoes\/\$id" params=\{\{ id: assembleia\.id \}\}/);
    assert.match(relacionados, /assembleiasUnicas\(useAssembleias\(\)\)/);
    assert.match(
      novoAssunto,
      /if \(assembleiaId\) await associarAssembleiaAoDossie\(assunto\.id, assembleiaId\)/,
    );
  });
});
