export type DocumentoOrigemSearch = {
  origem?: string;
  sessaoId?: string;
  assuntoId?: string;
};

type RelacoesDocumento = {
  sessaoIds?: Array<string | undefined>;
  assuntoIds?: Array<string | undefined>;
};

export type ContextoNavegacaoDocumento =
  | { origem: "biblioteca"; hrefRegresso: "/biblioteca"; labelRegresso: "Voltar à Biblioteca" }
  | { origem: "sessao"; sessaoId: string; hrefRegresso: string; labelRegresso: "Voltar à sessão" }
  | {
      origem: "assunto";
      assuntoId: string;
      hrefRegresso: string;
      labelRegresso: "Voltar ao assunto";
    }
  | { origem: "padrao"; hrefRegresso: "/biblioteca"; labelRegresso: "Voltar à Biblioteca" };

export function resolverContextoNavegacaoDocumento(
  search: DocumentoOrigemSearch,
  relacoes: RelacoesDocumento,
): ContextoNavegacaoDocumento {
  if (search.origem === "biblioteca" && !search.sessaoId && !search.assuntoId) {
    return {
      origem: "biblioteca",
      hrefRegresso: "/biblioteca",
      labelRegresso: "Voltar à Biblioteca",
    };
  }

  if (
    search.origem === "sessao" &&
    search.sessaoId &&
    !search.assuntoId &&
    relacoes.sessaoIds?.includes(search.sessaoId)
  ) {
    return {
      origem: "sessao",
      sessaoId: search.sessaoId,
      hrefRegresso: `/sessoes/${encodeURIComponent(search.sessaoId)}`,
      labelRegresso: "Voltar à sessão",
    };
  }

  if (
    search.origem === "assunto" &&
    search.assuntoId &&
    !search.sessaoId &&
    relacoes.assuntoIds?.includes(search.assuntoId)
  ) {
    return {
      origem: "assunto",
      assuntoId: search.assuntoId,
      hrefRegresso: `/assuntos/${encodeURIComponent(search.assuntoId)}`,
      labelRegresso: "Voltar ao assunto",
    };
  }

  return {
    origem: "padrao",
    hrefRegresso: "/biblioteca",
    labelRegresso: "Voltar à Biblioteca",
  };
}
