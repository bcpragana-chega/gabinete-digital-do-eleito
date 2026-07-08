import type { ContextoGeracaoDocumento } from "@/lib/ai/types";
import type { TipoDocumentoCriado } from "@/lib/types";

const estruturasPorTipo: Record<TipoDocumentoCriado, string[]> = {
  Moção: [
    "Título",
    "Enquadramento",
    "Fundamentação",
    "Deliberação",
    "Local",
    "Data",
    "Assinatura",
  ],
  Recomendação: ["Destinatário", "Fundamentação", "Recomendação", "Conclusão"],
  Requerimento: ["Enquadramento", "Fundamentação", "Pedido", "Questões"],
  "Declaração de voto": ["Contexto", "Fundamentação", "Declaração"],
  "Intervenção": ["Abertura", "Contexto", "Argumentação", "Conclusão"],
  "Outro documento": ["Título", "Enquadramento", "Conteúdo", "Conclusão", "Assinatura"],
};

function limitarTexto(texto: string | undefined, max = 4000) {
  if (!texto) return "";
  const limpo = texto.trim();
  if (!limpo) return "";
  if (limpo.length <= max) return limpo;
  return `${limpo.slice(0, max)}\n\n[Texto truncado para limite de contexto.]`;
}

export function obterEstruturaDocumentoPorTipo(tipo: TipoDocumentoCriado) {
  return estruturasPorTipo[tipo] ?? estruturasPorTipo["Outro documento"];
}

export function construirPromptDocumento(contexto: ContextoGeracaoDocumento) {
  const estrutura = obterEstruturaDocumentoPorTipo(contexto.entrada.tipo)
    .map((item) => `- ${item}`)
    .join("\n");

  const documentosRelacionados =
    contexto.documentosRelacionados.length > 0
      ? contexto.documentosRelacionados
          .map((documento, index) => {
            return [
              `Documento relacionado ${index + 1}`,
              `Tipo: ${documento.tipo}`,
              `Título: ${documento.titulo}`,
              `Resumo: ${documento.resumo ?? ""}`,
              `Notas: ${documento.notas ?? ""}`,
              `Conteúdo: ${limitarTexto(documento.conteudo, 5000)}`,
            ]
              .filter(Boolean)
              .join("\n");
          })
          .join("\n\n")
      : "Sem documentos relacionados registados.";

  const anexosTextuais =
    contexto.anexosTextuais.length > 0
      ? contexto.anexosTextuais
          .map((anexo, index) => {
            return [
              `Anexo ${index + 1}`,
              `Tipo: ${anexo.tipo ?? "N/D"}`,
              `Título: ${anexo.titulo}`,
              `Resumo: ${anexo.resumo ?? ""}`,
              `Notas: ${anexo.notas ?? ""}`,
              `Texto extraído: ${limitarTexto(anexo.textoExtraido, 7000)}`,
            ]
              .filter(Boolean)
              .join("\n");
          })
          .join("\n\n")
      : "Sem anexos textuais disponíveis.";

  const notasAssunto =
    contexto.assunto.notas.length > 0
      ? contexto.assunto.notas
          .map((nota, index) => `Nota ${index + 1}: ${limitarTexto(nota, 1200)}`)
          .join("\n")
      : "Sem notas adicionais do assunto.";

  const timelineAssunto =
    contexto.assunto.timeline.length > 0
      ? contexto.assunto.timeline
          .map((evento, index) => `Evento ${index + 1}: ${limitarTexto(evento, 900)}`)
          .join("\n")
      : "Sem eventos de timeline adicionais.";

  const sessaoBloco = contexto.sessao
    ? [
        "Sessão (ligação explícita confirmada):",
        `- Data: ${contexto.sessao.data ?? "não disponível"}`,
        `- Hora: ${contexto.sessao.hora ?? "não disponível"}`,
        `- Tipo: ${contexto.sessao.tipo ?? "não disponível"}`,
        `- Órgão: ${contexto.sessao.orgao ?? "não disponível"}`,
        `- Ordem de trabalhos: ${contexto.sessao.ordemTrabalhos ?? "não disponível"}`,
        `- Observações: ${contexto.sessao.observacoes ?? "não disponível"}`,
      ].join("\n")
    : [
        "Sessão:",
        "- Ausente (não existe ligação explícita e determinística entre assunto/documento e sessão).",
      ].join("\n");

  return [
    "Tarefa: gerar a primeira versão de um documento institucional com base no contexto completo do mandato.",
    "",
    "Tipo documental pretendido:",
    `- ${contexto.entrada.tipo}`,
    "",
    "Estrutura institucional obrigatória para este tipo:",
    estrutura,
    "",
    "Dados introduzidos pelo utilizador:",
    `- Título: ${contexto.entrada.titulo}`,
    `- Conteúdo inicial: ${limitarTexto(contexto.entrada.conteudoInicial, 3500) || "(vazio)"}`,
    "",
    "Perfil institucional:",
    `- Nome: ${contexto.perfil.nome}`,
    `- Cargo: ${contexto.perfil.cargo}`,
    `- Órgão: ${contexto.perfil.orgao}`,
    `- Organização: ${contexto.perfil.organizacao}`,
    `- Partido: ${contexto.perfil.partido ?? "não indicado"}`,
    `- Assinatura: ${contexto.perfil.assinatura ?? "não indicada"}`,
    "",
    "Assunto:",
    `- Título: ${contexto.assunto.titulo}`,
    `- Descrição: ${contexto.assunto.descricao ?? "não disponível"}`,
    `- Objetivo: ${contexto.assunto.objetivo ?? "não disponível"}`,
    `- Prioridade: ${contexto.assunto.prioridade ?? "não disponível"}`,
    `- Estado: ${contexto.assunto.estado ?? "não disponível"}`,
    `- Etiquetas: ${contexto.assunto.tags.length > 0 ? contexto.assunto.tags.join(", ") : "sem etiquetas"}`,
    `- Datas: criado ${contexto.assunto.createdAt ?? "N/D"}, atualizado ${contexto.assunto.updatedAt ?? "N/D"}`,
    `- Histórico: ${contexto.assunto.historico.length > 0 ? contexto.assunto.historico.join(" | ") : "sem histórico adicional"}`,
    "- Notas do assunto:",
    notasAssunto,
    "- Timeline/eventos do assunto:",
    timelineAssunto,
    "",
    sessaoBloco,
    "",
    "Documentos já existentes relacionados com o assunto:",
    documentosRelacionados,
    "",
    "Documentos anexados (texto extraído):",
    anexosTextuais,
    "",
    "Instruções finais de saída:",
    "- Entrega apenas o conteúdo final do documento.",
    "- Respeita os títulos das secções adequados ao tipo documental.",
    "- Se faltar informação crítica, assinala explicitamente em secção apropriada sem inventar dados.",
    "- Mantém o texto pronto para revisão e edição posterior pelo eleito.",
  ].join("\n");
}
