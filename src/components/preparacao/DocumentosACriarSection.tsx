import { Link } from "@tanstack/react-router";
import { FilePlus2 } from "lucide-react";
import { useState } from "react";
import { ActionCard } from "@/components/ui/cards";
import { SectionTitle } from "@/components/ui/common";
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
import { adicionarDocumentoACriarRascunho } from "@/lib/documentos-a-criar-store";
import { adicionarEventoHistorico } from "@/lib/historico-store";
import type { DocumentoCriado, Dossie, TipoDocumentoCriado } from "@/lib/types";

const tiposDocumentosACriar: TipoDocumentoCriado[] = [
  "Moção",
  "Recomendação",
  "Requerimento",
  "Declaração de voto",
  "Intervenção",
];

export function DocumentosACriarSection({
  assembleiaId,
  pontoId,
  rascunhos,
  assuntosOrigem,
  onCriarRascunho,
}: {
  assembleiaId: string;
  pontoId: string;
  rascunhos: DocumentoCriado[];
  assuntosOrigem: Dossie[];
  onCriarRascunho: () => void;
}) {
  const [tipo, setTipo] = useState<TipoDocumentoCriado>("Moção");
  const [assuntoId, setAssuntoId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");

  function criarRascunho() {
    const tituloLimpo = titulo.trim();
    const conteudoLimpo = conteudo.trim();

    if (!tituloLimpo || !assuntoId) return;

    const rascunho = adicionarDocumentoACriarRascunho({
      assuntoId,
      tipo,
      titulo: tituloLimpo,
      conteudo: conteudoLimpo || "Rascunho inicial.",
      pontoId,
      assembleiaId,
    });
    adicionarEventoHistorico({
      pontoId,
      tipo: "documento-criado",
      acao: "Documento criado",
      descricao: `Documento "${rascunho.titulo}" criado (${rascunho.tipo}).`,
    });

    onCriarRascunho();
    setTipo("Moção");
    setAssuntoId("");
    setTitulo("");
    setConteudo("");
  }

  return (
    <WorkspaceSection>
      <SectionTitle
        icon={FilePlus2}
        title="Documentos criados"
        description="Rascunhos ligados a este ponto da ordem de trabalhos."
      />

      <div className="mt-4 space-y-3 rounded-2xl border border-border bg-background/60 p-4">
        {assuntosOrigem.length === 0 ? (
          <EmptyState
            compact
            title="Ligue primeiro este ponto a um assunto."
            description="Novos documentos devem nascer de um assunto para não ficarem perdidos apenas na sessão."
          />
        ) : (
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">
              Assunto de origem
            </label>
            <Select value={assuntoId} onValueChange={setAssuntoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar assunto" />
              </SelectTrigger>
              <SelectContent>
                {assuntosOrigem.map((assunto) => (
                  <SelectItem key={assunto.id} value={assunto.id}>
                    {assunto.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">Tipo</label>
          <Select value={tipo} onValueChange={(value) => setTipo(value as TipoDocumentoCriado)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tiposDocumentosACriar.map((tipoDocumento) => (
                <SelectItem key={tipoDocumento} value={tipoDocumento}>
                  {tipoDocumento}
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
            placeholder="Ex: Recomendação sobre execução do ponto"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">Conteúdo inicial</label>
          <Textarea
            value={conteudo}
            onChange={(event) => setConteudo(event.target.value)}
            placeholder="Escreva o primeiro rascunho ou uma nota base."
            rows={5}
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={criarRascunho}
            disabled={!titulo.trim() || !assuntoId}
          >
            Criar rascunho
          </Button>
        </div>
      </div>

      {rascunhos.length === 0 ? (
        <EmptyState
          compact
          className="mt-4"
          title="Ainda não há rascunhos criados para este ponto."
        />
      ) : (
        <div className="mt-4 space-y-3">
          {rascunhos.map((rascunho) => (
            <ActionCard
              key={rascunho.id}
              icon={FilePlus2}
              title={rascunho.titulo}
              meta={`${rascunho.tipo} · ${rascunho.estado}`}
              action={
                <Button asChild size="sm" variant="secondary">
                  <Link to="/documentos/$documentoId" params={{ documentoId: rascunho.id }}>
                    Abrir
                  </Link>
                </Button>
              }
            >
              <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {rascunho.conteudo}
              </p>
            </ActionCard>
          ))}
        </div>
      )}
    </WorkspaceSection>
  );
}
