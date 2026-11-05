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

/**
 * File name of an archive file, from its title: what you get when you save
 * it. Storage keys only take ASCII letters, digits, spaces and a few signs, so
 * accents and symbols go ("3ª rata" → "3a rata"). The extension is kept.
 */
export function storedFileName(title: string, originalPath: string): string {
  const ext = /\.xml\.p7m$/i.test(originalPath) ? "xml.p7m" : (/\.([a-z0-9]{2,4})$/i.exec(originalPath)?.[1].toLowerCase() ?? "");
  const base =
    title
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[–—]/g, "-")
      .replace(/[^\w .,()&+-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100)
      .trim() || "Documento";
  return ext ? `${base}.${ext}` : base;
}

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
