"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard/fiscale", label: "Panoramica", match: [] as string[] },
  { href: "/dashboard/fiscale/fatture", label: "Fatture", match: ["/dashboard/fiscale/fatture", "/dashboard/fiscale/incassi"] },
  { href: "/dashboard/fiscale/clienti", label: "Clienti", match: ["/dashboard/fiscale/clienti"] },
  {
    href: "/dashboard/fiscale/scadenze",
    label: "Scadenze",
    match: ["/dashboard/fiscale/scadenze", "/dashboard/fiscale/inps-spese", "/dashboard/fiscale/export"],
  },
  { href: "/dashboard/fiscale/documenti", label: "Documenti", match: ["/dashboard/fiscale/documenti"] },
];

export function SubNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Sezioni fiscale" className="mb-8 flex gap-6 overflow-x-auto border-b border-[var(--fi-rule)]">
      {TABS.map(({ href, label, match }) => {
        const active = match.length === 0 ? pathname === href : match.some((m) => pathname.startsWith(m));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px shrink-0 border-b-2 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-[var(--fi-action)] ${
              active
                ? "border-[var(--fi-action)] font-medium text-[var(--fi-ink)]"
                : "border-transparent text-[var(--fi-ink-2)] hover:text-[var(--fi-ink)]"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
