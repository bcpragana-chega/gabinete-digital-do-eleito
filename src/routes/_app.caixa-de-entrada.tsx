import { createFileRoute, Link } from "@tanstack/react-router";
import { Archive, CheckCircle2, FileText, Inbox, Landmark, NotebookText } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { EntityCard, MetricCard } from "@/components/ui/cards";
import { SectionTitle, StatusBadge } from "@/components/ui/common";
import { EmptyState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  WorkspaceHeader,
  WorkspaceLayout,
  WorkspaceMetrics,
  WorkspaceSection,
} from "@/components/ui/workspace";
import { useAssembleias } from "@/lib/assembleias-store";
import { associarDocumentoAoDossie } from "@/lib/dossie-documentos-store";
import { useDossies } from "@/lib/dossies-store";
import { listarDocumentosLocais } from "@/lib/documentos-store";
import {
  arquivarInboxDocumento,
  associarInboxDocumentoAAssembleia,
  associarInboxDocumentoADossie,
  marcarInboxDocumentoComoTratado,
  obterInboxDocumento,
  useInboxDocumentos,
} from "@/lib/inbox-store";
import type { Documento, EstadoInboxDocumento } from "@/lib/types";

export const Route = createFileRoute("/_app/caixa-de-entrada")({
  head: () => ({
    meta: [
      { title: "Por tratar — Tribuno" },
      {
        name: "description",
        content: "Documentos que ainda precisam de atenção.",
      },
    ],
  }),
  component: CaixaDeEntradaPage,
});

function documentosUnicos(documentos: Documento[]) {
  const porId = new Map<string, Documento>();
  documentos.forEach((documento) => porId.set(documento.id, documento));
  return Array.from(porId.values()).sort((a, b) => b.data.localeCompare(a.data));
}

function formatarData(data?: string) {
  if (!data) return "Sem data";

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(data));
}

function estadoTone(estado: EstadoInboxDocumento) {
  if (estado === "Tratado") return "success";
  if (estado === "Em análise") return "info";
  return "warning";
}

function CaixaDeEntradaPage() {
  const inboxItems = useInboxDocumentos();
  const dossies = useDossies().filter((dossie) => !dossie.archivedAt);
  const assembleias = useAssembleias().filter((assembleia) => assembleia.estado !== "arquivada");

  const documentos = documentosUnicos(listarDocumentosLocais());

  const documentosComEstado = documentos.map((documento) => ({
    documento,
    inbox: obterInboxDocumento(documento.id),
  }));

  const pendentes = documentosComEstado.filter(
    ({ inbox }) => inbox.estado !== "Tratado" && !inbox.archivedAt,
  );
  const novos = pendentes.filter(({ inbox }) => inbox.estado === "Novo").length;
  const emAnalise = pendentes.filter(({ inbox }) => inbox.estado === "Em análise").length;
  const tratados = documentosComEstado.filter(({ inbox }) => inbox.estado === "Tratado").length;

  return (
    <>
      <TopBar breadcrumb="Por tratar" />
      <main className="min-h-screen bg-transparent">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <WorkspaceLayout
            header={
              <WorkspaceHeader
                icon={Inbox}
                eyebrow="Documentos pendentes"
                title="Por tratar"
                description="Documentos que ainda precisam de leitura, associação ou arquivo."
                className="bg-card p-4 sm:p-7"
                meta={
                  <>
                    <StatusBadge tone="warning">{novos} novos</StatusBadge>
                    <StatusBadge tone="info">{emAnalise} em análise</StatusBadge>
                    <StatusBadge tone="success">{tratados} tratados</StatusBadge>
                  </>
                }
              />
            }
          >
            <WorkspaceMetrics>
              <MetricCard icon={Inbox} label="Por tratar" value={pendentes.length} />
              <MetricCard icon={FileText} label="Novos" value={novos} />
              <MetricCard icon={CheckCircle2} label="Em análise" value={emAnalise} />
              <MetricCard icon={Archive} label="Tratados" value={tratados} />
            </WorkspaceMetrics>

            <WorkspaceSection>
              <SectionTitle
                icon={Inbox}
                title="Documentos por tratar"
                description="Dê destino a cada documento."
              />

              {pendentes.length === 0 ? (
                <EmptyState
                  className="mt-5"
                  title="Nada por tratar"
                  description="Não há documentos novos ou em análise por tratar."
                />
              ) : (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {pendentes.map(({ documento, inbox }) => (
                    <EntityCard
                      key={documento.id}
                      icon={FileText}
                      eyebrow="Documento"
                      title={documento.titulo}
                      description={
                        documento.notas || documento.ficheiroNome || "Documento por organizar."
                      }
                      className="min-w-0 overflow-hidden"
                      meta={
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge tone={estadoTone(inbox.estado)}>{inbox.estado}</StatusBadge>
                          <StatusBadge tone="muted" dot={false}>
                            {documento.tipo}
                          </StatusBadge>
                          <StatusBadge tone="muted" dot={false}>
                            {formatarData(documento.data)}
                          </StatusBadge>
                        </div>
                      }
                    >
                      <div className="grid gap-3 border-t border-border/60 pt-4">
                        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                          <Select
                            value={inbox.dossieId ?? ""}
                            onValueChange={(dossieId) => {
                              associarInboxDocumentoADossie(documento.id, dossieId);
                              associarDocumentoAoDossie(dossieId, documento.id);
                            }}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Ligar a assunto" />
                            </SelectTrigger>
                            <SelectContent>
                              {dossies.map((dossie) => (
                                <SelectItem key={dossie.id} value={dossie.id}>
                                  {dossie.titulo}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            asChild
                            variant="secondary"
                            size="sm"
                            className="w-full sm:w-auto"
                          >
                            <Link to="/dossies">
                              <NotebookText className="mr-2 h-4 w-4" />
                              Assuntos
                            </Link>
                          </Button>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                          <Select
                            value={inbox.assembleiaId ?? documento.assembleiaId ?? ""}
                            onValueChange={(assembleiaId) =>
                              associarInboxDocumentoAAssembleia(documento.id, assembleiaId)
                            }
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Ligar a sessão" />
                            </SelectTrigger>
                            <SelectContent>
                              {assembleias.map((assembleia) => (
                                <SelectItem key={assembleia.id} value={assembleia.id}>
                                  {assembleia.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            asChild
                            variant="secondary"
                            size="sm"
                            className="w-full sm:w-auto"
                          >
                            <Link to="/assembleias">
                              <Landmark className="mr-2 h-4 w-4" />
                              Sessões
                            </Link>
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => marcarInboxDocumentoComoTratado(documento.id)}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Marcar como analisado
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => arquivarInboxDocumento(documento.id)}
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Arquivar
                        </Button>
                      </div>
                    </EntityCard>
                  ))}
                </div>
              )}
            </WorkspaceSection>
          </WorkspaceLayout>
        </div>
      </main>
    </>
  );
}
