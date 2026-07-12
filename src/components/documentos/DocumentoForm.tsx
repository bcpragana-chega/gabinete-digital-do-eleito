import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EstadoDocumento, TipoDocumento } from "@/lib/types";
import { adicionarDocumentoComUpload, type NovoDocumentoInput } from "@/lib/documentos-store";
import { DocumentoStorageErro } from "@/lib/documentos-storage";

const tipos: TipoDocumento[] = [
  "Convocatória",
  "Ata",
  "Orçamento",
  "Execução da Receita",
  "Execução da Despesa",
  "PPI",
  "Relatório",
  "Regulamento",
  "Proposta",
  "Declaração de voto",
  "Outro",
];

const estados: EstadoDocumento[] = ["Por rever", "Revisto", "Importante", "Arquivado"];

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DocumentoForm({
  assembleiaId,
  onSaved,
  onCancel,
}: {
  assembleiaId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<TipoDocumento>("Convocatória");
  const [data, setData] = useState(hoje());
  const [estado, setEstado] = useState<EstadoDocumento>("Por rever");
  const [ficheiroNome, setFicheiroNome] = useState<string | undefined>();
  const [ficheiroTipo, setFicheiroTipo] = useState<string | undefined>();
  const [ficheiro, setFicheiro] = useState<File | undefined>();
  const [notas, setNotas] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aGuardar, setAGuardar] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) {
      setErro("O título é obrigatório.");
      return;
    }

    const input: NovoDocumentoInput = {
      assembleiaId,
      titulo: titulo.trim(),
      tipo,
      data,
      estado,
      ficheiroNome,
      ficheiroTipo,
      ficheiroTamanho: ficheiro?.size,
      notas: notas.trim() || undefined,
    };

    try {
      setErro(null);
      setAGuardar(true);
      await adicionarDocumentoComUpload({ ...input, ficheiro });
      onSaved();
    } catch (error) {
      console.warn("[Tribuno Documentos] Criação falhou.", {
        operacao: "DOCUMENTO_CRIAR_FALHOU",
        codigo: error instanceof DocumentoStorageErro ? error.codigo : "DOCUMENTO_CRIAR_FALHOU",
      });
      setErro(
        error instanceof DocumentoStorageErro
          ? error.message
          : error instanceof Error
            ? error.message
            : "Não foi possível guardar o documento. Tente novamente.",
      );
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <div className="space-y-2">
          <Label htmlFor="doc-titulo">Título do documento</Label>
          <Input
            id="doc-titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex.: Convocatória da sessão de Julho"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoDocumento)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tipos.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={estado} onValueChange={(v) => setEstado(v as EstadoDocumento)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {estados.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="doc-data">Data do documento</Label>
          <Input
            id="doc-data"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="doc-ficheiro">Ficheiro</Label>
          <Input
            id="doc-ficheiro"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setFicheiro(f);
              setFicheiroNome(f?.name);
              setFicheiroTipo(f?.type);
            }}
          />
          <p className="text-xs text-muted-foreground">
            O PDF fica guardado em segurança para consulta posterior.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="doc-notas">Notas (opcional)</Label>
          <Textarea
            id="doc-notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={3}
            placeholder="Observações para uso interno…"
          />
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-border/70 bg-background px-6 py-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={aGuardar}>
          {aGuardar ? "A guardar..." : "Guardar documento"}
        </Button>
      </div>
    </form>
  );
}
