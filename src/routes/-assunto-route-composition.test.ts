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
  const editorCriado = readFileSync(
    resolve(process.cwd(), "src/components/documentos/DocumentoCriadoDetalhe.tsx"),
    "utf8",
  );
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

  it("consolida estado, recomendações e ações num único bloco de próxima ação", () => {
    assert.equal((index.match(/>\s*Próxima ação\s*</g) ?? []).length, 1);
    assert.match(index, /\{estadoUx\.titulo\}/);
    assert.match(index, /\{estadoUx\.descricao\}/);
    assert.match(index, /Situação atual: \{estadoUx\.estadoResumido\}/);
    assert.match(index, /estadoUx\.recomendacoes\.map/);
    assert.match(index, /renderAcao\(estadoUx\.acaoPrincipal, true\)/);
    assert.match(index, /estadoUx\.acoesSecundarias\.map/);
    assert.doesNotMatch(index, /title="Assistente"/);
    assert.doesNotMatch(index, /Seguimento do assunto|Estado e próxima ação/);
  });

  it("rota canónica compõe o detalhe documental e as antigas redirecionam", () => {
    assert.match(editor, /createFileRoute\("\/_app\/documentos\/\$documentoId"\)/);
    assert.doesNotMatch(editor, /DossieDocumentosCriadosSection|function DossieDetalhePage/);
    assert.match(editor, /DocumentoCriadoDetalhe/);
    assert.match(editor, /DocumentoRecebidoDetalhe/);
    assert.match(legado, /to="\/documentos\/\$documentoId\?origem=assunto/);
    assert.match(legadoDossie, /to="\/documentos\/\$documentoId\?origem=assunto/);
    assert.match(legadoSessao, /to="\/documentos\/\$documentoId\?origem=sessao/);
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
    assert.match(editorCriado, /A carregar documento\.\.\./);
    assert.match(editorCriado, /Tentar novamente/);
    assert.match(editorCriado, /O documento não foi encontrado\./);
    assert.doesNotMatch(editorCriado, /if \(!documento\) \{\s+return null;/);
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

  it("Novo Assunto é um formulário único com apenas tema, contexto e objetivo", () => {
    assert.match(novoAssunto, /<form[\s\S]*onSubmit=/);
    assert.match(novoAssunto, />Qual é o tema\?<\/Label>/);
    assert.match(novoAssunto, />O que está em causa\?<\/Label>/);
    assert.match(novoAssunto, />O que pretende alcançar\?<\/Label>/);
    assert.match(novoAssunto, /id="novo-assunto-tema"[\s\S]*required/);
    assert.equal((novoAssunto.match(/\brequired\b/g) ?? []).length, 1);
    assert.doesNotMatch(novoAssunto, /Progress|Passo [123]|Seguinte|Voltar|<Select|Nota inicial/);
  });

  it("Novo Assunto preserva defaults, conteúdo, tentativa estável, erros e navegação", () => {
    assert.match(novoAssunto, /const dadosValidos = titulo\.trim\(\)\.length > 0/);
    assert.match(novoAssunto, /if \(!dadosValidos \|\| guardarEmCurso\.current\) return/);
    assert.match(novoAssunto, /tentativaId\.current \?\?= `dossie-\$\{crypto\.randomUUID\(\)\}`/);
    assert.match(novoAssunto, /prioridade: "Média"/);
    assert.match(novoAssunto, /tags: \["outro"\]/);
    assert.match(novoAssunto, /resumo: resumo\.trim\(\)/);
    assert.match(novoAssunto, /objetivoPolitico: objetivoPolitico\.trim\(\)/);
    assert.match(novoAssunto, /Os dados introduzidos foram mantidos/);
    assert.match(
      novoAssunto,
      /navigate\(\{ to: "\/assuntos\/\$dossieId", params: \{ dossieId: assunto\.id \} \}\)/,
    );
  });

  it("um Assunto sem documentos mostra primeiro a ação documental sem exigir sessão", () => {
    assert.match(documentosAssunto, /documentos\.length === 0 \? "Próxima ação"/);
    assert.match(documentosAssunto, />\s*O que pretende fazer\?\s*<\/legend>/);
    assert.match(
      documentosAssunto,
      /O documento pode ser preparado agora e associado a uma sessão mais tarde/,
    );
    assert.match(
      documentosAssunto,
      /sessoesRelacionadas\.length === 1 \? sessoesRelacionadas\[0\]\.assembleiaId : undefined/,
    );
    assert.match(documentosAssunto, /"Moção"[\s\S]*"Recomendação"[\s\S]*"Requerimento"/);
    assert.match(documentosAssunto, /"Intervenção"[\s\S]*"Outro documento"/);

    const visaoGeral = index.indexOf('id="visao-geral"');
    const proximaAcao = index.indexOf('id="documentos-assunto"');
    const relacoes = index.indexOf('id="relacoes-assunto"');
    assert.ok(visaoGeral >= 0 && visaoGeral < proximaAcao);
    assert.ok(proximaAcao < relacoes);
  });
});
