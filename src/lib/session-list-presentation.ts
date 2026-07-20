const mesesPt = [
  "jan.",
  "fev.",
  "mar.",
  "abr.",
  "mai.",
  "jun.",
  "jul.",
  "ago.",
  "set.",
  "out.",
  "nov.",
  "dez.",
] as const;

function lerDataCivil(data: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data.trim());
  if (!match) return undefined;

  const ano = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  const valor = new Date(ano, mes - 1, dia);

  if (valor.getFullYear() !== ano || valor.getMonth() !== mes - 1 || valor.getDate() !== dia) {
    return undefined;
  }

  return { ano, mes, dia, valor };
}

function mesmaData(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatarDataSessaoMobile(data: string, hora: string, agora = new Date()) {
  const civil = lerDataCivil(data);
  if (!civil) return "Sem data";

  const amanha = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);
  const dataLabel = mesmaData(civil.valor, agora)
    ? "Hoje"
    : mesmaData(civil.valor, amanha)
      ? "Amanhã"
      : `${civil.dia} ${mesesPt[civil.mes - 1]}`;
  const horaLimpa = hora.trim();

  return horaLimpa ? `${dataLabel}, ${horaLimpa}` : dataLabel;
}

export function sessaoJaPassou(data: string, agora = new Date()) {
  const civil = lerDataCivil(data);
  if (!civil) return false;

  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  return civil.valor.getTime() < hoje.getTime();
}
