"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, Upload } from "lucide-react";
import type { Guide, GuideMedia, GuideStep } from "@/lib/fiscale/guides";
import { createClient } from "@/lib/supabase/client";
import { btn, cx } from "./ui";

const BUCKET = "fiscale-guide";
const MAX_BYTES = 50 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/webp,video/mp4,video/webm";

function Paragraphs({ body }: { body: string[] }) {
  const blocks: (string | string[])[] = [];
  for (const line of body) {
    if (line.startsWith("• ")) {
      const last = blocks.at(-1);
      if (Array.isArray(last)) last.push(line.slice(2));
      else blocks.push([line.slice(2)]);
    } else blocks.push(line);
  }
  return (
    <div className="space-y-2 text-sm text-[var(--fi-ink-2)]">
      {blocks.map((b, i) =>
        Array.isArray(b) ? (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {b.map((li) => (
              <li key={li}>{li}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{b}</p>
        ),
      )}
    </div>
  );
}

/** Owner-only upload of the image or video of a step, straight to the private bucket. */
function MediaUpload({ slot, replace }: { slot: string; replace: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  async function upload(file: File) {
    if (file.size > MAX_BYTES) return setStatus("File oltre 50 MB.");
    setStatus("Caricamento…");
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return setStatus("Sessione scaduta: ricarica la pagina.");
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(`${data.user.id}/guide/${slot}`, file, { upsert: true, contentType: file.type });
    if (error) return setStatus("Caricamento non riuscito.");
    setStatus(null);
    router.refresh(); // new signed link from the server
  }

  return (
    <label
      className={cx(
        "flex cursor-pointer items-center gap-2 text-xs text-[var(--fi-ink-2)] hover:text-[var(--fi-action)]",
        !replace && "justify-center rounded-lg border border-dashed border-[var(--fi-rule)] bg-white/60 px-4 py-8",
      )}
    >
      <Upload aria-hidden className="h-4 w-4" />
      {status ?? (replace ? "Sostituisci immagine o video" : "Carica immagine o video per questo passo")}
      <input
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function StepMedia({ step, media, canUpload }: { step: GuideStep; media: GuideMedia; canUpload: boolean }) {
  if (!step.media) return null;
  const file = media[step.media];
  if (!file) return canUpload ? <MediaUpload slot={step.media} replace={false} /> : null;
  return (
    <div className="space-y-1.5">
      {file.kind === "video" ? (
        <video
          key={file.url}
          src={file.url}
          controls
          playsInline
          preload="metadata"
          className="w-full rounded-lg border border-[var(--fi-rule)] bg-black"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage
        <img src={file.url} alt={step.title} className="w-full rounded-lg border border-[var(--fi-rule)]" />
      )}
      {canUpload && <MediaUpload slot={step.media} replace />}
    </div>
  );
}

/**
 * "Come pagare": the guide steps, then the registration form as the last step.
 */
export function GuideStepper({
  guide,
  media,
  canUpload,
  children,
}: {
  guide: Guide;
  media: GuideMedia;
  canUpload: boolean;
  children: React.ReactNode;
}) {
  const total = guide.steps.length + 1;
  const [index, setIndex] = useState(0);
  const step = guide.steps[index];
  const last = index === guide.steps.length;

  return (
    <div className="mt-3 rounded-lg bg-white/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="fi-label">{guide.title}</p>
        <p className="fi-num text-xs text-[var(--fi-muted)]">
          Passo {index + 1} di {total}
        </p>
      </div>
      <div className="mb-4 flex gap-1" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={cx("h-1 flex-1 rounded-full", i <= index ? "bg-[var(--fi-action)]" : "bg-[var(--fi-fill)]")} />
        ))}
      </div>

      {last ? (
        <div>
          <h3 className="fi-display mb-2 text-[17px] font-semibold">Registra il pagamento</h3>
          {children}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className={cx(!step.media && "lg:col-span-2")}>
            <h3 className="fi-display mb-2 text-[17px] font-semibold">{step.title}</h3>
            <Paragraphs body={step.body} />
            {step.link && (
              <a
                href={step.link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-[var(--fi-action)] underline"
              >
                {step.link.label} <ExternalLink aria-hidden className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          {step.media && (
            <div className="lg:order-first">
              <StepMedia step={step} media={media} canUpload={canUpload} />
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--fi-rule)] pt-3">
        <button type="button" className={btn.outline} disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
          <ArrowLeft aria-hidden className="h-4 w-4" /> Indietro
        </button>
        {!last ? (
          <button type="button" className={btn.primary} onClick={() => setIndex((i) => i + 1)}>
            Avanti <ArrowRight aria-hidden className="h-4 w-4" />
          </button>
        ) : (
          <button type="button" className="text-xs text-[var(--fi-ink-2)] underline" onClick={() => setIndex(0)}>
            Rivedi la guida
          </button>
        )}
      </div>
    </div>
  );
}
