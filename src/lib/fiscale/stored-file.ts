import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { DOCUMENT_BUCKET, storedFileName } from "./documents";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Gives an archive file the name of what it is: copies it to
 * <user>/<uuid>/<title>.<ext> (the uuid folder keeps paths unique, so the file
 * name stays clean) and lets `save` point the row at the new path. The old
 * object is removed only once the row is saved; on any failure the file keeps
 * its old name and path. Returns the path in use.
 */
export async function renameStoredFile(
  supabase: Supabase,
  path: string,
  title: string,
  save: (newPath: string) => Promise<boolean>,
): Promise<string> {
  const [userId] = path.split("/");
  const to = `${userId}/${crypto.randomUUID()}/${storedFileName(title, path)}`;
  const bucket = supabase.storage.from(DOCUMENT_BUCKET);
  const { error } = await bucket.copy(path, to);
  if (error) {
    console.error("[fiscale] rename file:", error.message);
    return path;
  }
  if (!(await save(to))) {
    await bucket.remove([to]);
    return path;
  }
  await bucket.remove([path]);
  return to;
}
