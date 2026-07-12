import type { ContextoGeracaoDocumento } from "@/lib/ai/types";
import type { TipoDocumentoCriado } from "@/lib/types";

const estruturasPorTipo: Record<TipoDocumentoCriado, string[]> = {
  Moção: [
    "Cabeçalho institucional",
    "Título",
    "ENQUADRAMENTO",
    "FUNDAMENTAÇÃO",
    "PROPOSTA / DELIBERAÇÃO",
    "Data",
    "Proponente",
    "Assinatura",
  ],
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

function instrucaoOficialMocao() {
  return [
    "Especificação oficial para Moções do Tribuno:",
    "- A Moção deve seguir o padrão institucional oficial do Tribuno para este tipo documental.",
    "- Não copies conteúdo, frases ou ideias de modelos anteriores; replica apenas a forma técnica: hierarquia, ritmo, secções, sobriedade e consistência.",
    "- O documento final deve ter apenas: cabeçalho institucional, título, ENQUADRAMENTO, FUNDAMENTAÇÃO, PROPOSTA / DELIBERAÇÃO, data, proponente e assinatura.",
    "- Nunca mostres a estrutura de raciocínio interno. É proibido escrever títulos como Factos, Problema, Consequência, Objetivo, Riscos, Notas ou Informação complementar.",
    "- O ENQUADRAMENTO contextualiza o problema e prepara o leitor. Não deve antecipar nem repetir a fundamentação.",
    "- A FUNDAMENTAÇÃO liga os factos, explica a razão da intervenção, enquadra a competência do órgão e usa legislação apenas quando existir no contexto.",
    "- A PROPOSTA / DELIBERAÇÃO deve ser curta, objetiva e diretamente decorrente da fundamentação.",
    "- Usa parágrafos curtos, linguagem institucional, natural, fluida e em português europeu.",
    "- Evita juridiquês excessivo, adjetivos inúteis, linguagem de chatbot, frases genéricas e enumerações que pareçam relatório.",
    "- Adapta sempre a Moção ao tema concreto: histórico, taxa turística, iluminação pública, parque infantil ou qualquer outro assunto recebido no contexto.",
    "- Nunca escrevas placeholders, campos por preencher, instruções entre parêntesis ou texto entre parêntesis retos.",
    "- Nunca inventes município, freguesia, órgão, resultado de votação, cargo, proponente, assinatura, factos, datas, números ou legislação.",
    "- Antes de devolver, compara internamente a Moção com o padrão oficial do Tribuno. Se não tiver a mesma qualidade, estrutura, linguagem e consistência, reescreve automaticamente.",
  ].join("\n");
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
  const baseJuridica = contexto.baseJuridica;
  const baseJuridicaBloco = [
    "Base Jurídica Institucional fornecida pelo Tribuno:",
    `- Diploma: ${baseJuridica.diploma}`,
    `- Tipo de órgão identificado: ${baseJuridica.tipoOrgao}`,
    `- Tipo documental: ${baseJuridica.tipoDocumental}`,
    `- Órgão de apresentação: ${baseJuridica.orgaoApresentacao}`,
    `- Destinatário juridicamente adequado: ${baseJuridica.destinatario}`,
    "- Enquadramento jurídico relevante:",
    ...baseJuridica.enquadramentoJuridico.map((item) => `  - ${item}`),
    "- Competências do órgão de apresentação:",
    ...baseJuridica.competenciaOrgao.map((item) => `  - ${item}`),
    "- Competências do destinatário:",
    ...baseJuridica.competenciaDestinatario.map((item) => `  - ${item}`),
    "- Limites legais:",
    ...baseJuridica.limitesLegais.map((item) => `  - ${item}`),
  ].join("\n");

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
    "- Para competências legais dos órgãos autárquicos, usa exclusivamente a Base Jurídica Institucional fornecida pelo Tribuno.",
    "- Não uses memória própria para completar artigos, competências ou limites legais.",
    "- Escreve como Chefe de Gabinete experiente: rigor institucional, utilidade prática e força política sem floreados.",
    "",
    "Hierarquia institucional obrigatória:",
    "- Órgão.",
    "- Grupo parlamentar ou organização, quando existir.",
    "- Tipo documental.",
    "- Título.",
    "- Nunca coloques partido, grupo ou organização com mais destaque do que o órgão.",
    "",
    "Raciocínio documental interno obrigatório antes da redação:",
    "- Identifica o problema principal do assunto.",
    "- Identifica o objetivo político do documento.",
    "- Identifica a competência do órgão a que o documento se destina apenas a partir da Base Jurídica Institucional.",
    "- Confirma se o tipo documental recebido é o mais adequado ao objetivo; se houver margem, adapta a redação ao enquadramento institucional mais eficaz sem alterar o tipo pedido.",
    "- Seleciona os factos relevantes e elimina informação irrelevante.",
    "- Seleciona os documentos relevantes e integra apenas o que fortalece o documento.",
    "- Identifica legislação ou referências jurídicas presentes no contexto e usa-as com rigor.",
    "- Não acrescentes legislação, artigos ou competências que não constem da Base Jurídica Institucional ou dos documentos anexados.",
    "- Identifica riscos jurídicos ou técnicos e evita formulações frágeis, absolutas ou não suportadas.",
    "- Evita repetições e organiza a estrutura antes de redigir.",
    "- Não mostres esta análise. O documento final deve conter apenas o resultado.",
    "",
    "Estrutura interna da argumentação:",
    "- Factos: começa pelo que aconteceu, pelo que foi observado e pelo que consta dos documentos. Nunca comeces por opiniões.",
    "- Problema: explica por que razão esses factos justificam intervenção.",
    "- Fundamentação: integra competências legais, legislação, documentos, relatórios, atas ou outros elementos relevantes existentes no contexto.",
    "- Consequência: explica por que razão deve existir intervenção política.",
    "- Proposta: apresenta uma proposta objetiva que decorra naturalmente da fundamentação.",
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
    "- Nunca mistures órgãos na assinatura. Usa apenas a informação institucional principal do perfil.",
    "- Nunca geres duas assinaturas.",
    "",
    "Tipo documental pretendido:",
    `- ${contexto.entrada.tipo}`,
    "",
    "Estrutura institucional obrigatória para este tipo:",
    estrutura,
    "",
    contexto.entrada.tipo === "Moção" ? instrucaoOficialMocao() : "",
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
    baseJuridicaBloco,
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
    "- A Base Jurídica Institucional prevalece sobre qualquer formulação genérica sobre competências dos órgãos autárquicos.",
    "",
    "Revisão interna obrigatória antes de concluir:",
    "- Verifica que todos os argumentos são coerentes.",
    "- Verifica que não existem contradições internas.",
    "- Verifica que todas as propostas decorrem naturalmente da fundamentação.",
    "- Verifica que a deliberação, pedido, recomendação ou conclusão responde ao problema identificado.",
    "- Verifica que o documento está adaptado ao órgão competente.",
    "- Verifica que todas as referências a competências legais constam da Base Jurídica Institucional.",
    "- Verifica que o documento está adaptado ao tipo documental solicitado.",
    "- Verifica que a linguagem mantém o mesmo nível de formalidade do início ao fim.",
    "- Verifica se existem placeholders, frases demasiado genéricas, linguagem típica de IA ou dados contraditórios.",
    "- Elimina repetições, argumentos repetidos, conceitos repetidos, frases desnecessárias, excesso de adjetivos, linguagem emocional, texto redundante e conclusões sem fundamento.",
    "- Se encontrares qualquer problema, corrige automaticamente antes de devolver o documento.",
    '- Pergunta internamente: "Se este documento fosse entregue amanhã numa Assembleia Municipal ou Assembleia de Freguesia, pareceria ter sido redigido por um Chefe de Gabinete experiente?". Se a resposta for negativa, reescreve automaticamente.',
    "- Garante que o documento final transmite credibilidade, rigor, clareza e autoridade institucional.",
    "- Não reveles qualquer indício de geração automática.",
    "",
    "Instruções finais de saída:",
    "- Entrega apenas o conteúdo final do documento.",
    "- Respeita os títulos das secções adequados ao tipo documental.",
    "- Para Moções, usa obrigatoriamente as secções ENQUADRAMENTO, FUNDAMENTAÇÃO e PROPOSTA / DELIBERAÇÃO, sem revelar etapas internas de raciocínio.",
    "- Estrutura o texto, sempre que adequado, com: tipo de documento, título, exposição de motivos/enquadramento, fundamentação, deliberação/pedido/recomendação, local e data, assinatura institucional.",
    "- A deliberação, pedido ou recomendação deve ser objetiva e responder diretamente ao problema identificado; não a transformes num novo enquadramento.",
    "- Não incluas avisos, notas, disclaimers, comentários sobre falta de informação ou pedidos de dados adicionais.",
    "- Nunca uses placeholders como Assembleia Municipal/Freguesia, Câmara/Junta ou Presidente da Câmara/Presidente da Junta; usa sempre o órgão e o destinatário determinados pela Base Jurídica Institucional.",
    "- Mantém o texto pronto para entrega oficial e revisão final pelo eleito.",
  ].join("\n");
}
