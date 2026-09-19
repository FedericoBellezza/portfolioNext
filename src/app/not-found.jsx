import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/lib/site-data";

export const metadata = {
  title: "Pagina non trovata",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] items-center px-5 py-24 sm:px-8">
      <div className="mx-auto w-full max-w-[1400px]">
        <p className="font-mono text-sm" style={{ color: "var(--fb-accent)" }}>
          404
        </p>

        <h1 className="mt-5 max-w-[16ch] text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
          Questa pagina non esiste
        </h1>

        <p
          className="mt-6 max-w-[55ch] text-lg leading-relaxed"
          style={{ color: "var(--fb-ink-2)" }}
        >
          Probabilmente il link è vecchio oppure c&apos;è un refuso
          nell&apos;indirizzo. Da qui puoi tornare dove volevi andare.
        </p>

        <div className="mt-10">
          <Button asChild variant="accent" size="fb">
            <Link href="/">Torna alla home</Link>
          </Button>
        </div>

        <nav
          aria-label="Sezioni del sito"
          className="mt-14 flex flex-wrap gap-x-6 gap-y-3 border-t pt-8"
          style={{ borderColor: "var(--fb-line)" }}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={`/${link.href}`}
              className="text-sm"
              style={{ color: "var(--fb-ink-2)" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
