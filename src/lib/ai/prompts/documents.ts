import type { ContextoGeracaoDocumento } from "@/lib/ai/types";
import type { TipoDocumentoCriado } from "@/lib/types";

const estruturasPorTipo: Record<TipoDocumentoCriado, string[]> = {
  Moção: ["Título", "Enquadramento", "Fundamentação", "Deliberação", "Local", "Data", "Assinatura"],
  Recomendação: ["Destinatário", "Fundamentação", "Recomendação", "Conclusão"],
  Requerimento: ["Enquadramento", "Fundamentação", "Pedido", "Questões"],
  "Declaração de voto": ["Contexto", "Fundamentação", "Declaração"],
  Intervenção: ["Abertura", "Contexto", "Argumentação", "Conclusão"],
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
      : "";

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
      : "";

  const notasAssunto =
    contexto.assunto.notas.length > 0
      ? contexto.assunto.notas
          .map((nota, index) => `Nota ${index + 1}: ${limitarTexto(nota, 1200)}`)
          .join("\n")
      : "";

  const timelineAssunto =
    contexto.assunto.timeline.length > 0
      ? contexto.assunto.timeline
          .map((evento, index) => `Evento ${index + 1}: ${limitarTexto(evento, 900)}`)
          .join("\n")
      : "";

  const sessaoBloco = contexto.sessao
    ? [
        "Sessão (ligação explícita confirmada):",
        `- Data: ${contexto.sessao.data ?? ""}`,
        `- Hora: ${contexto.sessao.hora ?? ""}`,
        `- Tipo: ${contexto.sessao.tipo ?? ""}`,
        `- Órgão: ${contexto.sessao.orgao ?? ""}`,
        `- Ordem de trabalhos: ${contexto.sessao.ordemTrabalhos ?? ""}`,
        `- Observações: ${contexto.sessao.observacoes ?? ""}`,
      ].join("\n")
    : "Sessão:\n";

  return [
    "Tarefa: gerar automaticamente um documento institucional completo com base no contexto do Tribuno.",
    "",
    "Princípio fundamental:",
    "- Utiliza toda a informação disponibilizada no contexto.",
    "- Não limites o documento ao conteúdo inicial introduzido pelo utilizador.",
    "- Seleciona autonomamente os elementos relevantes e integra-os no texto final.",
    "- Não faças perguntas, não peças confirmação e não incluas mensagens conversacionais.",
    "- Quando um dado não existir, simplesmente não o menciones.",
    "- Se houver fundamentação jurídica no contexto, usa-a; se não houver, não inventes legislação.",
    "",
    "Raciocínio documental interno obrigatório antes da redação:",
    "- Identifica o problema principal do assunto.",
    "- Identifica o objetivo político do documento.",
    "- Identifica a competência do órgão a que o documento se destina.",
    "- Confirma se o tipo documental recebido é o mais adequado ao objetivo; se houver margem, adapta a redação ao enquadramento institucional mais eficaz sem alterar o tipo pedido.",
    "- Seleciona os factos relevantes e elimina informação irrelevante.",
    "- Seleciona os documentos relevantes e integra apenas o que fortalece o documento.",
    "- Identifica legislação ou referências jurídicas presentes no contexto e usa-as com rigor.",
    "- Identifica riscos jurídicos ou técnicos e evita formulações frágeis, absolutas ou não suportadas.",
    "- Evita repetições e organiza a estrutura antes de redigir.",
    "- Não mostres esta análise. O documento final deve conter apenas o resultado.",
    "",
    "Princípio de qualidade:",
    "- Prioridade 1: rigor factual.",
    "- Prioridade 2: rigor jurídico.",
    "- Prioridade 3: clareza.",
    "- Prioridade 4: objetividade.",
    "- Prioridade 5: coerência.",
    "- Prioridade 6: linguagem institucional.",
    "- Prioridade 7: utilidade prática.",
    "- Escolhe a solução redacional que melhor sirva os interesses institucionais do eleito e do órgão.",
    "- Não escrevas para impressionar. Escreve para convencer.",
    "",
    "Responsabilidade institucional:",
    "- A decisão política pertence sempre ao eleito; o documento deve apoiar tecnicamente essa decisão sem substituir o eleito.",
    "- Não assumas posições partidárias que não resultem do contexto recebido.",
    "- Não inventes factos, acontecimentos, legislação, números, intenções ou responsabilidades.",
    "- Preserva com rigor a informação proveniente do contexto.",
    "- Quando existirem várias interpretações possíveis, escolhe a mais prudente e institucional.",
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
    `- Território/Município/Freguesia: ${contexto.perfil.territorio ?? ""}`,
    `- Partido/Grupo político: ${contexto.perfil.partido ?? ""}`,
    `- Assinatura institucional: ${contexto.perfil.assinatura ?? ""}`,
    "",
    "Assunto:",
    `- Título: ${contexto.assunto.titulo}`,
    `- Descrição: ${contexto.assunto.descricao ?? ""}`,
    `- Objetivo político: ${contexto.assunto.objetivo ?? ""}`,
    `- Prioridade: ${contexto.assunto.prioridade ?? ""}`,
    `- Estado: ${contexto.assunto.estado ?? ""}`,
    `- Etiquetas: ${contexto.assunto.tags.join(", ")}`,
    `- Datas: criado ${contexto.assunto.createdAt ?? ""}, atualizado ${contexto.assunto.updatedAt ?? ""}`,
    `- Histórico: ${contexto.assunto.historico.join(" | ")}`,
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
    "Fontes de contexto a considerar quando presentes:",
    "- Convocatórias, atas, regulamentos, contratos, relatórios, correspondência, estudos e pareceres.",
    "- Documentos anteriormente produzidos sobre o assunto.",
    "- Programa eleitoral, promessas ou compromissos relacionados com o assunto.",
    "- Legislação ou referências jurídicas existentes no contexto.",
    "",
    "Revisão interna obrigatória antes de concluir:",
    "- Verifica que todos os argumentos são coerentes.",
    "- Verifica que não existem contradições internas.",
    "- Verifica que todas as propostas decorrem naturalmente da fundamentação.",
    "- Verifica que a deliberação, pedido, recomendação ou conclusão responde ao problema identificado.",
    "- Verifica que o documento está adaptado ao órgão competente.",
    "- Verifica que o documento está adaptado ao tipo documental solicitado.",
    "- Verifica que a linguagem mantém o mesmo nível de formalidade do início ao fim.",
    "- Elimina repetições, frases desnecessárias, excesso de adjetivos, linguagem emocional, texto redundante e conclusões sem fundamento.",
    "- Garante que o documento final transmite credibilidade, rigor, clareza e autoridade institucional.",
    "- Não reveles qualquer indício de geração automática.",
    "",
    "Instruções finais de saída:",
    "- Entrega apenas o conteúdo final do documento.",
    "- Respeita os títulos das secções adequados ao tipo documental.",
    "- Estrutura o texto, sempre que adequado, com: tipo de documento, título, exposição de motivos/enquadramento, fundamentação, deliberação/pedido/recomendação, local e data, assinatura institucional.",
    "- Não incluas avisos, notas, disclaimers, comentários sobre falta de informação ou pedidos de dados adicionais.",
    "- Mantém o texto pronto para entrega oficial e revisão final pelo eleito.",
  ].join("\n");
}
