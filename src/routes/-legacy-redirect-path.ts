export function construirDestinoLegado(
  to: string,
  params: Record<string, string> = {},
  queryEHash = "",
) {
  const destinoInterpolado = Object.entries(params).reduce(
    (path, [param, value]) => path.replace(`$${param}`, encodeURIComponent(value)),
    to,
  );
  const [origemSemHash, hash = ""] = queryEHash.split("#", 2);
  const queryOrigem = origemSemHash.startsWith("?") ? origemSemHash.slice(1) : "";
  const [destinoPath, queryDestino = ""] = destinoInterpolado.split("?", 2);
  const search = new URLSearchParams(queryDestino);

  new URLSearchParams(queryOrigem).forEach((value, key) => {
    if (!search.has(key)) search.append(key, value);
  });

  const queryFinal = search.toString();

  return `${destinoPath}${queryFinal ? `?${queryFinal}` : ""}${hash ? `#${hash}` : ""}`;
}
