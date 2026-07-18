import type { AnaliseDocumentoInstitucional } from "@/lib/types";

type SessaoInstitucional = NonNullable<AnaliseDocumentoInstitucional["sessao"]>;

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

const PREFIXO_INSTITUCIONAL =
  /^(?:Assembleia de Freguesia de|Junta de Freguesia de|Assembleia Municipal de|Câmara Municipal de|Município de|Freguesia de)\s+/i;

function entidadeCurta(sessao?: SessaoInstitucional) {
  const valor = (sessao?.entidade?.trim() || sessao?.orgao?.trim() || "")
    .replace(PREFIXO_INSTITUCIONAL, "")
    .trim();
  return valor || undefined;
}

function dataLegivel(data?: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data?.trim() ?? "");
  if (!match) return undefined;
  const ano = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  const bissexto = ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0);
  const diasNoMes = [31, bissexto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (mes < 1 || mes > 12 || dia < 1 || dia > diasNoMes[mes - 1]) return undefined;
  return `${dia} ${MESES[mes - 1]} ${ano}`;
}

export function gerarTituloSessaoManual(input: {
  tipoSessao: "Ordinária" | "Extraordinária" | "Reunião de câmara" | "Outra";
  data: string;
  tituloAdicional?: string;
}) {
  const base =
    input.tipoSessao === "Ordinária"
      ? "Sessão ordinária"
      : input.tipoSessao === "Extraordinária"
        ? "Sessão extraordinária"
        : input.tipoSessao === "Reunião de câmara"
          ? "Reunião de câmara"
          : "Sessão";
  const adicional = input.tituloAdicional?.trim();
  if (adicional) return `${base} — ${adicional}`;
  const data = dataLegivel(input.data)?.replace(/^(\d+) (\S+) (\d+)$/, "$1 de $2 de $3");
  return data ? `${base} — ${data}` : base;
}

export function gerarTituloSessaoInstitucional(sessao?: SessaoInstitucional) {
  const tipo =
    sessao?.tipo === "ordinaria"
      ? "Sessão ordinária"
      : sessao?.tipo === "extraordinaria"
        ? "Sessão extraordinária"
        : "Sessão";
  return [tipo, entidadeCurta(sessao), dataLegivel(sessao?.data)].filter(Boolean).join(" · ");
}

export function resolverTituloSessaoInstitucional(input: {
  tituloAtual: string;
  personalizado: boolean;
  sessao?: SessaoInstitucional;
}) {
  return input.personalizado ? input.tituloAtual : gerarTituloSessaoInstitucional(input.sessao);
}
