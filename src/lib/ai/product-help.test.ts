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

const pedido = {
  accessToken: "token-seguro",
  pathname: "/assuntos/assunto-secreto",
  messages: [{ role: "user", content: "O que posso fazer aqui?" }],
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
    assert.match(prompt, /CONVERSA LIMITADA/);
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
