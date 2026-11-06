import "server-only";
import { accessOf } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { GUIDE_MEDIA_SLOTS, type GuideMedia } from "../guides";

export const GUIDE_BUCKET = "fiscale-guide";

/**
 * The payment tutorials: the owner's images and videos, one set for every
 * user (storage policy in migration 0019 lets any signed-in user read this
 * folder). One file per slot at `{owner id}/guide/{slot}` (no extension, so a
 * new upload replaces the old one); the content type comes from the stored metadata.
 */
const GUIDE_FOLDER = "9e3b974d-02c8-41fc-bd0e-4347694bbbfa/guide";

/** Signed links (1 hour) to the tutorials by slot, and whether this user may replace them (the owner only). */
export async function loadGuides(): Promise<{ media: GuideMedia; canUpload: boolean }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { media: {}, canUpload: false };
  const canUpload = accessOf(auth.user.email) === "owner";

  const { data: files, error } = await supabase.storage.from(GUIDE_BUCKET).list(GUIDE_FOLDER, { limit: 100 });
  if (error || !files?.length) return { media: {}, canUpload };

  const present = files.filter((f) => (GUIDE_MEDIA_SLOTS as readonly string[]).includes(f.name));
  if (present.length === 0) return { media: {}, canUpload };

  const paths = present.map((f) => `${GUIDE_FOLDER}/${f.name}`);
  const { data: signed } = await supabase.storage.from(GUIDE_BUCKET).createSignedUrls(paths, 3600);
  const media: GuideMedia = {};
  for (const f of present) {
    const url = signed?.find((s) => s.path === `${GUIDE_FOLDER}/${f.name}`)?.signedUrl;
    const mime = String((f.metadata as { mimetype?: string } | null)?.mimetype ?? "");
    if (url) media[f.name] = { url, kind: mime.startsWith("video/") ? "video" : "image" };
  }
  return { media, canUpload };
}
