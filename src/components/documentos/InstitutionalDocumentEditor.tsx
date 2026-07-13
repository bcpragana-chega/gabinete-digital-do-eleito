import { useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  obterDadosInstitucionais,
  obterSecoesDocumentoInstitucional,
  serializarSecoesDocumentoInstitucional,
  type ContextoDocumentoInstitucional,
  type SecaoDocumentoInstitucional,
  type TipoDocumentoInstitucional,
} from "@/lib/documentos-institucionais";

type InstitutionalDocumentEditorProps = {
  tipo: TipoDocumentoInstitucional;
  titulo: string;
  conteudo: string;
  contexto?: ContextoDocumentoInstitucional;
  readOnly?: boolean;
  onConteudoChange?: (conteudo: string) => void;
};

export function InstitutionalDocumentEditor({
  tipo,
  titulo,
  conteudo,
  contexto,
  readOnly = false,
  onConteudoChange,
}: InstitutionalDocumentEditorProps) {
  const dados = obterDadosInstitucionais(contexto);
  const secoes = useMemo(() => obterSecoesDocumentoInstitucional(tipo, conteudo), [conteudo, tipo]);

  function atualizarSecao(tituloSecao: string, proximoConteudo: string) {
    const proximasSecoes = secoes.map((secao) =>
      secao.titulo === tituloSecao ? { ...secao, conteudo: proximoConteudo } : secao,
    );

    onConteudoChange?.(serializarSecoesDocumentoInstitucional(proximasSecoes));
  }

  return (
    <div className="rounded-xl border border-border bg-background p-3 md:p-6">
      <article className="mx-auto min-h-[780px] max-w-3xl border border-border bg-white px-8 py-10 font-serif text-[15px] leading-7 text-slate-950 shadow-card md:px-14 md:py-12">
        <header className="border-b border-slate-300 pb-6 text-center">
          {dados.logoUrl && (
            <img
              src={dados.logoUrl}
              alt=""
              className="mx-auto mb-5 max-h-20 max-w-[150px] object-contain"
              onError={(event) => {
                event.currentTarget.remove();
              }}
            />
          )}
          {dados.nomeOrgao ? (
            <div className="font-sans text-[13px] font-bold uppercase tracking-[0.12em] text-slate-700">
              {dados.nomeOrgao}
            </div>
          ) : (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 font-sans text-sm text-amber-900">
              Falta configurar o órgão institucional.
            </div>
          )}
          <div className="mt-4 font-sans text-lg font-extrabold uppercase tracking-[0.18em] text-slate-950">
            {tipo}
          </div>
          <h2 className="mt-5 font-sans text-2xl font-extrabold uppercase leading-tight tracking-normal text-slate-950">
            {titulo || "Documento sem título"}
          </h2>
        </header>

        <main className="mt-8 space-y-7">
          {secoes.map((secao) => (
            <section key={secao.titulo}>
              <h3 className="mb-3 font-sans text-sm font-extrabold uppercase tracking-[0.1em] text-slate-950">
                {secao.titulo}
              </h3>
              {readOnly ? (
                <SecaoRenderizada secao={secao} />
              ) : (
                <Textarea
                  value={secao.conteudo}
                  onChange={(event) => atualizarSecao(secao.titulo, event.target.value)}
                  className="min-h-[150px] resize-y border-slate-200 bg-white font-serif text-[15px] leading-7 text-slate-950 shadow-none focus-visible:ring-1 focus-visible:ring-slate-300"
                />
              )}
            </section>
          ))}
        </main>

        <footer className="mt-14">
          <p className="mb-9 text-left">
            {dados.local}, {dados.data}
          </p>
          <p className="mb-7 text-left">O Proponente,</p>
          <div className="mb-3 w-72 border-t border-slate-950 pt-3" />
          <p className="m-0 text-left">{dados.nomeEleito}</p>
          {dados.cargo && <p className="m-0 text-left">{dados.cargo}</p>}
          {dados.grupoPolitico && <p className="m-0 text-left">{dados.grupoPolitico}</p>}
        </footer>
      </article>
    </div>
  );
}

function SecaoRenderizada({ secao }: { secao: SecaoDocumentoInstitucional }) {
  const blocos = secao.conteudo
    .split(/\n{2,}/)
    .map((bloco) => bloco.trim())
    .filter(Boolean);

  if (blocos.length === 0) {
    return <p className="text-left text-slate-500">Sem conteúdo nesta secção.</p>;
  }

  return (
    <div className="space-y-3">
      {blocos.map((bloco, index) => {
        const linhas = bloco
          .split(/\r?\n/)
          .map((linha) => linha.trim())
          .filter(Boolean);
        const todosNumerados = linhas.every((linha) => /^\d+\.\s+/.test(linha));
        const todasAlineas = linhas.every((linha) => /^(?:[a-z]|[ivxlcdm]+\))\s+/i.test(linha));

        if (todosNumerados) {
          return (
            <ol key={`${secao.titulo}-${index}`} className="ml-6 list-decimal space-y-2">
              {linhas.map((linha) => (
                <li key={linha}>{linha.replace(/^\d+\.\s*/, "")}</li>
              ))}
            </ol>
          );
        }

        if (todasAlineas) {
          return (
            <div key={`${secao.titulo}-${index}`} className="ml-6 space-y-2">
              {linhas.map((linha) => (
                <p key={linha}>{linha}</p>
              ))}
            </div>
          );
        }

        return (
          <p key={`${secao.titulo}-${index}`} className="whitespace-pre-line text-justify">
            {bloco}
          </p>
        );
      })}
    </div>
  );
}
