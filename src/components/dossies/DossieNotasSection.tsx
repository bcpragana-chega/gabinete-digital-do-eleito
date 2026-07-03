import { useState } from "react";
import { MessageSquareText, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { ActionCard, InfoCard } from "@/components/ui/cards";
import { SectionTitle } from "@/components/ui/common";
import { EmptyState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceSection } from "@/components/ui/workspace";
import {
  adicionarNotaDossie,
  apagarNotaDossie,
  editarNotaDossie,
  useNotasDossie,
} from "@/lib/dossie-notas-store";
import type { DossieNota } from "@/lib/types";

type DossieNotasSectionProps = {
  dossieId: string;
};

function formatarDataHora(data?: string) {
  if (!data) return "Sem data";

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(data));
}

function notaMeta(nota: DossieNota) {
  if (nota.updatedAt && nota.updatedAt !== nota.createdAt) {
    return `Atualizada em ${formatarDataHora(nota.updatedAt)} · Criada em ${formatarDataHora(
      nota.createdAt,
    )}`;
  }

  return `Criada em ${formatarDataHora(nota.createdAt)}`;
}

export function DossieNotasSection({ dossieId }: DossieNotasSectionProps) {
  const notas = useNotasDossie(dossieId);
  const [aCriar, setACriar] = useState(false);
  const [novoConteudo, setNovoConteudo] = useState("");
  const [notaEmEdicao, setNotaEmEdicao] = useState<string | null>(null);
  const [conteudoEmEdicao, setConteudoEmEdicao] = useState("");

  function criarNota() {
    const conteudo = novoConteudo.trim();
    if (!conteudo) return;

    adicionarNotaDossie(dossieId, conteudo);
    setNovoConteudo("");
    setACriar(false);
  }

  function iniciarEdicao(nota: DossieNota) {
    setNotaEmEdicao(nota.id);
    setConteudoEmEdicao(nota.conteudo);
  }

  function guardarEdicao() {
    if (!notaEmEdicao) return;

    const conteudo = conteudoEmEdicao.trim();
    if (!conteudo) return;

    editarNotaDossie(notaEmEdicao, conteudo);
    setNotaEmEdicao(null);
    setConteudoEmEdicao("");
  }

  function apagarNota(nota: DossieNota) {
    const confirmado = window.confirm("Apagar esta nota do assunto?");
    if (!confirmado) return;

    apagarNotaDossie(nota.id);
  }

  return (
    <WorkspaceSection
      className=""
      actions={
        !aCriar && (
          <Button type="button" variant="secondary" size="sm" onClick={() => setACriar(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar nota
          </Button>
        )
      }
    >
      <SectionTitle
        icon={MessageSquareText}
        title="Notas do assunto"
        description="Observações e decisões guardadas ao longo do acompanhamento."
      />

      <div className="mt-5 space-y-4">
        {aCriar && (
          <InfoCard title="Nova nota" description="Regista contexto, ideias, decisões ou dúvidas.">
            <Textarea
              value={novoConteudo}
              onChange={(event) => setNovoConteudo(event.target.value)}
              placeholder="Escreve uma nota para este assunto..."
              className="min-h-32 resize-y bg-card"
            />
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setACriar(false);
                  setNovoConteudo("");
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={criarNota} disabled={!novoConteudo.trim()}>
                <Save className="mr-2 h-4 w-4" />
                Guardar nota
              </Button>
            </div>
          </InfoCard>
        )}

        {notas.length === 0 && !aCriar ? (
          <EmptyState
            compact
            title="Ainda não há notas neste assunto."
            description="Cria a primeira nota para guardar observações de trabalho."
            action={
              <Button type="button" size="sm" onClick={() => setACriar(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar nota
              </Button>
            }
          />
        ) : (
          notas.map((nota) => {
            const emEdicao = notaEmEdicao === nota.id;

            return (
              <ActionCard
                key={nota.id}
                icon={MessageSquareText}
                title="Nota"
                meta={notaMeta(nota)}
                action={
                  !emEdicao && (
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => iniciarEdicao(nota)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => apagarNota(nota)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Apagar
                      </Button>
                    </div>
                  )
                }
              >
                {emEdicao ? (
                  <>
                    <Textarea
                      value={conteudoEmEdicao}
                      onChange={(event) => setConteudoEmEdicao(event.target.value)}
                      className="min-h-32 resize-y bg-card"
                    />
                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNotaEmEdicao(null);
                          setConteudoEmEdicao("");
                        }}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={guardarEdicao}
                        disabled={!conteudoEmEdicao.trim()}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Guardar
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
                    {nota.conteudo}
                  </p>
                )}
              </ActionCard>
            );
          })
        )}
      </div>
    </WorkspaceSection>
  );
}
