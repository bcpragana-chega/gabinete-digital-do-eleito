import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  carregarDocumentoParaAnaliseComDependencias,
  confirmarAnaliseDocumentoComDependencias,
  confirmarDocumentoNaBibliotecaComDependencias,
  confirmarSessaoValidadaComDependencias,
  corrigirCampoSessao,
  decidirDestinoAnalise,
  destinoPreparaSessao,
  executarConfirmacaoAnaliseComDependencias,
  LIMIAR_CONFIANCA_DESTINO_DOCUMENTAL,
  mapearTipoDocumentoInstitucional,
  obterIncertezaCampoSessao,
  prepararAnaliseParaConfirmacaoSessao,
  temCamposEssenciaisIncertos,
  validarCamposConfirmacaoSessao,
  validarDadosConfirmacaoAnalise,
  validarResultadoConfirmacaoAnalise,
} from "./institutional-document-flow";
import { normalizarAnaliseDocumentoInstitucional } from "./ai/institutional-document-analysis";
import type { AnaliseDocumentoInstitucional, Documento, TipoDocumentoInstitucional } from "./types";

const component = readFileSync(
  new URL("../components/documentos/InstitutionalDocumentIntake.tsx", import.meta.url),
  "utf8",
);
const migration = readFileSync(
  new URL("../../supabase/migrations/20260713_institutional_document_wow_p0.sql", import.meta.url),
  "utf8",
);
const sessionRoute = readFileSync(
  new URL("../routes/_app.sessoes.$id.tsx", import.meta.url),
  "utf8",
);

function analise(
  sessao: AnaliseDocumentoInstitucional["sessao"],
  pontos: AnaliseDocumentoInstitucional["pontosOrdemTrabalhos"] = [],
): AnaliseDocumentoInstitucional {
  return {
    tipoDocumento: "convocatoria",
    confiancaGlobal: 0.9,
    sessao,
    pontosOrdemTrabalhos: pontos,
    informacaoRelevante: [],
    camposIncertos: [],
    resumoCompreensao: "Convocatória identificada.",
  };
}

function analiseTipo(
  tipoDocumento: TipoDocumentoInstitucional,
  options: Partial<AnaliseDocumentoInstitucional> = {},
): AnaliseDocumentoInstitucional {
  return {
    ...analise({
      orgao: "Assembleia Municipal de Lagoa",
      data: "2026-07-29",
      hora: "21:00",
    }),
    tipoDocumento,
    ...options,
  };
}

describe("confirmação institucional", () => {
  it("preserva data e local canónicos desde a análise normalizada até à revisão", () => {
    const local = "Centro Cultural D. Dinis, Rua João Silva, nº 10, 1.º andar";
    const normalizada = normalizarAnaliseDocumentoInstitucional(
      analiseTipo("convocatoria", {
        sessao: {
          orgao: "Órgão Deliberativo",
          data: "2026-06-30",
          hora: "21:00",
          local,
        },
      }),
    );
    assert.equal(normalizada.sessao?.data, "2026-06-30");
    assert.equal(normalizada.sessao?.local, local);
    assert.match(component, /type="date"[\s\S]*value=\{sessao\.data \?\? ""\}/);
    assert.match(component, /<Textarea[\s\S]*value=\{sessao\.local \?\? ""\}/);
  });

  it("decide deterministicamente o destino com limiar explícito", () => {
    assert.equal(LIMIAR_CONFIANCA_DESTINO_DOCUMENTAL, 0.75);
    assert.equal(decidirDestinoAnalise(analiseTipo("convocatoria")), "preparar_sessao");
    assert.equal(decidirDestinoAnalise(analiseTipo("ordem_trabalhos")), "preparar_sessao");
    for (const tipo of ["ata", "regulamento", "proposta"] as const) {
      assert.equal(decidirDestinoAnalise(analiseTipo(tipo)), "guardar_biblioteca");
    }
    assert.equal(decidirDestinoAnalise(analiseTipo("desconhecido")), "confirmar_dados_documento");
    assert.equal(
      decidirDestinoAnalise(
        analiseTipo("ata", { confiancaGlobal: LIMIAR_CONFIANCA_DESTINO_DOCUMENTAL - 0.01 }),
      ),
      "confirmar_dados_documento",
    );
  });

  it("convocatória reconhecida com órgão incerto mantém o destino Sessão", () => {
    const destino = decidirDestinoAnalise(
      analiseTipo("convocatoria", {
        camposIncertos: [{ campo: "órgão", motivo: "designação parcialmente ilegível" }],
      }),
    );
    assert.equal(destino, "confirmar_dados_sessao");
    assert.equal(destinoPreparaSessao(destino), true);
  });

  it("data ou hora em falta pede confirmação de Sessão e campos opcionais não bloqueiam", () => {
    for (const sessao of [
      { orgao: "Câmara", hora: "21:00" },
      { orgao: "Câmara", data: "2026-07-29" },
    ]) {
      assert.equal(
        decidirDestinoAnalise(analiseTipo("convocatoria", { sessao })),
        "confirmar_dados_sessao",
      );
    }
    assert.equal(
      decidirDestinoAnalise(
        analiseTipo("convocatoria", {
          camposIncertos: [{ campo: "local", motivo: "não indicado" }],
        }),
      ),
      "preparar_sessao",
    );
    assert.equal(
      decidirDestinoAnalise(
        analiseTipo("ata", {
          camposIncertos: [{ campo: "valor da deliberação", motivo: "ilegível" }],
        }),
      ),
      "guardar_biblioteca",
    );
    assert.equal(temCamposEssenciaisIncertos(analiseTipo("ata")), false);
  });

  it("depois da correção dos campos usa a confirmação RPC de Sessão", async () => {
    const incompleta = analiseTipo("convocatoria", {
      sessao: { orgao: "", data: "2026-06-30", hora: "" },
      camposIncertos: [{ campo: "órgão", motivo: "ilegível" }],
    });
    assert.equal(decidirDestinoAnalise(incompleta), "confirmar_dados_sessao");

    const corrigida: AnaliseDocumentoInstitucional = {
      ...incompleta,
      sessao: {
        ...incompleta.sessao,
        orgao: "Assembleia Municipal de Lagoa",
        hora: "21:00",
      },
    };
    assert.equal(validarDadosConfirmacaoAnalise(corrigida), undefined);
    let chamadasRpc = 0;
    await executarConfirmacaoAnaliseComDependencias({
      confirmar: async () => {
        chamadasRpc += 1;
        return { status: "confirmado", sessaoId: "sessao-1", pontosCriados: 2 };
      },
      onDuplicado: () => undefined,
      onConfirmado: () => undefined,
    });
    assert.equal(chamadasRpc, 1);
  });

  it("assinala e retira a incerteza essencial depois de uma correção válida", () => {
    const incerta = analiseTipo("convocatoria", {
      sessao: { orgao: "Órgão Deliberativo", data: "2026-06-30", hora: "21:00" },
      camposIncertos: [{ campo: "órgão", motivo: "Confirmar a designação oficial." }],
    });
    assert.equal(
      obterIncertezaCampoSessao(incerta, "orgao")?.motivo,
      "Confirmar a designação oficial.",
    );
    const corrigida = corrigirCampoSessao(incerta, "orgao", "Assembleia de Freguesia de Porches");
    assert.equal(obterIncertezaCampoSessao(corrigida, "orgao"), undefined);
    assert.equal(corrigida.sessao?.orgao, "Assembleia de Freguesia de Porches");
  });

  it("envia à RPC a data ISO validada sem alterar o local", async () => {
    const local = "Centro Cultural D. Dinis, Rua João Silva, nº 10, 1.º andar";
    const value = analiseTipo("convocatoria", {
      sessao: {
        orgao: "Assembleia de Freguesia de Porches",
        data: "2026-06-30",
        hora: "21:00",
        local,
      },
    });
    let payload: AnaliseDocumentoInstitucional | undefined;
    await confirmarSessaoValidadaComDependencias({
      analise: value,
      agora: new Date("2026-07-19T12:00:00Z"),
      confirmar: async (analiseValidada) => {
        payload = analiseValidada;
        return undefined;
      },
    });
    assert.equal(payload?.sessao?.data, "2026-06-30");
    assert.equal(payload?.sessao?.local, local);
  });

  it("não chama a RPC com ano implausível ou data inexistente", async () => {
    let chamadas = 0;
    for (const data of ["3066-06-30", "2026-02-30"]) {
      await assert.rejects(
        confirmarSessaoValidadaComDependencias({
          analise: analiseTipo("convocatoria", {
            sessao: { orgao: "Assembleia Municipal", data, hora: "21:00" },
          }),
          agora: new Date("2026-07-19T12:00:00Z"),
          confirmar: async () => {
            chamadas += 1;
          },
        }),
      );
    }
    assert.equal(chamadas, 0);
    assert.match(
      validarCamposConfirmacaoSessao(
        analiseTipo("convocatoria", {
          sessao: { orgao: "Assembleia Municipal", data: "3066-06-30", hora: "21:00" },
        }),
        new Date("2026-07-19T12:00:00Z"),
      ).data ?? "",
      /2046/,
    );
  });

  it("mantém datas históricas válidas e prepara o payload canónico", () => {
    const preparada = prepararAnaliseParaConfirmacaoSessao(
      analiseTipo("convocatoria", {
        sessao: { orgao: "Assembleia Municipal", data: "1974-04-25", hora: "21:00" },
      }),
      new Date("2026-07-19T12:00:00Z"),
    );
    assert.equal(preparada.sessao?.data, "1974-04-25");
  });

  it("mapeia todos os tipos institucionais sem inventar granularidade", () => {
    assert.deepEqual(
      Object.fromEntries(
        (
          [
            "convocatoria",
            "ordem_trabalhos",
            "ata",
            "documento_financeiro",
            "proposta",
            "regulamento",
            "outro",
            "desconhecido",
          ] as TipoDocumentoInstitucional[]
        ).map((tipo) => [tipo, mapearTipoDocumentoInstitucional(tipo)]),
      ),
      {
        convocatoria: "Convocatória",
        ordem_trabalhos: "Outro",
        ata: "Ata",
        documento_financeiro: "Outro",
        proposta: "Proposta",
        regulamento: "Regulamento",
        outro: "Outro",
        desconhecido: "Outro",
      },
    );
  });

  it("confirma um documento geral atualizando o mesmo ID sem RPC de sessão", async () => {
    const documento: Documento = {
      id: "doc-existente",
      assembleiaId: "biblioteca",
      titulo: "ficheiro",
      tipo: "Outro",
      data: "2026-07-19",
      estado: "Por rever",
      createdAt: "2026-07-19T10:00:00Z",
    };
    let idGuardado = "";
    let alteracoes: Partial<Documento> | undefined;
    const guardado = await confirmarDocumentoNaBibliotecaComDependencias({
      documento,
      analise: analiseTipo("ata", { resumoCompreensao: "Resumo da ata." }),
      titulo: "Ata de julho",
      tipo: "Ata",
      guardar: async (id, input) => {
        idGuardado = id;
        alteracoes = input;
        return { ...documento, ...input, id };
      },
    });
    assert.equal(idGuardado, documento.id);
    assert.equal(guardado.id, documento.id);
    assert.equal(alteracoes?.resumo, "Resumo da ata.");
    assert.equal(alteracoes?.estadoAnalise, "confirmado");
  });

  it("guarda baixa confiança por rever e a interface abre a rota canónica da Biblioteca", async () => {
    const documento = {
      id: "doc-incerto",
      assembleiaId: "biblioteca",
      titulo: "ficheiro",
      tipo: "Outro" as const,
      data: "2026-07-19",
      estado: "Por rever" as const,
      createdAt: "2026-07-19T10:00:00Z",
    };
    let alteracoes: Partial<Documento> | undefined;
    await confirmarDocumentoNaBibliotecaComDependencias({
      documento,
      analise: analiseTipo("desconhecido", { confiancaGlobal: 0.2 }),
      titulo: "Documento por identificar",
      tipo: "Outro",
      guardar: async (id, input) => {
        alteracoes = input;
        return { ...documento, ...input, id };
      },
    });
    assert.equal(alteracoes?.estado, "Por rever");
    assert.equal(alteracoes?.estadoAnalise, "necessita_confirmacao");
    assert.match(component, /to: "\/documentos\/\$documentoId"/);
    assert.match(component, /search: \{ origem: "biblioteca" \}/);
  });
  it("PDF válido é carregado diretamente para análise", async () => {
    const file = new File(["%PDF-"], "convocatoria.pdf", { type: "application/pdf" });
    let received: Record<string, unknown> | undefined;
    await carregarDocumentoParaAnaliseComDependencias(file, async (input) => {
      received = input as unknown as Record<string, unknown>;
      return { ...input, id: "doc-1", createdAt: "agora", assembleiaId: "biblioteca" };
    });
    assert.equal(received?.estadoAnalise, "a_analisar");
    assert.equal(received?.ficheiro, file);
    assert.equal(received?.assembleiaId, "biblioteca");
  });
  it("não cria sessão antes da confirmação explícita", () => {
    assert.match(component, /Confirmar e preparar sessão/);
    assert.doesNotMatch(component, /adicionarAssembleia\(/);
  });

  it("aceita análise válida com sessão e pontos pela ordem recebida", () => {
    const value = analise(
      {
        orgao: "Assembleia de Freguesia de Porches",
        entidade: "Freguesia de Porches",
        tipo: "ordinaria",
        data: "2026-07-28",
        hora: "18:30",
        local: "Auditório",
      },
      [
        { numero: 1, titulo: "Primeiro ponto", confianca: 0.9 },
        { numero: 2, titulo: "Segundo ponto", confianca: 0.8 },
      ],
    );
    assert.equal(validarDadosConfirmacaoAnalise(value), undefined);
    assert.deepEqual(
      value.pontosOrdemTrabalhos.map((ponto) => ponto.titulo),
      ["Primeiro ponto", "Segundo ponto"],
    );
  });

  it("aceita análise parcial sem local e sem pontos", () => {
    assert.equal(
      validarDadosConfirmacaoAnalise(
        analise({
          orgao: "Assembleia Municipal de Lagoa",
          tipo: "desconhecida",
          data: "2026-07-29",
          hora: "21:00",
        }),
      ),
      undefined,
    );
  });

  it("valida órgão, data real e hora antes da confirmação", () => {
    const base = {
      orgao: "Assembleia Municipal de Lagoa",
      data: "2026-07-29",
      hora: "21:00",
    };
    assert.ok(validarCamposConfirmacaoSessao(analise({ ...base, orgao: "" })).orgao);
    assert.ok(validarCamposConfirmacaoSessao(analise({ ...base, data: "2026-02-30" })).data);
    assert.ok(validarCamposConfirmacaoSessao(analise({ ...base, data: "29-07-2026" })).data);
    assert.ok(validarCamposConfirmacaoSessao(analise({ ...base, hora: "25:00" })).hora);
  });

  it("confirma apenas uma resposta RPC válida com sessaoId e hidrata antes de devolver", async () => {
    const ordem: string[] = [];
    const result = await confirmarAnaliseDocumentoComDependencias(
      async () => {
        ordem.push("rpc");
        return { status: "confirmado", sessaoId: "asm-1", pontosCriados: 2 };
      },
      async () => {
        ordem.push("hidratar");
      },
    );
    assert.deepEqual(result, { status: "confirmado", sessaoId: "asm-1", pontosCriados: 2 });
    assert.deepEqual(ordem, ["rpc", "hidratar"]);
    assert.throws(
      () => validarResultadoConfirmacaoAnalise({ status: "confirmado", pontosCriados: 2 }),
      /CONFIRMATION_NOT_CONFIRMED/,
    );
  });

  it("confirma sessão, pontos e documento na mesma RPC", () => {
    assert.match(migration, /insert into public\.assembleias/);
    assert.match(migration, /insert into public\.pontos/);
    assert.match(migration, /assembleia_origem_id = v_sessao_id/);
    assert.match(migration, /estado_analise = 'confirmado'/);
  });

  it("mantém a ordem SQL e não repete pontos já confirmados", () => {
    assert.match(migration, /for v_ponto in select value from jsonb_array_elements/);
    assert.match(migration, /select coalesce\(max\(numero\), 0\) \+ 1 into v_numero/);
    assert.match(migration, /if not exists \([\s\S]*lower\(trim\(titulo\)\) = lower\(v_titulo\)/);
  });

  it("possível duplicado não cria silenciosamente", () => {
    assert.match(migration, /'status', 'duplicado'/);
    assert.match(component, /Atualizar sessão existente/);
    assert.match(component, /Criar outra sessão/);
  });

  it("a função SQL é transacional e security invoker", () => {
    assert.match(migration, /language plpgsql security invoker/);
    assert.match(migration, /auth\.uid\(\)/);
  });

  it("a repetição da análise usa o documento existente", () => {
    assert.match(component, /analisarDocumentoCarregado\(documento\.id\)/);
  });

  it("falha de confirmação não executa navegação nem sucesso", async () => {
    let navegou = false;
    await assert.rejects(
      executarConfirmacaoAnaliseComDependencias({
        confirmar: async () => {
          throw new Error("RPC_FAILED");
        },
        onDuplicado: () => {
          navegou = true;
        },
        onConfirmado: () => {
          navegou = true;
        },
      }),
      /RPC_FAILED/,
    );
    assert.equal(navegou, false);
  });

  it("sucesso navega imediatamente para a sessão confirmada", async () => {
    let destino = "";
    await executarConfirmacaoAnaliseComDependencias({
      confirmar: async () => ({ status: "confirmado", sessaoId: "asm-1", pontosCriados: 0 }),
      onDuplicado: () => undefined,
      onConfirmado: (result) => {
        destino = `/sessoes/${result.sessaoId}`;
      },
    });
    assert.equal(destino, "/sessoes/asm-1");
    assert.match(component, /confirmacaoEmCurso\.current/);
  });

  it("não apresenta o resumo longo da IA no formulário de revisão", () => {
    const reviewForm = component.slice(component.indexOf("function ReviewForm"));
    assert.doesNotMatch(reviewForm, /resumoCompreensao/);
  });

  it("a chegada usa a próxima ação do motor determinístico", () => {
    assert.match(sessionRoute, /flow\.nextAction\.action/);
    assert.match(sessionRoute, /calcularFluxoSessao/);
  });
});
