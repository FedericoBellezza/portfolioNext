/** Categories of the partita IVA document archive (client-safe, no server deps). */
export const DOCUMENT_CATEGORIES = [
  { id: "tax_return", label: "Dichiarazioni dei redditi" },
  { id: "f24", label: "F24 e ricevute di pagamento" },
  { id: "inps", label: "INPS" },
  { id: "inail", label: "INAIL" },
  { id: "chamber", label: "Camera di commercio e visure" },
  { id: "vat_registration", label: "Apertura e variazioni partita IVA" },
  { id: "other", label: "Altro" },
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number]["id"];

export const DOCUMENT_BUCKET = "fiscale-docs";
export const DOCUMENT_MAX_BYTES = 25 * 1024 * 1024;
export const DOCUMENT_ACCEPT = ".pdf,.png,.jpg,.jpeg,.xml,.p7m";

/** Content type for upload; browsers often leave .p7m and .xml without one. */
export function documentMime(file: { name: string; type: string }): string | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".p7m")) return "application/pkcs7-mime";
  if (name.endsWith(".xml")) return "application/xml";
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return null;
}
