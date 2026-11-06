/** Limits and types of the fiscal chat shared by page and route (client-safe, no server deps). */

export const ADVISOR_MAX_MESSAGE = 12_000;
/** Safety cap only: Claude's folder takes up to 150 files, archive included (see the chat route). */
export const ADVISOR_MAX_FILES = 100;
/** Per file, after photos are shrunk in the browser (the bucket allows 20 MB). */
export const ADVISOR_MAX_FILE_BYTES = 15 * 1024 * 1024;
/** Turns of the conversation sent back with each question. */
export const ADVISOR_MAX_HISTORY = 20;

/** Private bucket of the chat attachments: `<user id>/<uuid>-<name>`, removed after 30 days. */
export const ADVISOR_BUCKET = "fiscale-chat";

/** What the browser uploads; photos are turned into JPEG first (HEIC, WebP, GIF included). */
const TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  xml: "application/xml",
  eml: "message/rfc822",
};
export const ADVISOR_IMAGE = /\.(png|jpe?g|webp|gif|heic|heif)$/i;
export const ADVISOR_ACCEPT = "image/*,.heic,.heif,.pdf,.docx,.pptx,.txt,.md,.csv,.xml,.eml";

export const extensionOf = (name: string) => /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() ?? "";
/** Content type for the upload, null when the chat does not take the file. */
export const advisorFileType = (name: string): string | null => TYPES[extensionOf(name)] ?? null;
export const isAdvisorFile = (name: string) => advisorFileType(name) !== null || ADVISOR_IMAGE.test(name);

export interface AdvisorFile {
  name: string;
  /** Text read from the file (an excerpt when it is long), kept for follow-up questions; empty for photos and scans. */
  text: string;
  /** Stored file Claude opens by itself: photos, scans, and the whole text when `text` is only an excerpt. */
  path?: string;
}

export interface AdvisorTurn {
  role: "user" | "assistant";
  content: string;
  files?: AdvisorFile[];
}

export interface AdvisorReply {
  ok: true;
  text: string;
  files: AdvisorFile[];
  model: string | null;
  durationMs: number | null;
}
