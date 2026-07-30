import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  blocksToText,
  normalizeDocument,
  parseBlocks,
  type CanonicalDocument,
} from "@/lib/document-model";
import type { ContextoDocumentoInstitucional } from "@/lib/documentos-institucionais";
import type { DocumentoCriado, TipoDocumentoCriado } from "@/lib/types";

type Props = {
  tipo: TipoDocumentoCriado;
  titulo: string;
  conteudo: string;
  conteudoJson?: unknown;
  contexto?: ContextoDocumentoInstitucional;
  readOnly?: boolean;
  onDocumentoChange?: (documento: CanonicalDocument) => void;
};

export function InstitutionalDocumentEditor({
  tipo,
  titulo,
  conteudo,
  conteudoJson,
  contexto,
  readOnly = false,
  onDocumentoChange,
}: Props) {
  const model = useMemo(
    () =>
      normalizeDocument(
        { tipo, titulo, conteudo, conteudoJson } as Pick<
          DocumentoCriado,
          "tipo" | "titulo" | "conteudo" | "conteudoJson"
        >,
        contexto,
      ),
    [conteudo, conteudoJson, contexto, tipo, titulo],
  );

  function update(next: CanonicalDocument) {
    onDocumentoChange?.({ ...next, version: model.version });
  }

  return (
    <div className="rounded-xl border border-border bg-background p-3 md:p-6">
      {!contexto?.assembleia?.data && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 font-sans text-sm text-amber-900">
          Data provisória — associe este documento a uma Sessão para usar a data da apresentação.
        </div>
      )}
      <article className="mx-auto min-h-[1123px] max-w-[794px] border border-slate-200 bg-white px-8 py-12 font-sans text-[16px] leading-[1.28] text-slate-950 shadow-card md:px-[82px] md:py-[76px]">
        <header>
          {model.header.logoUrl && (
            <img
              src={model.header.logoUrl}
              alt="Logótipo do partido"
              className="mx-auto mb-8 block max-h-[64px] max-w-[170px] object-contain"
              onError={(event) => event.currentTarget.remove()}
            />
          )}
          <EditableLine
            value={model.header.institution}
            readOnly={readOnly}
            className="text-left text-[26px] font-normal uppercase leading-tight tracking-normal text-black"
            onChange={(institution) =>
              update({ ...model, header: { ...model.header, institution } })
            }
          />
          <EditableLine
            value={model.header.mandate}
            readOnly={readOnly}
            placeholder="Mandato"
            className="mt-2 text-left text-[15px] text-black"
            onChange={(mandate) => update({ ...model, header: { ...model.header, mandate } })}
          />
          <EditableLine
            value={model.header.documentType}
            readOnly={readOnly}
            className="mt-8 text-center text-[28px] font-normal uppercase tracking-normal"
            onChange={(documentType) =>
              update({ ...model, header: { ...model.header, documentType } })
            }
          />
          <EditableLine
            value={model.header.title}
            readOnly={readOnly}
            className="mt-4 text-left text-[24px] font-normal leading-tight"
            onChange={(title) => update({ ...model, header: { ...model.header, title } })}
          />
        </header>

        <DocumentData model={model} readOnly={readOnly} update={update} />

        <main className="mt-9 space-y-8">
          {model.sections.map((section, index) => (
            <section key={section.id}>
              <EditableLine
                value={section.title}
                readOnly={readOnly}
                className="mb-3 text-left text-[20px] font-normal tracking-normal"
                onChange={(title) =>
                  update({
                    ...model,
                    sections: model.sections.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, title } : item,
                    ),
                  })
                }
              />
              {readOnly ? (
                <Blocks blocks={section.blocks} />
              ) : (
                <Textarea
                  aria-label={`Conteúdo de ${section.title}`}
                  value={blocksToText(section.blocks)}
                  onChange={(event) =>
                    update({
                      ...model,
                      sections: model.sections.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, blocks: parseBlocks(event.target.value) }
                          : item,
                      ),
                    })
                  }
                  className="min-h-[120px] resize-y border-slate-200 bg-white font-sans text-[16px] leading-[1.28] shadow-none"
                />
              )}
            </section>
          ))}
        </main>

        <footer className="mt-12 break-inside-avoid">
          <div className="mb-11 flex gap-1">
            <EditableLine
              value={model.closing.location}
              readOnly={readOnly}
              placeholder="Local"
              onChange={(location) => update({ ...model, closing: { ...model.closing, location } })}
            />
            {(model.closing.location || model.closing.date) && <span>,</span>}
            <EditableLine
              value={model.closing.date}
              readOnly={readOnly}
              placeholder="Data"
              onChange={(date) => update({ ...model, closing: { ...model.closing, date } })}
            />
          </div>
          <EditableLine
            value={model.closing.signatureLabel}
            readOnly={readOnly}
            placeholder="Designação da assinatura"
            onChange={(signatureLabel) =>
              update({ ...model, closing: { ...model.closing, signatureLabel } })
            }
          />
          {(["name", "role", "politicalGroup"] as const).map((field) => (
            <EditableLine
              key={field}
              value={model.closing[field]}
              readOnly={readOnly}
              placeholder={{ name: "Nome", role: "Cargo", politicalGroup: "Grupo político" }[field]}
              onChange={(value) =>
                update({ ...model, closing: { ...model.closing, [field]: value } })
              }
            />
          ))}
        </footer>
        <div className="mt-14 text-left text-[13px] text-slate-400">
          Tribuno • Documento preparado digitalmente • Página 1
        </div>
      </article>
    </div>
  );
}

function EditableLine({
  value,
  placeholder,
  readOnly,
  className = "",
  onChange,
}: {
  value?: string;
  placeholder?: string;
  readOnly: boolean;
  className?: string;
  onChange: (value: string) => void;
}) {
  if (readOnly) return value ? <div className={className}>{value}</div> : null;
  return (
    <Input
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={`h-auto border-transparent bg-transparent px-0 py-0 font-sans shadow-none hover:border-slate-200 ${className}`}
    />
  );
}

function DocumentData({
  model,
  readOnly,
  update,
}: {
  model: CanonicalDocument;
  readOnly: boolean;
  update: (model: CanonicalDocument) => void;
}) {
  if (readOnly && model.documentData.length === 0) return null;
  return (
    <section className="mt-11 font-sans text-[15px]">
      <h3 className="mb-3 text-[20px] font-normal">Dados do documento</h3>
      {model.documentData.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex gap-1">
          {readOnly ? (
            <span>{item.label}:</span>
          ) : (
            <Input
              aria-label={`Designação do dado ${index + 1}`}
              value={item.label}
              onChange={(event) =>
                update({
                  ...model,
                  documentData: model.documentData.map((current, itemIndex) =>
                    itemIndex === index ? { ...current, label: event.target.value } : current,
                  ),
                })
              }
              className="h-auto w-32 border-transparent bg-transparent px-0 py-0 shadow-none hover:border-slate-200"
            />
          )}
          <EditableLine
            value={item.value}
            readOnly={readOnly}
            onChange={(value) =>
              update({
                ...model,
                documentData: model.documentData.map((current, itemIndex) =>
                  itemIndex === index ? { ...current, value } : current,
                ),
              })
            }
          />
        </div>
      ))}
    </section>
  );
}

function Blocks({ blocks }: { blocks: CanonicalDocument["sections"][number]["blocks"] }) {
  let proximoNumero = 1;
  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        if (block.type === "ordered-list") {
          const inicio = proximoNumero;
          proximoNumero += block.items.length;
          return (
            <ol key={index} start={inicio} className="ml-6 list-decimal space-y-2">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          );
        }
        if (block.type === "bullet-list")
          return (
            <ul key={index} className="ml-6 list-disc space-y-2">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        return (
          <p key={index} className="whitespace-pre-line text-justify">
            {block.runs
              ? block.runs.map((run, runIndex) =>
                  run.bold ? (
                    <strong key={runIndex}>{run.text}</strong>
                  ) : (
                    <span key={runIndex}>{run.text}</span>
                  ),
                )
              : block.text}
          </p>
        );
      })}
    </div>
  );
}
