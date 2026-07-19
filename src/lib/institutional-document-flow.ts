import { analisarDocumentoInstitucional } from "@/lib/ai/institutional-document-analysis.server";
import {
  adicionarDocumentoComUpload,
  carregarDocumentosRemotosSeDisponivel,
  editarDocumentoConfirmado,
} from "@/lib/documentos-store";
import { carregarAssembleiasRemotasSeDisponivel } from "@/lib/assembleias-store";
import { carregarPontosRemotosSeDisponivel } from "@/lib/pontos-store";
import { getSupabaseClient, withSupabaseTimeout } from "@/lib/supabase";
import { validarDataCivilIso } from "@/lib/civil-date";
import { orgaoInstitucionalGenerico } from "@/lib/institutional-session-title";
import type {
  AnaliseDocumentoInstitucional,
  Documento,
  TipoDocumento,
  TipoDocumentoInstitucional,
} from "@/lib/types";

export const LIMIAR_CONFIANCA_DESTINO_DOCUMENTAL = 0.75;

export type DestinoAnaliseInstitucional =
  | "preparar_sessao"
  | "guardar_biblioteca"
  | "confirmar_dados_sessao"
  | "confirmar_dados_documento";

export function destinoPreparaSessao(destino: DestinoAnaliseInstitucional) {
  return destino === "preparar_sessao" || destino === "confirmar_dados_sessao";
}

export function destinoRequerConfirmacao(destino: DestinoAnaliseInstitucional) {
  return destino === "confirmar_dados_sessao" || destino === "confirmar_dados_documento";
}

const TIPOS_SESSAO = new Set<TipoDocumentoInstitucional>(["convocatoria", "ordem_trabalhos"]);

function campoNormalizado(campo: string) {
  return campo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export { orgaoInstitucionalGenerico } from "@/lib/institutional-session-title";

export function temCamposEssenciaisIncertos(analise: AnaliseDocumentoInstitucional) {
  const sessao = TIPOS_SESSAO.has(analise.tipoDocumento);
  if (sessao && orgaoInstitucionalGenerico(analise.sessao?.orgao)) return true;
  return analise.camposIncertos.some(({ campo }) => {
    const normalizado = campoNormalizado(campo);
    if (["documento", "tipo", "titulo"].some((item) => normalizado.includes(item))) return true;
    return sessao && ["sessao", "orgao", "data", "hora"].some((item) => normalizado.includes(item));
  });
}

export type CampoSessaoEditavel = "orgao" | "data" | "hora" | "local";

export function obterIncertezaCampoSessao(
  analise: AnaliseDocumentoInstitucional,
  campo: CampoSessaoEditavel,
) {
  const explicita = analise.camposIncertos.find(({ campo: campoIncerto }) =>
    campoNormalizado(campoIncerto).includes(campo),
  );
  if (explicita) return explicita;
  if (campo === "orgao" && orgaoInstitucionalGenerico(analise.sessao?.orgao)) {
    return {
      campo: "órgão",
      motivo: "A designação exata do órgão não foi identificada.",
    };
  }
  return undefined;
}

function valorCorrigidoValido(campo: CampoSessaoEditavel, value: string, agora?: Date) {
  if (campo === "data") return validarDataCivilIso(value, { agora, validarAnoPlausivel: true }).ok;
  if (campo === "hora") return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  if (campo === "orgao") return value.trim().length > 0 && !orgaoInstitucionalGenerico(value);
  return value.trim().length > 0;
}

const MESES_PORTUGUESES: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

function datasExplicitasNoTexto(texto: string, agora: Date) {
  const datas = new Set<string>();
  for (const match of texto.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)) {
    const resultado = validarDataCivilIso(match[0], { agora, validarAnoPlausivel: true });
    if (resultado.ok) datas.add(resultado.valor);
  }

  const normalizado = campoNormalizado(texto);
  const padrao =
    /\b(\d{1,2})\s+de\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})\b/g;
  for (const match of normalizado.matchAll(padrao)) {
    const valor = `${match[3]}-${String(MESES_PORTUGUESES[match[2]]).padStart(2, "0")}-${String(Number(match[1])).padStart(2, "0")}`;
    const resultado = validarDataCivilIso(valor, { agora, validarAnoPlausivel: true });
    if (resultado.ok) datas.add(resultado.valor);
  }
  return [...datas];
}

export type ResolucaoDataSessao =
  | { estado: "preservada" | "resolvida"; data: string }
  | { estado: "confirmacao_necessaria"; motivo: string };

export function resolverDataSessaoInstitucional(
  analise: AnaliseDocumentoInstitucional,
  agora: Date = new Date(),
): ResolucaoDataSessao {
  const estruturada = analise.sessao?.data?.trim() ?? "";
  const valida = validarDataCivilIso(estruturada, { agora, validarAnoPlausivel: true });
  if (valida.ok) return { estado: "preservada", data: valida.valor };

  const textos = [
    analise.resumoCompreensao,
    ...analise.informacaoRelevante.flatMap((item) => [item.titulo, item.descricao]),
  ];
  let candidatas = [...new Set(textos.flatMap((texto) => datasExplicitasNoTexto(texto, agora)))];

  const partesEstruturadas = /^\d{4}-(\d{2})-(\d{2})$/.exec(estruturada);
  if (partesEstruturadas) {
    candidatas = candidatas.filter(
      (data) => data.slice(5) === `${partesEstruturadas[1]}-${partesEstruturadas[2]}`,
    );
  }
  if (candidatas.length === 1) return { estado: "resolvida", data: candidatas[0] };
  return {
    estado: "confirmacao_necessaria",
    motivo:
      candidatas.length > 1
        ? "Foram encontradas várias datas possíveis. Confirme a data da sessão."
        : "A data estruturada é inválida ou implausível. Confirme a data da sessão.",
  };
}

type PontoOrdemTrabalhos = AnaliseDocumentoInstitucional["pontosOrdemTrabalhos"][number];

function textoSubordinado(ponto: PontoOrdemTrabalhos) {
  return [ponto.titulo.trim(), ponto.descricao?.trim()].filter(Boolean).join("\n");
}

export function normalizarHierarquiaOrdemTrabalhos(pontos: PontoOrdemTrabalhos[]) {
  const principais: PontoOrdemTrabalhos[] = [];
  for (const ponto of pontos) {
    const titulo = ponto.titulo.trim();
    const subponto = /^\d+\.\d+[.)]?\s+/.test(titulo);
    const itemMarcado = /^[-–—•]\s+/.test(titulo);
    const marcadorPrincipal = /^(\d+)[.)]\s+(.+)$/.exec(titulo);
    const numeroPrincipal = marcadorPrincipal ? Number(marcadorPrincipal[1]) : undefined;
    const iniciaPrincipal =
      !subponto &&
      !itemMarcado &&
      (principais.length === 0 ||
        numeroPrincipal === principais.length + 1 ||
        (!marcadorPrincipal && ponto.numero === principais.length + 1));

    if (iniciaPrincipal) {
      principais.push({
        ...ponto,
        numero: principais.length + 1,
        titulo: marcadorPrincipal?.[2].trim() ?? titulo,
      });
      continue;
    }

    const anterior = principais.at(-1);
    if (!anterior) {
      principais.push({ ...ponto, numero: 1 });
      continue;
    }
    anterior.descricao = [anterior.descricao?.trim(), textoSubordinado(ponto)]
      .filter(Boolean)
      .join("\n");
  }
  return principais;
}

export function prepararAnaliseInstitucionalParaRevisao(
  analise: AnaliseDocumentoInstitucional,
  agora: Date = new Date(),
): AnaliseDocumentoInstitucional {
  if (!TIPOS_SESSAO.has(analise.tipoDocumento)) return analise;
  const resolucao = resolverDataSessaoInstitucional(analise, agora);
  const incertezasSemData = analise.camposIncertos.filter(
    ({ campo }) => !campoNormalizado(campo).includes("data"),
  );
  const camposIncertos =
    resolucao.estado === "confirmacao_necessaria"
      ? [...incertezasSemData, { campo: "data", motivo: resolucao.motivo }]
      : resolucao.estado === "resolvida"
        ? incertezasSemData
        : analise.camposIncertos;
  return {
    ...analise,
    sessao: {
      ...analise.sessao,
      data: resolucao.estado === "confirmacao_necessaria" ? undefined : resolucao.data,
    },
    pontosOrdemTrabalhos: normalizarHierarquiaOrdemTrabalhos(analise.pontosOrdemTrabalhos),
    camposIncertos,
  };
}

export function corrigirCampoSessao(
  analise: AnaliseDocumentoInstitucional,
  campo: CampoSessaoEditavel,
  value: string,
  agora?: Date,
): AnaliseDocumentoInstitucional {
  const incerteza = obterIncertezaCampoSessao(analise, campo);
  return {
    ...analise,
    sessao: { ...analise.sessao, [campo]: value || undefined },
    camposIncertos:
      incerteza && valorCorrigidoValido(campo, value, agora)
        ? analise.camposIncertos.filter((item) => item !== incerteza)
        : analise.camposIncertos,
  };
}

export function mapearTipoDocumentoInstitucional(tipo: TipoDocumentoInstitucional): TipoDocumento {
  const mapa: Record<TipoDocumentoInstitucional, TipoDocumento> = {
    convocatoria: "Convocatória",
    ordem_trabalhos: "Outro",
    ata: "Ata",
    documento_financeiro: "Outro",
    proposta: "Proposta",
    regulamento: "Regulamento",
    outro: "Outro",
    desconhecido: "Outro",
  };
  return mapa[tipo];
}

export function decidirDestinoAnalise(
  analise: AnaliseDocumentoInstitucional,
): DestinoAnaliseInstitucional {
  if (
    analise.tipoDocumento === "desconhecido" ||
    analise.confiancaGlobal < LIMIAR_CONFIANCA_DESTINO_DOCUMENTAL
  ) {
    return "confirmar_dados_documento";
  }
  if (TIPOS_SESSAO.has(analise.tipoDocumento)) {
    return temCamposEssenciaisIncertos(analise) || validarDadosConfirmacaoAnalise(analise)
      ? "confirmar_dados_sessao"
      : "preparar_sessao";
  }
  return temCamposEssenciaisIncertos(analise) ? "confirmar_dados_documento" : "guardar_biblioteca";
}

export async function confirmarDocumentoNaBibliotecaComDependencias(input: {
  documento: Documento;
  analise: AnaliseDocumentoInstitucional;
  titulo: string;
  tipo: TipoDocumento;
  guardar: typeof editarDocumentoConfirmado;
}) {
  const titulo = input.titulo.trim();
  if (!titulo) throw new Error("DOCUMENTO_TITLE_REQUIRED");
  const necessitaConfirmacao = decidirDestinoAnalise(input.analise) === "confirmar_dados_documento";
  return input.guardar(input.documento.id, {
    titulo,
    tipo: input.tipo,
    resumo: input.analise.resumoCompreensao.trim() || input.documento.resumo,
    estado: necessitaConfirmacao ? "Por rever" : "Revisto",
    estadoAnalise: necessitaConfirmacao ? "necessita_confirmacao" : "confirmado",
    analiseInstitucional: input.analise,
  });
}

export function confirmarDocumentoNaBiblioteca(input: {
  documento: Documento;
  analise: AnaliseDocumentoInstitucional;
  titulo: string;
  tipo: TipoDocumento;
}) {
  return confirmarDocumentoNaBibliotecaComDependencias({
    ...input,
    guardar: editarDocumentoConfirmado,
  });
}

async function accessToken() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  const { data, error } = await withSupabaseTimeout(supabase.auth.getSession(), "WOW_AUTH");
  if (error || !data.session?.access_token) throw new Error("AUTH_REQUIRED");
  return data.session.access_token;
}

export async function carregarDocumentoParaAnalise(file: File) {
  return carregarDocumentoParaAnaliseComDependencias(file, adicionarDocumentoComUpload);
}

/** @internal Permite testar a entrada sem repetir upload nem tocar no Storage real. */
export async function carregarDocumentoParaAnaliseComDependencias(
  file: File,
  upload: typeof adicionarDocumentoComUpload,
) {
  return upload({
    assembleiaId: "biblioteca",
    titulo: file.name.replace(/\.pdf$/i, "").trim() || "Documento institucional",
    tipo: "Outro",
    data: new Date().toISOString().slice(0, 10),
    estado: "Por rever",
    estadoAnalise: "a_analisar",
    ficheiro: file,
  });
}

export async function analisarDocumentoCarregado(documentoId: string) {
  const result = await analisarDocumentoInstitucional({
    data: { accessToken: await accessToken(), documentoId },
  });
  if (!result.ok) throw Object.assign(new Error(result.message), { code: result.code });
  await carregarDocumentosRemotosSeDisponivel();
  return { ...result, analise: prepararAnaliseInstitucionalParaRevisao(result.analise) };
}

export type ResultadoConfirmacaoAnalise =
  | { status: "confirmado"; sessaoId: string; pontosCriados: number }
  | { status: "duplicado"; sessaoId: string };

export type ErrosCamposConfirmacaoSessao = Partial<Record<"orgao" | "data" | "hora", string>>;

export function validarCamposConfirmacaoSessao(
  analise: AnaliseDocumentoInstitucional,
  agora: Date = new Date(),
): ErrosCamposConfirmacaoSessao {
  const orgao = analise.sessao?.orgao?.trim() ?? "";
  const data = analise.sessao?.data?.trim() ?? "";
  const hora = analise.sessao?.hora?.trim() ?? "";
  const erros: ErrosCamposConfirmacaoSessao = {};
  if (!orgao) erros.orgao = "Confirme o órgão da Sessão.";
  else if (orgaoInstitucionalGenerico(orgao)) erros.orgao = "Confirme a designação exata do órgão.";

  const resultadoData = validarDataCivilIso(data, { agora, validarAnoPlausivel: true });
  if (!resultadoData.ok) {
    erros.data =
      resultadoData.erro === "ano_implausivel"
        ? `Confirme o ano. A data não pode ser posterior a ${resultadoData.anoMaximo}.`
        : resultadoData.erro === "inexistente"
          ? "Introduza uma data real."
          : "Introduza a data no formato AAAA-MM-DD.";
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) erros.hora = "Introduza uma hora válida.";
  return erros;
}

export function validarDadosConfirmacaoAnalise(
  analise: AnaliseDocumentoInstitucional,
  agora: Date = new Date(),
) {
  return Object.values(validarCamposConfirmacaoSessao(analise, agora))[0];
}

export function prepararAnaliseParaConfirmacaoSessao<
  T extends AnaliseDocumentoInstitucional & { tituloSessao?: string },
>(analise: T, agora: Date = new Date()): T {
  const preparada = prepararAnaliseInstitucionalParaRevisao(analise, agora) as T;
  const erro = validarDadosConfirmacaoAnalise(preparada, agora);
  if (erro) throw new Error(erro);
  const data = validarDataCivilIso(preparada.sessao?.data ?? "", {
    agora,
    validarAnoPlausivel: true,
  });
  if (!data.ok) throw new Error("DATA_SESSAO_INVALIDA");
  return { ...preparada, sessao: { ...preparada.sessao, data: data.valor } };
}

export async function confirmarSessaoValidadaComDependencias<T>(input: {
  analise: AnaliseDocumentoInstitucional & { tituloSessao?: string };
  confirmar: (analise: AnaliseDocumentoInstitucional & { tituloSessao?: string }) => Promise<T>;
  agora?: Date;
}) {
  return input.confirmar(prepararAnaliseParaConfirmacaoSessao(input.analise, input.agora));
}

export function validarResultadoConfirmacaoAnalise(value: unknown): ResultadoConfirmacaoAnalise {
  if (!value || typeof value !== "object") throw new Error("CONFIRMATION_NOT_CONFIRMED");
  const result = value as Record<string, unknown>;
  const sessaoId = typeof result.sessaoId === "string" ? result.sessaoId.trim() : "";
  if (!sessaoId) throw new Error("CONFIRMATION_NOT_CONFIRMED");
  if (result.status === "duplicado") return { status: "duplicado", sessaoId };
  if (
    result.status === "confirmado" &&
    typeof result.pontosCriados === "number" &&
    Number.isInteger(result.pontosCriados) &&
    result.pontosCriados >= 0
  ) {
    return { status: "confirmado", sessaoId, pontosCriados: result.pontosCriados };
  }
  throw new Error("CONFIRMATION_NOT_CONFIRMED");
}

export async function confirmarAnaliseDocumentoComDependencias(
  confirmarRemoto: () => Promise<unknown>,
  hidratarConfirmado: () => Promise<unknown>,
) {
  const result = validarResultadoConfirmacaoAnalise(await confirmarRemoto());
  if (result.status === "confirmado") await hidratarConfirmado();
  return result;
}

export async function executarConfirmacaoAnaliseComDependencias(input: {
  confirmar: () => Promise<ResultadoConfirmacaoAnalise>;
  onDuplicado: (sessaoId: string) => void;
  onConfirmado: (
    result: Extract<ResultadoConfirmacaoAnalise, { status: "confirmado" }>,
  ) => Promise<void> | void;
}) {
  const result = await input.confirmar();
  if (result.status === "duplicado") input.onDuplicado(result.sessaoId);
  else await input.onConfirmado(result);
  return result;
}

export async function confirmarAnaliseDocumento(input: {
  documentoId: string;
  analise: AnaliseDocumentoInstitucional & { tituloSessao?: string };
  modo?: "criar" | "atualizar" | "criar_novo";
  sessaoExistenteId?: string;
}): Promise<ResultadoConfirmacaoAnalise> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  return confirmarSessaoValidadaComDependencias({
    analise: input.analise,
    confirmar: (analiseValidada) =>
      confirmarAnaliseDocumentoComDependencias(
        async () => {
          const { data, error } = await withSupabaseTimeout(
            supabase.rpc("confirmar_analise_documento_sessao", {
              p_documento_id: input.documentoId,
              p_analise: analiseValidada,
              p_modo: input.modo ?? "criar",
              p_sessao_existente_id: input.sessaoExistenteId ?? null,
            }),
            "WOW_CONFIRM",
            20000,
          );
          if (error) throw error;
          return data;
        },
        () =>
          Promise.all([
            carregarAssembleiasRemotasSeDisponivel(),
            carregarPontosRemotosSeDisponivel(),
            carregarDocumentosRemotosSeDisponivel(),
          ]),
      ),
  });
}
