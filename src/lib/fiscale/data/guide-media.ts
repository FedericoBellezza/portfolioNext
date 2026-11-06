import "server-only";
import { createClient } from "@/lib/supabase/server";
import { GUIDE_MEDIA_SLOTS, type GuideMedia } from "../guides";

export const GUIDE_BUCKET = "fiscale-guide";

/**
 * The owner's guide images and videos, shared read-only with the users of the
 * fiscal section (storage policy in migration 0018). A user's own upload for a
 * slot wins over the shared one.
 */
const SHARED_GUIDE_FOLDER = "9e3b974d-02c8-41fc-bd0e-4347694bbbfa/guide";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Signed links (1 hour) to the files of one folder, by slot. */
async function folderMedia(supabase: Supabase, folder: string): Promise<GuideMedia> {
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

/**
 * Guide media by slot: one file per slot at `{user id}/guide/{slot}` (no
 * extension, so a new upload replaces the old one); the content type comes
 * from the stored metadata. Slots the user has not filled show the owner's.
 */
export async function loadGuideMedia(): Promise<GuideMedia> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return {};

  const own = `${auth.user.id}/guide`;
  const [shared, mine] = await Promise.all([
    own === SHARED_GUIDE_FOLDER ? Promise.resolve({}) : folderMedia(supabase, SHARED_GUIDE_FOLDER),
    folderMedia(supabase, own),
  ]);
  return { ...shared, ...mine };
}
