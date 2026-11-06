"use client";

import {
  ADVISOR_BUCKET,
  ADVISOR_IMAGE,
  ADVISOR_MAX_FILE_BYTES,
  advisorFileType,
  isAdvisorFile,
} from "@/lib/fiscale/advisor-shared";
import { createClient } from "@/lib/supabase/client";

/** Photos are shrunk to this many pixels on the long side: plenty to read a document. */
const MAX_SIDE = 2000;
/** PNG and JPEG under this size and within MAX_SIDE are uploaded as they are. */
const KEEP_BYTES = 1.5 * 1024 * 1024;

export class AttachmentError extends Error {}

export const isImageFile = (f: { name: string; type?: string }) => Boolean(f.type?.startsWith("image/")) || ADVISOR_IMAGE.test(f.name);

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w.-]+/g, "_")
    .slice(-80);

/**
 * Checks a file and gets photos ready: JPEG, at most MAX_SIDE pixels a side,
 * the right way up. HEIC (iPhone) works where the browser can open it (Safari).
 */
export async function prepareFile(file: File): Promise<File> {
  if (!isImageFile(file)) {
    if (!isAdvisorFile(file.name)) {
      throw new AttachmentError(`"${file.name}": allega foto, PDF, Word (.docx), PowerPoint (.pptx) o file di testo.`);
    }
    if (file.size > ADVISOR_MAX_FILE_BYTES) throw new AttachmentError(`"${file.name}" è troppo grande (massimo 15 MB).`);
    return file;
  }

  const native = /^image\/(png|jpeg)$/.test(file.type);
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    bitmap = null;
  }
  if (!bitmap) {
    if (native && file.size <= ADVISOR_MAX_FILE_BYTES) return file;
    throw new AttachmentError(`Non riesco ad aprire "${file.name}": salvala come JPG o PNG e riprova.`);
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (native && scale === 1 && file.size <= KEEP_BYTES) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new AttachmentError(`Non riesco a preparare "${file.name}".`);
  // Transparent screenshots would turn black in a JPEG.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new AttachmentError(`Non riesco a preparare "${file.name}".`);
  const base = file.name.replace(/\.[^.]+$/, "") || "foto";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

/** Uploads the files of a message to the private chat bucket, in the user's folder. */
export async function uploadAttachments(files: File[]): Promise<{ path: string; name: string }[]> {
  if (files.length === 0) return [];
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new AttachmentError("Sessione scaduta: ricarica la pagina.");
  const userId = data.user.id;
  return Promise.all(
    files.map(async (file) => {
      const path = `${userId}/${crypto.randomUUID()}-${slug(file.name)}`;
      const { error } = await supabase.storage
        .from(ADVISOR_BUCKET)
        .upload(path, file, { contentType: advisorFileType(file.name) ?? file.type });
      if (error) throw new AttachmentError(`"${file.name}": caricamento non riuscito (${error.message}).`);
      return { path, name: file.name };
    }),
  );
}
