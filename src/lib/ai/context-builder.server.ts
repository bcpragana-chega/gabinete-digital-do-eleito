import type {
  AnexoTextualContexto,
  AssuntoContexto,
  ContextoGeracaoDocumento,
  DadosEntradaGeracaoDocumento,
  DocumentoRelacionadoContexto,
  FactoEspecificoContexto,
  PerfilInstitucionalContexto,
  SessaoContexto,
} from "@/lib/ai/types";
import { construirBaseJuridicaInstitucional } from "@/lib/ai/legal-basis";
import { resolveInstitutionalContext } from "@/lib/ai/institutional-context";

export type AuthenticatedServerContext = Readonly<{
  authenticatedUserId: string;
}>;

type ProfileRow = {
  nome_institucional: string | null;
  cargo: string | null;
  orgao: string | null;
  organizacao: string | null;
  territorio: string | null;
  municipio: string | null;
  freguesia: string | null;
  assinatura_institucional: string | null;
};

type AssuntoRow = {
  id: string;
  titulo: string;
  descricao: string | null;
  objetivo_politico: string | null;
  prioridade: string | null;
  estado: string | null;
  tags: string[] | null;
  created_at: string | null;
  updated_at: string | null;
};

type DocumentoCriadoRow = {
  id: string;
  tipo: string;
  titulo: string;
  conteudo: string | null;
  resumo: string | null;
  notas: string | null;
  created_at: string | null;
  updated_at: string | null;
  assembleia_id: string | null;
};

type DocumentoRow = {
  id: string;
  tipo: string | null;
  titulo: string;
  texto_extraido: string | null;
  resumo: string | null;
  notas: string | null;
  assembleia_origem_id: string | null;
};

type AssuntoSessaoRow = {
  assunto_id: string;
  sessao_id: string;
};

type AssembleiaRow = {
  id: string;
  data: string | null;
  tipo: string | null;
  orgao: string | null;
  titulo: string | null;
  notas: string | null;
};

function env(name: string) {
  return process.env[name]?.trim();
}

function cortar(texto: string | null | undefined, max = 9000) {
  if (!texto) return undefined;
  const limpo = texto.trim();
  if (!limpo) return undefined;
  return limpo.length > max ? `${limpo.slice(0, max)}\n\n[Conteúdo truncado]` : limpo;
}

function idSeguro(id: string) {
  return id.replace(/[(),]/g, "").trim();
}

function normalizarListaContexto(lista: string[] | undefined, maxItens = 30, maxChars = 1500) {
  if (!Array.isArray(lista) || lista.length === 0) return [];

  return lista
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item))
    .slice(0, maxItens)
    .map((item) => (item.length > maxChars ? `${item.slice(0, maxChars)}…` : item));
}

async function supabaseSelect<T>(table: string, params: Record<string, string>) {
  const supabaseUrl = env("SUPABASE_URL") ?? env("VITE_SUPABASE_URL");
  const serviceRole = env("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRole) {
    throw new Error(
      "SUPABASE_SERVER_CONFIG_MISSING: defina SUPABASE_URL/VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no backend.",
    );
  }

  const url = new URL(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/${table}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), {
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const erro = await response.text().catch(() => "Erro desconhecido.");
    throw new Error(`SUPABASE_SELECT_ERROR_${table}: ${erro}`);
  }

  return (await response.json()) as T[];
}

function construirPerfil(row?: ProfileRow): PerfilInstitucionalContexto {
  return {
    nome: row?.nome_institucional?.trim() || "Nome não indicado",
    cargo: row?.cargo?.trim() || "Cargo não indicado",
    orgao: row?.orgao?.trim() || "Órgão não indicado",
    organizacao: row?.organizacao?.trim() || "Organização não indicada",
    territorio: row?.territorio?.trim() || undefined,
    municipio: row?.municipio?.trim() || undefined,
    freguesia: row?.freguesia?.trim() || undefined,
    assinatura: row?.assinatura_institucional?.trim() || undefined,
    partido: undefined,
  };
}

function construirAssunto(
  row: AssuntoRow,
  input?: Pick<DadosEntradaGeracaoDocumento, "assuntoNotas" | "assuntoTimeline">,
): AssuntoContexto {
  return {
    id: row.id,
    titulo: row.titulo,
    descricao: cortar(row.descricao, 3500),
    objetivo: cortar(row.objetivo_politico, 2500),
    prioridade: row.prioridade ?? undefined,
    estado: row.estado ?? undefined,
    tags: row.tags ?? [],
    notas: normalizarListaContexto(input?.assuntoNotas, 25, 2000),
    timeline: normalizarListaContexto(input?.assuntoTimeline, 40, 1000),
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    historico: [
      row.created_at ? `Assunto criado em ${row.created_at}` : "",
      row.updated_at ? `Assunto atualizado em ${row.updated_at}` : "",
    ].filter(Boolean),
  };
}

function mapearDocumentosRelacionados(rows: DocumentoCriadoRow[]): DocumentoRelacionadoContexto[] {
  return rows.map((row) => ({
    id: row.id,
    tipo: row.tipo,
    titulo: row.titulo,
    conteudo: cortar(row.conteudo, 7000),
    resumo: cortar(row.resumo, 2000),
    notas: cortar(row.notas, 2000),
    criadoEm: row.created_at ?? undefined,
    atualizadoEm: row.updated_at ?? undefined,
  }));
}

function mapearAnexos(rows: DocumentoRow[]): AnexoTextualContexto[] {
  return rows
    .filter((row) => Boolean(row.texto_extraido?.trim()))
    .map((row) => ({
      id: row.id,
      titulo: row.titulo,
      tipo: row.tipo ?? undefined,
      textoExtraido: cortar(row.texto_extraido, 9000) ?? "",
      resumo: cortar(row.resumo, 2500),
      notas: cortar(row.notas, 2500),
    }));
}

function construirSessao(row?: AssembleiaRow): SessaoContexto | undefined {
  if (!row) return undefined;

  return {
    id: row.id,
    data: row.data ?? undefined,
    hora: undefined,
    tipo: row.tipo ?? undefined,
    orgao: row.orgao ?? undefined,
    ordemTrabalhos: row.titulo ?? undefined,
    observacoes: row.notas ?? undefined,
  };
}

function adicionarFacto(
  factos: FactoEspecificoContexto[],
  origem: FactoEspecificoContexto["origem"],
  campo: string,
  valor: string | undefined,
  max = 1800,
) {
  const resumo = cortar(valor, max);
  if (resumo) factos.push({ origem, campo, resumo });
}

export function construirFactosEspecificos(
  assunto: AssuntoContexto,
  documentos: DocumentoRelacionadoContexto[],
  anexos: AnexoTextualContexto[],
) {
  const factos: FactoEspecificoContexto[] = [];
  adicionarFacto(factos, "assunto", "descricao", assunto.descricao);
  assunto.notas.forEach((nota, index) => adicionarFacto(factos, "nota", `nota_${index + 1}`, nota));
  assunto.timeline.forEach((evento, index) =>
    adicionarFacto(factos, "timeline", `evento_${index + 1}`, evento),
  );
  documentos.forEach((documento) => {
    adicionarFacto(factos, "documento", `${documento.id}:resumo`, documento.resumo);
    adicionarFacto(factos, "documento", `${documento.id}:notas`, documento.notas);
    adicionarFacto(factos, "documento", `${documento.id}:conteudo`, documento.conteudo, 2400);
  });
  anexos.forEach((anexo) => {
    adicionarFacto(factos, "anexo", `${anexo.id}:resumo`, anexo.resumo);
    adicionarFacto(factos, "anexo", `${anexo.id}:notas`, anexo.notas);
    adicionarFacto(factos, "anexo", `${anexo.id}:texto_extraido`, anexo.textoExtraido, 2400);
  });
  return factos;
}

export async function construirContextoGeracaoDocumento(
  authContext: AuthenticatedServerContext,
  input: DadosEntradaGeracaoDocumento,
): Promise<ContextoGeracaoDocumento> {
  const userId = idSeguro(authContext.authenticatedUserId);
  const assuntoId = idSeguro(input.assuntoId);
  const sessaoId = input.sessaoId ? idSeguro(input.sessaoId) : undefined;
  const documentosRelacionadosIds = (input.documentosRelacionadosIds ?? [])
    .map((id) => idSeguro(id))
    .filter(Boolean);

  const [profiles, assuntos, documentosCriadosAssunto, documentosAssunto] = await Promise.all([
    supabaseSelect<ProfileRow>("profiles", {
      select:
        "nome_institucional,cargo,orgao,organizacao,territorio,municipio,freguesia,assinatura_institucional",
      user_id: `eq.${userId}`,
      limit: "1",
    }),
    supabaseSelect<AssuntoRow>("assuntos", {
      select: "id,titulo,descricao,objetivo_politico,prioridade,estado,tags,created_at,updated_at",
      user_id: `eq.${userId}`,
      id: `eq.${assuntoId}`,
      limit: "1",
    }),
    supabaseSelect<DocumentoCriadoRow>("documentos_criados", {
      select: "id,tipo,titulo,conteudo,resumo,notas,created_at,updated_at,assembleia_id",
      user_id: `eq.${userId}`,
      assunto_id: `eq.${assuntoId}`,
      order: "updated_at.desc",
      limit: "20",
    }),
    supabaseSelect<DocumentoRow>("documentos", {
      select: "id,tipo,titulo,texto_extraido,resumo,notas,assembleia_origem_id",
      user_id: `eq.${userId}`,
      assunto_origem_id: `eq.${assuntoId}`,
      order: "updated_at.desc",
      limit: "30",
    }),
  ]);

  const assunto = assuntos[0];
  if (!assunto) {
    throw new Error("ASSUNTO_NOT_FOUND");
  }

  let anexosExtraPorIds: DocumentoRow[] = [];
  if (documentosRelacionadosIds.length > 0) {
    anexosExtraPorIds = await supabaseSelect<DocumentoRow>("documentos", {
      select: "id,tipo,titulo,texto_extraido,resumo,notas,assembleia_origem_id",
      user_id: `eq.${userId}`,
      id: `in.(${documentosRelacionadosIds.join(",")})`,
      limit: "30",
    });
  }

  const anexosMap = new Map<string, DocumentoRow>();
  [...documentosAssunto, ...anexosExtraPorIds].forEach((row) => anexosMap.set(row.id, row));
  const anexos = Array.from(anexosMap.values());

  const relacoesAssuntoSessao = sessaoId
    ? await supabaseSelect<AssuntoSessaoRow>("assunto_sessoes", {
        select: "assunto_id,sessao_id",
        user_id: `eq.${userId}`,
        assunto_id: `eq.${assuntoId}`,
        sessao_id: `eq.${sessaoId}`,
        limit: "1",
      })
    : [];

  if (sessaoId && !relacoesAssuntoSessao[0]) {
    throw new Error("SESSAO_NOT_LINKED_TO_ASSUNTO");
  }

  const assembleias = sessaoId
    ? await supabaseSelect<AssembleiaRow>("assembleias", {
        select: "id,data,tipo,orgao,titulo,notas",
        user_id: `eq.${userId}`,
        id: `eq.${sessaoId}`,
        limit: "1",
      })
    : [];

  const perfil = construirPerfil(profiles[0]);
  const assuntoContexto = construirAssunto(assunto, input);
  const documentosRelacionados = mapearDocumentosRelacionados(documentosCriadosAssunto);
  const anexosTextuais = mapearAnexos(anexos);
  const sessao = construirSessao(assembleias[0]);
  const baseJuridica = construirBaseJuridicaInstitucional({
    perfil,
    sessao,
    tipoDocumental: input.tipo,
  });
  const institutionalContext = resolveInstitutionalContext({
    electedOfficialId: userId,
    perfil,
    sessao,
    tipoDocumental: input.tipo,
    baseJuridica,
  });

  return {
    entrada: {
      assuntoId,
      tipo: input.tipo,
      titulo: input.titulo,
      conteudoInicial: input.conteudoInicial,
      sessaoId,
      documentosRelacionadosIds,
      assuntoNotas: normalizarListaContexto(input.assuntoNotas, 25, 2000),
      assuntoTimeline: normalizarListaContexto(input.assuntoTimeline, 40, 1000),
    },
    perfil,
    assunto: assuntoContexto,
    sessao,
    baseJuridica,
    institutionalContext,
    documentosRelacionados,
    anexosTextuais,
    factosEspecificos: construirFactosEspecificos(
      assuntoContexto,
      documentosRelacionados,
      anexosTextuais,
    ),
  };
}
