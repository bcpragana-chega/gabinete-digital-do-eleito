import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { construirPromptDocumento } from "@/lib/ai/prompts/documents";
import { construirBaseJuridicaInstitucional } from "@/lib/ai/legal-basis";
import { resolveInstitutionalContext } from "@/lib/ai/institutional-context";
import {
  criarHtmlDocumentoInstitucional,
  normalizarGrupoPolitico,
  obterDadosInstitucionais,
  resolverDataInstitucionalDocumento,
  resolverOrgaoInstitucional,
  validarDocumentoInstitucional,
  type ContextoDocumentoInstitucional,
} from "@/lib/documentos-institucionais";
import type { ContextoGeracaoDocumento } from "@/lib/ai/types";
import type { PerfilEleito } from "@/lib/auth-store";

const contexto: ContextoDocumentoInstitucional = {
  assembleia: {
    nome: "Sessão ordinária",
    tipo: "ordinaria",
    orgao: "Assembleia de Freguesia de Porches",
    data: "2026-07-13",
    local: "Porches",
  },
  nomeEleito: "Benjamin Cruz Pragana",
};

const recomendacao = {
  tipo: "Recomendação" as const,
  titulo: "Iluminação pública",
  conteudo: `## ENQUADRAMENTO

Na Rua da Igreja existem três candeeiros apagados.

## FUNDAMENTAÇÃO

A situação reduz a iluminação do percurso pedonal.

## RECOMENDAÇÃO

1. Reparar os três candeeiros.
2. Verificar a restante iluminação.

a) Comunicar o calendário de intervenção.
b) Publicar a conclusão dos trabalhos.`,
};

function perfil(overrides: Partial<PerfilEleito> = {}): PerfilEleito {
  return {
    nomeInstitucional: "Benjamin Cruz Pragana",
    cargo: "Membro da Assembleia de Freguesia",
    orgao: "Assembleia de Freguesia",
    organizacao: "Chega!",
    territorio: "Porches",
    municipio: "Lagoa",
    freguesia: "Porches",
    updatedAt: "2026-07-13T10:00:00.000Z",
    ...overrides,
  };
}

describe("validação e composição institucional", () => {
  it("usa a data da Sessão associada em vez da criação ou geração", () => {
    const resultado = resolverDataInstitucionalDocumento(
      {
        ...contexto,
        assembleia: { ...contexto.assembleia!, data: "2026-07-30" },
      },
      new Date("2026-07-13T10:00:00Z"),
    );
    assert.deepEqual(resultado, {
      data: "2026-07-30",
      dataFormatada: "30 de julho de 2026",
      origem: "sessao",
      provisoria: false,
    });
    assert.doesNotMatch(resultado.dataFormatada, /13 de julho/);
  });

  it("não usa generatedAt nem created_at para substituir a data da Sessão", () => {
    const contextoComDatasAlheias = {
      ...contexto,
      assembleia: { ...contexto.assembleia!, data: "2026-07-30" },
      generatedAt: "2026-07-13T09:00:00Z",
      created_at: "2026-07-13T08:00:00Z",
    };
    assert.equal(
      resolverDataInstitucionalDocumento(contextoComDatasAlheias).dataFormatada,
      "30 de julho de 2026",
    );
  });

  it("sem Sessão usa uma data provisória explícita", () => {
    const resultado = resolverDataInstitucionalDocumento(
      undefined,
      new Date("2026-07-13T12:00:00Z"),
    );
    assert.equal(resultado.dataFormatada, "13 de julho de 2026");
    assert.equal(resultado.origem, "provisoria");
    assert.equal(resultado.provisoria, true);
  });

  it("associar e remover a Sessão alterna entre data definitiva e provisória", () => {
    const agora = new Date("2026-07-13T12:00:00Z");
    const associada = resolverDataInstitucionalDocumento(
      { ...contexto, assembleia: { ...contexto.assembleia!, data: "2026-07-30" } },
      agora,
    );
    const removida = resolverDataInstitucionalDocumento(undefined, agora);
    const reaberta = resolverDataInstitucionalDocumento(
      { ...contexto, assembleia: { ...contexto.assembleia!, data: "2026-07-30" } },
      agora,
    );
    assert.equal(associada.dataFormatada, "30 de julho de 2026");
    assert.equal(removida.provisoria, true);
    assert.deepEqual(reaberta, associada);
  });

  it("o editor mostra o aviso fora do conteúdo quando a data é provisória", () => {
    const source = readFileSync(
      new URL("../components/documentos/InstitutionalDocumentEditor.tsx", import.meta.url),
      "utf8",
    );
    assert.match(source, /Data provisória — associe este documento a uma Sessão/);
    assert.doesNotMatch(recomendacao.conteudo, /Data provisória/);
  });

  it("HTML e restantes compositores recebem a mesma data resolvida", () => {
    const contextoSessao = {
      ...contexto,
      assembleia: { ...contexto.assembleia!, data: "2026-07-30" },
    };
    const dados = obterDadosInstitucionais(contextoSessao);
    const html = criarHtmlDocumentoInstitucional(recomendacao, contextoSessao);
    assert.equal(dados.data, "30 de julho de 2026");
    assert.equal(dados.dataOrigem, "sessao");
    assert.equal((html.match(/30 de julho de 2026/g) ?? []).length, 1);
  });

  it("resolve o órgão do perfil sem usar organização partidária", () => {
    assert.deepEqual(resolverOrgaoInstitucional({ perfil: perfil() }), {
      nome: "Assembleia de Freguesia de Porches",
      origem: "perfil",
    });
  });

  it("organização partidária sem órgão válido não se transforma em órgão", () => {
    const resultado = resolverOrgaoInstitucional({
      perfil: perfil({ orgao: "Outro", cargo: "Outro", organizacao: "Chega!" }),
    });
    assert.equal(resultado.nome, undefined);
  });

  it("partido nunca é usado como órgão", () => {
    const contextoComPartido = {
      perfil: perfil({ orgao: "Outro", cargo: "Outro", organizacao: "" }),
      partido: "CHEGA",
    };
    const resultado = resolverOrgaoInstitucional(contextoComPartido);
    assert.equal(resultado.nome, undefined);
  });

  it("prioriza o órgão explicitamente associado à Sessão", () => {
    const resultado = resolverOrgaoInstitucional({
      perfil: perfil({ orgao: "Assembleia Municipal", territorio: "Lagoa" }),
      assembleia: contexto.assembleia,
    });
    assert.equal(resultado.nome, "Assembleia de Freguesia de Porches");
    assert.equal(resultado.origem, "sessao");
  });

  it("normaliza placeholders de grupo político e conserva um valor real", () => {
    assert.equal(normalizarGrupoPolitico(""), undefined);
    assert.equal(normalizarGrupoPolitico("   "), undefined);
    assert.equal(normalizarGrupoPolitico("Grupo político"), undefined);
    assert.equal(normalizarGrupoPolitico("grupo politico"), undefined);
    assert.equal(normalizarGrupoPolitico("CHEGA"), "CHEGA");
  });

  it("apresenta o órgão e não o substitui pelo partido", () => {
    const html = criarHtmlDocumentoInstitucional(recomendacao, { perfil: perfil() });
    assert.match(html, /Assembleia de Freguesia de Porches/i);
    assert.doesNotMatch(html, />\s*Chega!\s*</i);
  });

  for (const [placeholder, esperado] of [
    ["Texto por preencher.", "conteúdo por preencher"],
    ["[data]", "data"],
    ["___ de __________ de 2026", "data"],
  ] as const) {
    it(`deteta o placeholder ${placeholder}`, () => {
      const resultado = validarDocumentoInstitucional(
        { ...recomendacao, conteudo: `${recomendacao.conteudo}\n${placeholder}` },
        contexto,
      );
      assert.equal(resultado.pronto, false);
      assert.ok(resultado.erros.some((erro) => erro.includes(esperado)));
    });
  }

  it("omite grupo político vazio e compõe data e proponente uma única vez", () => {
    const html = criarHtmlDocumentoInstitucional(recomendacao, contexto);
    assert.doesNotMatch(html, /<p class="grupo-politico">/);
    assert.equal((html.match(/Porches,\s*13 de julho de 2026/g) ?? []).length, 1);
    assert.equal((html.match(/Benjamin Cruz Pragana/g) ?? []).length, 1);
  });

  it("apresenta apenas o valor real do grupo político", () => {
    const html = criarHtmlDocumentoInstitucional(recomendacao, {
      ...contexto,
      grupoPolitico: "CHEGA",
    });
    assert.match(html, /<p class="grupo-politico">CHEGA<\/p>/);
    assert.doesNotMatch(html, /Grupo político/);
  });

  it("falha a validação quando não existe órgão obrigatório resolvido", () => {
    const resultado = validarDocumentoInstitucional(recomendacao, {
      perfil: perfil({ orgao: "Outro", cargo: "Outro", organizacao: "Chega!" }),
    });
    assert.equal(resultado.pronto, false);
    assert.ok(resultado.erros.some((erro) => erro.includes("órgão institucional")));
  });

  it("não altera o conteúdo substantivo durante a composição", () => {
    const original = recomendacao.conteudo;
    const html = criarHtmlDocumentoInstitucional(recomendacao, contexto);
    assert.equal(recomendacao.conteudo, original);
    assert.match(html, /Na Rua da Igreja existem três candeeiros apagados\./);
    assert.match(html, /A situação reduz a iluminação do percurso pedonal\./);
  });

  it("deteta rodapé institucional produzido pela IA", () => {
    const resultado = validarDocumentoInstitucional(
      { ...recomendacao, conteudo: `${recomendacao.conteudo}\n\nProponente:\nNome duplicado` },
      contexto,
    );
    assert.equal(resultado.pronto, false);
    assert.ok(resultado.erros.some((erro) => erro.includes("rodapé institucional")));
  });

  it("deteta data e identificação do proponente produzidas pela IA", () => {
    const resultado = validarDocumentoInstitucional(
      {
        ...recomendacao,
        conteudo: `${recomendacao.conteudo}\n\nPorches, 13 de julho de 2026\n\nBenjamin Cruz Pragana`,
      },
      contexto,
    );
    assert.equal(resultado.pronto, false);
    assert.ok(resultado.erros.some((erro) => erro.includes("data institucional")));
    assert.ok(resultado.erros.some((erro) => erro.includes("identificação do proponente")));
  });

  it("preserva listas numeradas e alíneas na composição", () => {
    const html = criarHtmlDocumentoInstitucional(recomendacao, contexto);
    assert.match(html, /<li>Reparar os três candeeiros\.<\/li>/);
    assert.match(html, /a\) Comunicar o calendário de intervenção\./);
    assert.match(html, /b\) Publicar a conclusão dos trabalhos\./);
  });

  it("instrui a IA a gerar apenas conteúdo substantivo", () => {
    const perfil = {
      nome: "Eleito",
      cargo: "Membro da Assembleia de Freguesia",
      orgao: "Assembleia de Freguesia",
      organizacao: "",
      municipio: "Lagoa",
      freguesia: "Porches",
    };
    const baseJuridica = construirBaseJuridicaInstitucional({
      perfil,
      tipoDocumental: "Recomendação",
    });
    const institutionalContext = resolveInstitutionalContext({
      electedOfficialId: "user",
      perfil,
      tipoDocumental: "Recomendação",
      baseJuridica,
    });
    const prompt = construirPromptDocumento({
      entrada: {
        assuntoId: "assunto-a",
        tipo: "Recomendação",
        titulo: "Iluminação pública",
        conteudoInicial: "",
      },
      perfil,
      assunto: {
        id: "assunto-a",
        titulo: "Iluminação pública",
        tags: [],
        notas: [],
        timeline: [],
        historico: [],
      },
      documentosRelacionados: [],
      anexosTextuais: [],
      factosEspecificos: [
        { origem: "assunto", campo: "descricao", resumo: "Três candeeiros apagados." },
      ],
      baseJuridica,
      institutionalContext,
    } satisfies ContextoGeracaoDocumento);

    assert.match(prompt, /FACTOS ESPECÍFICOS DO ASSUNTO/);
    assert.match(prompt, /Três candeeiros apagados/);
    assert.match(prompt, /Não escrevas cabeçalho, órgão, partido/);
    assert.match(prompt, /Não incluas cabeçalho institucional, título geral, local\/data/);
  });
});
