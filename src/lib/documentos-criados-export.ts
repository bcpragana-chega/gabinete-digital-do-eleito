import { obterAuthState } from "@/lib/auth-store";
import type { DocumentoCriado } from "@/lib/types";

function escaparHtml(valor: string) {
  return valor
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function assinaturaInstitucional() {
  const { perfil, user } = obterAuthState();
  return (
    perfil?.assinaturaInstitucional?.trim() ||
    perfil?.nomeInstitucional?.trim() ||
    user?.nome?.trim() ||
    "Tribuno"
  );
}

function dataAtualFormatada() {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export function exportarDocumentoCriadoPDF(
  documento: DocumentoCriado,
  contexto?: {
    sessao?: string;
    assunto?: string;
    ponto?: string;
  },
) {
  const titulo = documento.titulo.trim() || "Documento sem titulo";
  const tipo = documento.tipo;
  const conteudo = documento.conteudo.trim() || "Sem conteudo.";
  const data = dataAtualFormatada();
  const assinatura = assinaturaInstitucional();
  const detalhes = [
    contexto?.assunto ? `Assunto: ${contexto.assunto}` : undefined,
    contexto?.sessao ? `Sessao: ${contexto.sessao}` : undefined,
    contexto?.ponto ? `Ponto: ${contexto.ponto}` : undefined,
  ].filter(Boolean);

  const janela = window.open("", "_blank", "noopener,noreferrer,width=900,height=1200");
  if (!janela) {
    window.print();
    return;
  }

  janela.document.write(`<!doctype html>
<html lang="pt">
  <head>
    <meta charset="utf-8" />
    <title>${escaparHtml(titulo)}</title>
    <style>
      @page { margin: 24mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #111827;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.65;
      }
      header {
        border-bottom: 1px solid #e5e7eb;
        margin-bottom: 32px;
        padding-bottom: 24px;
        text-align: center;
      }
      .brand {
        color: #6b7280;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }
      .type {
        color: #374151;
        font-size: 13px;
        font-weight: 700;
        margin-top: 10px;
        text-transform: uppercase;
      }
      h1 {
        font-size: 28px;
        line-height: 1.2;
        margin: 28px 0 0;
      }
      .meta {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        color: #4b5563;
        font-size: 13px;
        margin-bottom: 32px;
        padding: 16px 18px;
      }
      .content {
        font-size: 15px;
        white-space: pre-wrap;
      }
      footer {
        margin-top: 56px;
        page-break-inside: avoid;
      }
      .date {
        margin-bottom: 48px;
      }
      .signature {
        border-top: 1px solid #9ca3af;
        display: inline-block;
        min-width: 260px;
        padding-top: 10px;
      }
      @media print {
        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      }
    </style>
  </head>
  <body>
    <header>
      <div class="brand">Tribuno</div>
      <div class="type">${escaparHtml(tipo)}</div>
      <h1>${escaparHtml(titulo)}</h1>
    </header>
    ${
      detalhes.length > 0
        ? `<section class="meta">${detalhes.map((item) => escaparHtml(item ?? "")).join("<br />")}</section>`
        : ""
    }
    <main class="content">${escaparHtml(conteudo)}</main>
    <footer>
      <p class="date">Data: ${escaparHtml(data)}</p>
      <p class="signature">${escaparHtml(assinatura)}</p>
    </footer>
    <script>
      window.addEventListener("load", () => {
        window.focus();
        window.print();
      });
    </script>
  </body>
</html>`);
  janela.document.close();
}
