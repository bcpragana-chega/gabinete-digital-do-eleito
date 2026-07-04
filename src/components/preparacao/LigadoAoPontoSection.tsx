import { FileText, NotebookText, X } from "lucide-react";
import { ActionCard } from "@/components/ui/cards";
import { SectionTitle } from "@/components/ui/common";
import { EmptyState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkspaceSection } from "@/components/ui/workspace";
import type { Documento, Dossie } from "@/lib/types";

export function LigadoAoPontoSection({
  assuntosLigados,
  assuntosDisponiveis,
  assuntoParaAssociar,
  onAssuntoChange,
  onAssociarAssunto,
  onDesassociarAssunto,
  documentosLigados,
  documentosDisponiveis,
  documentosRelacionadosIds,
  documentosLegadosIds,
  documentoParaAssociar,
  onDocumentoChange,
  onAssociarDocumento,
  onDesassociarDocumento,
}: {
  assuntosLigados: Dossie[];
  assuntosDisponiveis: Dossie[];
  assuntoParaAssociar: string;
  onAssuntoChange: (id: string) => void;
  onAssociarAssunto: () => void;
  onDesassociarAssunto: (dossie: Dossie) => void;
  documentosLigados: Documento[];
  documentosDisponiveis: Documento[];
  documentosRelacionadosIds: Set<string>;
  documentosLegadosIds: Set<string>;
  documentoParaAssociar: string;
  onDocumentoChange: (id: string) => void;
  onAssociarDocumento: () => void;
  onDesassociarDocumento: (documento: Documento) => void;
}) {
  return (
    <WorkspaceSection>
      <SectionTitle
        icon={NotebookText}
        title="Ligado a este ponto"
        description="Assuntos e documentos que dão contexto a este ponto da ordem de trabalhos."
      />

      <div className="mt-5 grid gap-6 xl:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-border bg-background/60 p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Assuntos</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Temas do mandato relacionados com este ponto.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <Select
              value={assuntoParaAssociar}
              onValueChange={onAssuntoChange}
              disabled={assuntosDisponiveis.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    assuntosDisponiveis.length === 0
                      ? "Todos os assuntos disponíveis já estão ligados"
                      : "Selecionar assunto existente"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {assuntosDisponiveis.map((dossie) => (
                  <SelectItem key={dossie.id} value={dossie.id}>
                    {dossie.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onAssociarAssunto}
              disabled={!assuntoParaAssociar}
            >
              Associar
            </Button>
          </div>

          {assuntosLigados.length === 0 ? (
            <EmptyState
              compact
              className="mt-4"
              title="Nenhum assunto ligado."
              description="Associe um assunto para ligar este ponto ao acompanhamento do mandato."
            />
          ) : (
            <div className="mt-4 grid gap-3">
              {assuntosLigados.map((dossie) => (
                <ActionCard
                  key={dossie.id}
                  icon={NotebookText}
                  title={dossie.titulo}
                  description={dossie.resumo || "Assunto ligado a este ponto."}
                  meta={`${dossie.estado} · ${dossie.prioridade}`}
                  action={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onDesassociarAssunto(dossie)}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Remover
                    </Button>
                  }
                />
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-background/60 p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Documentos</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Documentos da Biblioteca usados para preparar este ponto.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <Select
              value={documentoParaAssociar}
              onValueChange={onDocumentoChange}
              disabled={documentosDisponiveis.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    documentosDisponiveis.length === 0
                      ? "Todos os documentos disponíveis já estão ligados"
                      : "Selecionar documento existente"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {documentosDisponiveis.map((documento) => (
                  <SelectItem key={documento.id} value={documento.id}>
                    {documento.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onAssociarDocumento}
              disabled={!documentoParaAssociar}
            >
              Associar
            </Button>
          </div>

          {documentosLigados.length === 0 ? (
            <EmptyState
              compact
              className="mt-4"
              title="Nenhum documento ligado."
              description="Associe documentos da Biblioteca para apoiar este ponto."
            />
          ) : (
            <div className="mt-4 grid gap-3">
              {documentosLigados.map((documento) => {
                const viaRelacao = documentosRelacionadosIds.has(documento.id);
                const viaAntiga = documentosLegadosIds.has(documento.id);

                return (
                  <ActionCard
                    key={documento.id}
                    icon={FileText}
                    title={documento.titulo}
                    description={
                      documento.notas || documento.ficheiroNome || "Documento ligado a este ponto."
                    }
                    meta={`${documento.tipo} · ${documento.estado}${viaAntiga && !viaRelacao ? " · associação antiga" : ""}`}
                    action={
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onDesassociarDocumento(documento)}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remover
                      </Button>
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </WorkspaceSection>
  );
}
