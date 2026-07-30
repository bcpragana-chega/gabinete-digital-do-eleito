import type { CanonicalDocument } from "@/lib/document-model";

export type InstitutionalDocumentHeader = {
  logoUrl?: string;
  institution: string;
  institutionDisplay: string;
  mandate?: string;
  documentType: string;
  documentTypeDisplay: string;
  title: string;
};

export function composeInstitutionalDocumentHeader(
  header: CanonicalDocument["header"],
): InstitutionalDocumentHeader {
  return {
    logoUrl: header.logoUrl,
    institution: header.institution ?? "",
    institutionDisplay: header.institution?.toLocaleUpperCase("pt-PT") ?? "",
    mandate: header.mandate,
    documentType: header.documentType,
    documentTypeDisplay: header.documentType.toLocaleUpperCase("pt-PT"),
    title: header.title,
  };
}
