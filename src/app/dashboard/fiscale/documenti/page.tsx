import { connection } from "next/server";
import { FileText } from "lucide-react";
import { todayInRome } from "@/lib/fiscale/data/dashboard";
import { fiscaleDb } from "@/lib/fiscale/data/load";
import { DOCUMENT_BUCKET, DOCUMENT_CATEGORIES } from "@/lib/fiscale/documents";
import { createClient } from "@/lib/supabase/server";
import { date } from "../components/format";
import { ConfirmSubmit } from "../components/form-buttons";
import { DemoNotice, PageTitle, Panel, Section } from "../components/ui";
import { deleteDocumentAction } from "./actions";
import { UploadForm } from "./upload-form";

export const metadata = { title: "Documenti | Fiscale" };
// Claude reads the chosen file in this page's server actions.
export const maxDuration = 300;

type Doc = { id: string; title: string; category: string; year: number | null; file_path: string; size_bytes: number; created_at: string };

const size = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB`);

export default async function DocumentiPage() {
  await connection();
  const db = await fiscaleDb();
  const { data: profile } = await db.from("fiscal_profiles").select("user_id").maybeSingle();
  const demo = !profile;
  const { data } = demo
    ? { data: [] as Doc[] }
    : await db.from("documents").select("id, title, category, year, file_path, size_bytes, created_at").order("year", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
  const docs = (data ?? []) as Doc[];

  const links = new Map<string, string>();
  if (docs.length > 0) {
    const supabase = await createClient();
    const { data: signed } = await supabase.storage.from(DOCUMENT_BUCKET).createSignedUrls(docs.map((d) => d.file_path), 3600);
    for (const s of signed ?? []) if (s.path && s.signedUrl) links.set(s.path, s.signedUrl);
  }

  return (
    <>
      <PageTitle
        title="Documenti"
        description="Archivio privato della tua partita IVA: dichiarazioni, visure, comunicazioni INPS e INAIL, ricevute. Visibile solo a te."
      />
      <DemoNotice show={demo} />

      <div className="space-y-12">
        {!demo && (
          <Panel title="Carica un documento">
            <UploadForm currentYear={Number(todayInRome().slice(0, 4))} />
          </Panel>
        )}

        {docs.length === 0 ? (
          <p className="text-sm text-[var(--fi-ink-2)]">Ancora nessun documento.</p>
        ) : (
          DOCUMENT_CATEGORIES.filter((c) => docs.some((d) => d.category === c.id)).map((c) => (
            <Section key={c.id} title={c.label}>
              <ul className="divide-y divide-[var(--fi-rule)] rounded-xl border border-[var(--fi-rule)] bg-[var(--fi-surface)]">
                {docs
                  .filter((d) => d.category === c.id)
                  .map((d) => (
                    <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                      <FileText aria-hidden className="h-4 w-4 shrink-0 text-[var(--fi-muted)]" />
                      <div className="min-w-0 flex-1">
                        {links.get(d.file_path) ? (
                          <a
                            href={links.get(d.file_path)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block truncate text-sm underline-offset-4 hover:text-[var(--fi-action)] hover:underline"
                          >
                            {d.title}
                          </a>
                        ) : (
                          <span className="block truncate text-sm">{d.title}</span>
                        )}
                        <span className="block text-xs text-[var(--fi-muted)]">
                          {d.year ? `Anno ${d.year} · ` : ""}
                          {size(d.size_bytes)} · caricato il {date(d.created_at.slice(0, 10))}
                        </span>
                      </div>
                      <form action={deleteDocumentAction}>
                        <input type="hidden" name="id" value={d.id} />
                        <ConfirmSubmit
                          question="Eliminare il documento?"
                          className="text-xs text-[var(--fi-ink-2)] underline-offset-4 hover:text-[var(--fi-critical)] hover:underline"
                        >
                          Elimina
                        </ConfirmSubmit>
                      </form>
                    </li>
                  ))}
              </ul>
            </Section>
          ))
        )}
      </div>
    </>
  );
}
