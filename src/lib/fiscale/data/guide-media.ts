import "server-only";
import { createClient } from "@/lib/supabase/server";
import { GUIDE_MEDIA_SLOTS, type GuideMedia } from "../guides";

export const GUIDE_BUCKET = "fiscale-guide";

/**
 * Signed links (1 hour) to the owner's guide images and videos, by slot.
 * One file per slot at `{user id}/guide/{slot}` (no extension, so a new upload
 * replaces the old one); the content type comes from the stored metadata.
 */
export async function loadGuideMedia(): Promise<GuideMedia> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return {};

  const folder = `${auth.user.id}/guide`;
  const { data: files, error } = await supabase.storage.from(GUIDE_BUCKET).list(folder, { limit: 100 });
  if (error || !files?.length) return {};

  const present = files.filter((f) => (GUIDE_MEDIA_SLOTS as readonly string[]).includes(f.name));
  if (present.length === 0) return {};

  const paths = present.map((f) => `${folder}/${f.name}`);
  const { data: signed } = await supabase.storage.from(GUIDE_BUCKET).createSignedUrls(paths, 3600);
  const media: GuideMedia = {};
  for (const f of present) {
    const url = signed?.find((s) => s.path === `${folder}/${f.name}`)?.signedUrl;
    const mime = String((f.metadata as { mimetype?: string } | null)?.mimetype ?? "");
    if (url) media[f.name] = { url, kind: mime.startsWith("video/") ? "video" : "image" };
  }
  return media;
}
