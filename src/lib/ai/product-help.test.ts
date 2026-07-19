import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  construirPromptAjuda,
  executarPedidoAjuda,
  registarResultadoAjuda,
} from "./product-help.server";
import {
  pedidoForaDoAmbito,
  respostaParaPedidoForaDoAmbito,
  resolverContextoAjuda,
  SYSTEM_PROMPT_AJUDA,
  type PedidoAjuda,
} from "./product-help";
import { pedidoAjudaSchema, productHelpPageStateSchema } from "./product-help-api";

const pedido = {
  accessToken: "token-seguro",
  pathname: "/assuntos/assunto-secreto",
  messages: [{ role: "user", content: "O que posso fazer aqui?" }],
  pageState: {
    emptyState: false,
    primaryAction: "Rever assunto",
    currentStatus: "Incompleto",
    nextStep: "Rever a próxima ação",
    visibleWarnings: ["Existe um passo incompleto"],
    summaryFacts: ["2 documentos associados"],
  },
} satisfies PedidoAjuda;

describe("Assistente de Ajuda do Tribuno", () => {
  it("converte rotas em contexto controlado sem expor identificadores", () => {
    assert.deepEqual(resolverContextoAjuda("/"), {
      pagina: "Hoje",
      pathname: "/",
      descricao: "Mostra a prioridade atual, tarefas, alertas e próximos passos do mandato.",
    });
    assert.equal(resolverContextoAjuda("/assuntos/abc").pagina, "Detalhe de um assunto");
    assert.equal(resolverContextoAjuda("/assuntos/abc").pathname, "/assuntos/:assuntoId");
    assert.equal(resolverContextoAjuda("/sessoes/abc/preparacao").pagina, "Preparação de sessão");
    assert.equal(
      resolverContextoAjuda("/biblioteca/documentos/abc").pagina,
      "Detalhe de documento",
    );
    assert.equal(resolverContextoAjuda("/agenda").pagina, "Agenda");
    assert.equal(resolverContextoAjuda("/definicoes").pagina, "Tribuno");
  });

  it("recusa pedidos políticos, jurídicos ou de redação", async () => {
    assert.equal(pedidoForaDoAmbito("Faz uma moção sobre segurança"), true);
    assert.match(
      SYSTEM_PROMPT_AJUDA,
      /Não prestes aconselhamento político, jurídico ou partidário/,
    );
    let chamouModelo = false;
    const result = await executarPedidoAjuda(
      { ...pedido, messages: [{ role: "user", content: "Faz uma moção sobre segurança" }] },
      {
        autenticar: async () => "user-1",
        responder: async () => {
          chamouModelo = true;
          return "não deve ser usada";
        },
      },
    );
    assert.deepEqual(result, {
      ok: true,
      answer: respostaParaPedidoForaDoAmbito("Faz uma moção sobre segurança"),
    });
    assert.match(result.ok ? result.answer : "", /abra ou crie um Assunto/);
    assert.equal(chamouModelo, false);
  });

  it("exige autenticação antes de responder", async () => {
    let chamouModelo = false;
    const result = await executarPedidoAjuda(pedido, {
      autenticar: async () => undefined,
      responder: async () => {
        chamouModelo = true;
        return "resposta";
      },
    });
    assert.deepEqual(result, {
      ok: false,
      code: "AUTH_REQUIRED",
      message: "A sua sessão expirou. Inicie sessão novamente.",
    });
    assert.equal(chamouModelo, false);
  });

  it("envia à IA apenas contexto controlado e conversa limitada", async () => {
    let prompt = "";
    const result = await executarPedidoAjuda(pedido, {
      autenticar: async () => "user-1",
      responder: async (input) => {
        prompt = input.userPrompt;
        assert.equal(input.maxOutputTokens, 500);
        return "Abra o assunto e reveja o próximo passo.";
      },
    });
    assert.equal(result.ok, true);
    assert.doesNotMatch(
      prompt,
      /assunto-secreto|token-seguro|localStorage|store|documento integral/i,
    );
    assert.match(prompt, /Pathname normalizado: \/assuntos\/:assuntoId/);
    assert.match(prompt, /ESTADO SEGURO CONFIRMADO PELA INTERFACE/);
    assert.match(prompt, /Ação principal visível: Rever assunto/);
    assert.match(prompt, /Próximo passo confirmado: Rever a próxima ação/);
    assert.match(prompt, /Facto resumido: 2 documentos associados/);
    assert.match(prompt, /CONVERSA LIMITADA/);
  });

  it("funciona sem campos de estado adicionais", () => {
    const parsed = pedidoAjudaSchema.parse({
      accessToken: "token-seguro",
      pathname: "/agenda",
      messages: [{ role: "user", content: "E agora?" }],
    });
    const prompt = construirPromptAjuda(parsed.pathname, parsed.messages, parsed.pageState);

    assert.match(prompt, /Estado adicional: não fornecido por esta página/);
    assert.match(prompt, /Página: Agenda/);
  });

  it("aceita apenas o resumo tipado e rejeita IDs ou objetos completos", () => {
    assert.equal(
      productHelpPageStateSchema.safeParse({
        emptyState: false,
        sessionId: "sessao-secreta",
        session: { id: "sessao-secreta", titulo: "conteúdo integral" },
      }).success,
      false,
    );

    const prompt = construirPromptAjuda("/sessoes/sessao-secreta", pedido.messages, {
      emptyState: false,
      summaryFacts: ["3 pontos da sessão"],
    });
    assert.doesNotMatch(prompt, /sessao-secreta|conteúdo integral/);
    assert.match(prompt, /Facto resumido: 3 pontos da sessão/);
  });

  it("orienta perguntas vagas pelo próximo passo fornecido sem inventar conclusão", () => {
    const prompt = construirPromptAjuda("/sessoes", [{ role: "user", content: "E agora?" }], {
      emptyState: true,
      primaryAction: "Criar sessão",
      nextStep: "Criar manualmente uma sessão ou analisar uma convocatória",
    });

    assert.match(prompt, /Próximo passo confirmado: Criar manualmente uma sessão/);
    assert.match(SYSTEM_PROMPT_AJUDA, /Perante perguntas vagas como “E agora\?”/);
    assert.match(SYSTEM_PROMPT_AJUDA, /Nunca afirmes que uma tarefa está concluída/);
  });

  it("limita o histórico às oito mensagens mais recentes", () => {
    const messages = Array.from({ length: 10 }, (_, index) => ({
      role: "user" as const,
      content: `mensagem-${index}`,
    }));
    const prompt = construirPromptAjuda("/", messages);
    assert.doesNotMatch(prompt, /mensagem-0|mensagem-1/);
    assert.match(prompt, /mensagem-2/);
    assert.match(prompt, /mensagem-9/);
  });

  it("não inclui o conteúdo da conversa nos logs", () => {
    const original = console.info;
    const logs: unknown[][] = [];
    console.info = (...args: unknown[]) => logs.push(args);
    try {
      registarResultadoAjuda({ status: "success", durationMs: 12, messageCount: 2 });
    } finally {
      console.info = original;
    }
    const serializado = JSON.stringify(logs);
    assert.doesNotMatch(serializado, /token-seguro|O que posso fazer aqui/);
    assert.match(serializado, /product_help/);
    assert.match(serializado, /durationMs/);
  });
});
