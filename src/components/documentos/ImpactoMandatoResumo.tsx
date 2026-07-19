import type {
  AcaoImpactoMandato,
  ConclusaoImpactoMandato,
  ImpactoMandatoDocumento,
} from "@/lib/types";

const RELEVANCIA_LABEL: Record<ImpactoMandatoDocumento["relevancia"], string> = {
  alta: "Relevância alta",
  media: "Relevância média",
  baixa: "Relevância baixa",
  indeterminada: "Relevância indeterminada",
};

const ACAO_LABEL: Record<AcaoImpactoMandato["tipo"], string> = {
  exigida: "Exigida",
  recomendada: "Recomendada",
  informativa: "Informativa",
};

function MetaConclusao({ conclusao }: { conclusao: ConclusaoImpactoMandato }) {
  return (
    <p className="mt-1 text-xs text-muted-foreground">
      {conclusao.referenciaDocumento && <>Referência: {conclusao.referenciaDocumento} · </>}
      Confiança: {Math.round(conclusao.confianca * 100)}%
    </p>
  );
}

export function ImpactoMandatoResumo({ impacto }: { impacto?: ImpactoMandatoDocumento }) {
  const semImpactoSeguro =
    !impacto ||
    (impacto.relevancia === "indeterminada" &&
      impacto.alteracoesDecisoes.length === 0 &&
      impacto.acoes.length === 0 &&
      !impacto.proximaAcao);

  return (
    <section className="rounded-xl border border-primary/20 bg-primary/5 p-4" data-impacto-mandato>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Impacto no mandato
      </p>
      {semImpactoSeguro ? (
        <div className="mt-3">
          <h3 className="text-sm font-semibold">Porque importa</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Não foi identificado impacto prático seguro neste documento.
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">Porque importa</h3>
              <span className="rounded-full border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                {RELEVANCIA_LABEL[impacto.relevancia]}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{impacto.justificacaoRelevancia}</p>
            <MetaConclusao
              conclusao={{
                descricao: impacto.justificacaoRelevancia,
                referenciaDocumento: impacto.referenciaDocumento,
                confianca: impacto.confianca,
              }}
            />
          </div>

          {impacto.alteracoesDecisoes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold">O que mudou ou foi decidido</h3>
              <ul className="mt-2 space-y-2">
                {impacto.alteracoesDecisoes.map((conclusao, index) => (
                  <li key={`${conclusao.descricao}:${index}`} className="text-sm">
                    <p>{conclusao.descricao}</p>
                    <MetaConclusao conclusao={conclusao} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {impacto.acoes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold">O que exige atenção</h3>
              <ul className="mt-2 space-y-2">
                {impacto.acoes.map((acao, index) => (
                  <li key={`${acao.tipo}:${acao.descricao}:${index}`} className="text-sm">
                    <p>
                      <span className="font-medium">{ACAO_LABEL[acao.tipo]}:</span> {acao.descricao}
                    </p>
                    {acao.prazo && (
                      <p className="mt-1 text-xs font-medium text-foreground">
                        Prazo: {acao.prazo}
                      </p>
                    )}
                    <MetaConclusao conclusao={acao} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {impacto.proximaAcao && (
            <div>
              <h3 className="text-sm font-semibold">Próxima ação sugerida</h3>
              <p className="mt-1 text-sm">{impacto.proximaAcao.descricao}</p>
              <MetaConclusao conclusao={impacto.proximaAcao} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
