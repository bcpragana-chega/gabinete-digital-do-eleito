import type { AnaliseDocumentoInstitucional } from "@/lib/types";

export function analiseGeralPodeMostrarImpacto(analise?: AnaliseDocumentoInstitucional) {
  return Boolean(analise && !["convocatoria", "ordem_trabalhos"].includes(analise.tipoDocumento));
}
