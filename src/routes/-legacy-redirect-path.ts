export function construirDestinoLegado(
  to: string,
  params: Record<string, string> = {},
  queryEHash = "",
) {
  const destino = Object.entries(params).reduce(
    (path, [param, value]) => path.replace(`$${param}`, encodeURIComponent(value)),
    to,
  );

  return `${destino}${queryEHash}`;
}
