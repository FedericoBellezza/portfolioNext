"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard/fiscale", label: "Panoramica" },
  { href: "/dashboard/fiscale/fatture", label: "Fatture" },
  { href: "/dashboard/fiscale/clienti", label: "Clienti" },
  { href: "/dashboard/fiscale/inps-spese", label: "INPS e spese" },
  { href: "/dashboard/fiscale/scadenze", label: "Scadenze F24" },
  { href: "/dashboard/fiscale/export", label: "Export" },
] as const;

export function SubNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Sezioni fiscale" className="-mx-1 mb-8 flex gap-1 overflow-x-auto border-b border-[var(--fi-rule)]">
      {TABS.map(({ href, label }) => {
        const active = href === "/dashboard/fiscale" ? pathname === href : pathname?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm transition-colors ${
              active
                ? "border-[var(--fi-action)] font-medium text-[var(--fi-ink)]"
                : "border-transparent text-[var(--fi-ink-2)] hover:text-[var(--fi-action)]"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
