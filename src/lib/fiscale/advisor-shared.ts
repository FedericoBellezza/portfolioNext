/** Limits and types of the fiscal chat shared by page and route (client-safe, no server deps). */

export const ADVISOR_MAX_MESSAGE = 12_000;
export const ADVISOR_MAX_FILES = 3;
/** Vercel refuses request bodies over 4.5 MB: files of one message stay under this. */
export const ADVISOR_MAX_FILES_BYTES = 4 * 1024 * 1024;
export const ADVISOR_ACCEPT = ".pdf,.txt,.eml,.md,.xml,.csv";
/** Turns of the conversation sent back with each question. */
export const ADVISOR_MAX_HISTORY = 20;

export interface AdvisorFile {
  name: string;
  /** Text read from the file, kept so follow-up questions can still use it. */
  text: string;
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
