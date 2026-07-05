import { useEffect, useState, type ReactNode } from "react";
import { Download, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { criarUrlAssinadaDocumento } from "@/lib/documentos-storage";
import type { Documento } from "@/lib/types";

type EstadoPreview = "idle" | "loading" | "ready" | "empty" | "error";

export function DocumentoPreview({ documento }: { documento: Documento }) {
  const [estado, setEstado] = useState<EstadoPreview>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [downloadUrl, setDownloadUrl] = useState<string | undefined>();

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      if (!documento.storagePath) {
        setEstado("empty");
        setPreviewUrl(undefined);
        setDownloadUrl(undefined);
        return;
      }

      try {
        setEstado("loading");
        const [signedPreviewUrl, signedDownloadUrl] = await Promise.all([
          criarUrlAssinadaDocumento(documento.storagePath),
          criarUrlAssinadaDocumento(documento.storagePath, {
            download: documento.ficheiroNome || true,
          }),
        ]);

        if (!ativo) return;

        if (!signedPreviewUrl) {
          setEstado("empty");
          return;
        }

        setPreviewUrl(signedPreviewUrl);
        setDownloadUrl(signedDownloadUrl ?? signedPreviewUrl);
        setEstado("ready");
      } catch (error) {
        console.warn("[Tribuno] Não foi possível obter o PDF do documento.", error);
        if (!ativo) return;
        setPreviewUrl(undefined);
        setDownloadUrl(undefined);
        setEstado("error");
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, [documento.ficheiroNome, documento.storagePath]);

  if (estado === "loading" || estado === "idle") {
    return (
      <DocumentoPreviewShell ficheiroNome={documento.ficheiroNome}>
        <p className="text-sm text-muted-foreground">A carregar PDF...</p>
      </DocumentoPreviewShell>
    );
  }

  if (estado === "empty") {
    return (
      <DocumentoPreviewShell ficheiroNome={documento.ficheiroNome}>
        <p className="text-sm text-muted-foreground">
          Este documento ainda não tem ficheiro PDF associado.
        </p>
      </DocumentoPreviewShell>
    );
  }

  if (estado === "error" || !previewUrl) {
    return (
      <DocumentoPreviewShell ficheiroNome={documento.ficheiroNome}>
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar o ficheiro. Pode ter sido removido ou expirado.
        </p>
      </DocumentoPreviewShell>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex flex-col gap-3 border-b border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {documento.ficheiroNome ?? documento.titulo}
          </p>
          <p className="text-xs text-muted-foreground">PDF guardado no Tribuno</p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Button asChild variant="secondary" size="sm">
            <a href={previewUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir em nova janela
            </a>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <a href={downloadUrl ?? previewUrl}>
              <Download className="mr-2 h-4 w-4" />
              Transferir PDF
            </a>
          </Button>
        </div>
      </div>

      <div className="h-[70dvh] min-h-[520px] bg-muted/40 sm:h-[760px]">
        <iframe
          title={documento.titulo}
          src={`${previewUrl}#toolbar=1&navpanes=0`}
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
}

function DocumentoPreviewShell({
  ficheiroNome,
  children,
}: {
  ficheiroNome?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background/50 px-5 py-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <FileText className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">
        {ficheiroNome ?? "Sem ficheiro associado"}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
