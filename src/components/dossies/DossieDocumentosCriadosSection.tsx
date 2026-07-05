import { Link } from "@tanstack/react-router";
import { FilePlus2, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { ActionCard } from "@/components/ui/cards";
import { SectionTitle, StatusBadge } from "@/components/ui/common";
import { EmptyState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceSection } from "@/components/ui/workspace";
import {
  adicionarDocumentoACriarRascunho,
  listarDocumentosACriarDoAssunto,
  subscreverDocumentosACriar,
} from "@/lib/documentos-a-criar-store";
import { obterAssembleia } from "@/lib/assembleias-store";
import { obterPontosDaAssembleia } from "@/lib/pontos-store";
import type { DocumentoCriado, TipoDocumentoCriado } from "@/lib/types";

const tiposDocumentos: TipoDocumentoCriado[] = [
  "Moção",
  "Recomendação",
  "Requerimento",
  "Declaração de voto",
  "Intervenção",
  "Outro documento",
];

function estadoLabel(estado: string) {
  if (estado === "em revisão") return "Em revisão";
  if (estado === "final") return "Final";
  return estado.charAt(0).toUpperCase() + estado.slice(1);
}

function metaAssociacao(documento: DocumentoCriado) {
  const assembleia = documento.assembleiaId ? obterAssembleia(documento.assembleiaId) : undefined;
  const ponto =
    documento.assembleiaId && documento.pontoId
      ? obterPontosDaAssembleia(documento.assembleiaId).find(
          (item) => item.id === documento.pontoId,
        )
      : undefined;

  if (assembleia && ponto) return `${assembleia.nome} · Ponto ${ponto.numero}`;
  if (assembleia) return assembleia.nome;
  return "Sem sessão associada";
}

export function DossieDocumentosCriadosSection({ dossieId }: { dossieId: string }) {
  const [documentos, setDocumentos] = useState<DocumentoCriado[]>([]);
  const [tipo, setTipo] = useState<TipoDocumentoCriado>("Recomendação");
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");

  useEffect(() => {
    function carregar() {
      setDocumentos(listarDocumentosACriarDoAssunto(dossieId));
    }

    carregar();
    return subscreverDocumentosACriar(carregar);
  }, [dossieId]);

  function criarDocumento() {
    const tituloLimpo = titulo.trim();
    if (!tituloLimpo) return;

    adicionarDocumentoACriarRascunho({
      assuntoId: dossieId,
      tipo,
      titulo: tituloLimpo,
      conteudo: conteudo.trim() || "Rascunho inicial.",
    });

    setTipo("Recomendação");
    setTitulo("");
    setConteudo("");
    setDocumentos(listarDocumentosACriarDoAssunto(dossieId));
  }

  return (
    <WorkspaceSection>
      <SectionTitle
        icon={FilePlus2}
        title="Documentos do assunto"
        description="Moções, recomendações, requerimentos e outros documentos que nascem deste tema."
      />

      <div className="mt-5 grid gap-4 rounded-2xl border border-border bg-background/60 p-4">
        <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Tipo</label>
            <Select value={tipo} onValueChange={(value) => setTipo(value as TipoDocumentoCriado)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tiposDocumentos.map((opcao) => (
                  <SelectItem key={opcao} value={opcao}>
                    {opcao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Título</label>
            <Input
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              placeholder="Ex: Recomendação sobre iluminação pública"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">Conteúdo inicial</label>
          <Textarea
            value={conteudo}
            onChange={(event) => setConteudo(event.target.value)}
            placeholder="Primeira versão, notas ou argumentos base."
            rows={4}
          />
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={criarDocumento} disabled={!titulo.trim()}>
            Criar documento
          </Button>
        </div>
      </div>

      {documentos.length === 0 ? (
        <EmptyState
          compact
          className="mt-5"
          title="Ainda não há documentos deste assunto."
          description="Crie o primeiro rascunho quando este tema precisar de uma proposta, moção ou requerimento."
        />
      ) : (
        <div className="mt-5 grid gap-3">
          {documentos.map((documento) => (
            <ActionCard
              key={documento.id}
              icon={FileText}
              title={documento.titulo}
              description={metaAssociacao(documento)}
              meta={documento.tipo}
              action={
                <Button asChild size="sm" variant="secondary">
                  <Link
                    to="/assuntos/$dossieId/documentos/$documentoId"
                    params={{ dossieId, documentoId: documento.id }}
                  >
                    Abrir
                  </Link>
                </Button>
              }
            >
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone="muted">{estadoLabel(documento.estado)}</StatusBadge>
                {documento.assembleiaId && (
                  <StatusBadge tone="info" dot={false}>
                    Associado à sessão
                  </StatusBadge>
                )}
                {documento.pontoId && (
                  <StatusBadge tone="info" dot={false}>
                    Associado ao ponto
                  </StatusBadge>
                )}
              </div>
            </ActionCard>
          ))}
        </div>
      )}
    </WorkspaceSection>
  );
}
