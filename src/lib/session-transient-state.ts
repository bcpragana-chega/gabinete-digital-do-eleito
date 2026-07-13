function segmentoSeguro(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("pt-PT")
    .replace(/[^a-z0-9@._-]/gi, "_");
}

export function chaveTransitoriaPorUtilizador(base: string, resourceId: string, userId?: string) {
  if (!userId) return undefined;
  return `${base}:${segmentoSeguro(userId)}:${resourceId}`;
}
