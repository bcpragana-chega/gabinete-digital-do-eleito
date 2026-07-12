import type { ResolvedInstitutionalContext } from "@/lib/ai/institutional-context";

export const CONVOCATORIA_EXTRACTION_VERSION = "1" as const;

export type ConvocatoriaBodyType =
  | "PARISH_ASSEMBLY"
  | "MUNICIPAL_ASSEMBLY"
  | "PARISH_EXECUTIVE"
  | "MUNICIPAL_EXECUTIVE"
  | "UNKNOWN";

export type ConvocatoriaSessionType = "ORDINARY" | "EXTRAORDINARY" | "OTHER" | "UNKNOWN";

export type ConvocatoriaImportErrorCode =
  | "INVALID_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "PDF_TEXT_UNAVAILABLE"
  | "DOCUMENT_NOT_CONVOCATORIA"
  | "EXTRACTION_FAILED"
  | "INSTITUTIONAL_PROFILE_INCOMPLETE"
  | "INSTITUTIONAL_BODY_MISMATCH"
  | "MISSING_REQUIRED_SESSION_DATA"
  | "POSSIBLE_DUPLICATE_SESSION"
  | "SESSION_CREATION_FAILED"
  | "AGENDA_CREATION_FAILED"
  | "DOCUMENT_ASSOCIATION_FAILED"
  | "CONVOCATORIA_IMPORT_FAILED";

export interface ConvocatoriaExtractionResult {
  documentClassification: {
    isConvocatoria: boolean;
    confidence: number;
    detectedDocumentType?: string;
    reason?: string;
  };
  session: {
    bodyName?: string;
    bodyType?: ConvocatoriaBodyType;
    sessionType?: ConvocatoriaSessionType;
    sessionTitle?: string;
    sessionNumber?: string;
    date?: string;
    time?: string;
    location?: string;
    conveningAuthority?: string;
  };
  agendaItems: Array<{
    order: number;
    title: string;
    description?: string;
    originalText?: string;
  }>;
  observations?: string[];
  fieldConfidence: {
    body?: number;
    sessionType?: number;
    date?: number;
    time?: number;
    location?: number;
    agendaItems?: number;
  };
  extractionWarnings?: string[];
}

export interface ConvocatoriaPreview {
  orgao: string;
  bodyType: ConvocatoriaBodyType;
  tipoSessao: "Ordinária" | "Extraordinária" | "Outra";
  titulo: string;
  numero?: string;
  data: string;
  hora: string;
  local: string;
  convocante?: string;
  pontos: Array<{
    order: number;
    title: string;
    description: string;
    originalText?: string;
  }>;
  observacoes: string[];
  avisos: string[];
}

export type ConvocatoriaAnalysisSuccess = {
  ok: true;
  extraction: ConvocatoriaExtractionResult;
  preview: ConvocatoriaPreview;
  institutionalContext: ResolvedInstitutionalContext;
};

export type ConvocatoriaAnalysisFailure = {
  ok: false;
  code: ConvocatoriaImportErrorCode;
  message: string;
  warnings?: string[];
};

export type ConvocatoriaAnalysisResult =
  | ConvocatoriaAnalysisSuccess
  | ConvocatoriaAnalysisFailure;
