export type ErroDataCivil = "formato" | "inexistente" | "ano_implausivel";

export type ResultadoDataCivil =
  | { ok: true; valor: string; ano: number; mes: number; dia: number }
  | { ok: false; erro: ErroDataCivil; anoMaximo?: number };

export function validarDataCivilIso(
  value: string,
  options: { agora?: Date; validarAnoPlausivel?: boolean } = {},
): ResultadoDataCivil {
  const valor = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!match) return { ok: false, erro: "formato" };

  const ano = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  const bissexto = ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0);
  const diasNoMes = [31, bissexto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (mes < 1 || mes > 12 || dia < 1 || dia > diasNoMes[mes - 1]) {
    return { ok: false, erro: "inexistente" };
  }

  if (options.validarAnoPlausivel) {
    const anoMaximo = (options.agora ?? new Date()).getFullYear() + 20;
    if (ano > anoMaximo) return { ok: false, erro: "ano_implausivel", anoMaximo };
  }

  return { ok: true, valor, ano, mes, dia };
}

export function formatarDataCivilPt(value: string) {
  const resultado = validarDataCivilIso(value);
  if (!resultado.ok) return undefined;
  return `${String(resultado.dia).padStart(2, "0")}/${String(resultado.mes).padStart(2, "0")}/${resultado.ano}`;
}

export function formatarData(iso: string): string {
  const data = new Date(`${iso}T00:00:00`);
  return data.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatarDataCurta(iso: string): string {
  const data = new Date(`${iso}T00:00:00`);
  return data.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
