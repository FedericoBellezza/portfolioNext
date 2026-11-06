"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, FileText, FolderOpen, LayoutDashboard, MessagesSquare, Plus, Users } from "lucide-react";

const TABS = [
  { href: "/dashboard/fiscale", label: "Panoramica", icon: LayoutDashboard, match: [] as string[] },
  {
    href: "/dashboard/fiscale/fatture",
    label: "Fatture",
    icon: FileText,
    match: ["/dashboard/fiscale/fatture", "/dashboard/fiscale/incassi"],
  },
  { href: "/dashboard/fiscale/clienti", label: "Clienti", icon: Users, match: ["/dashboard/fiscale/clienti"] },
  {
    href: "/dashboard/fiscale/scadenze",
    label: "Scadenze",
    icon: CalendarClock,
    match: ["/dashboard/fiscale/scadenze", "/dashboard/fiscale/inps-spese", "/dashboard/fiscale/export"],
  },
  { href: "/dashboard/fiscale/documenti", label: "Documenti", icon: FolderOpen, match: ["/dashboard/fiscale/documenti"] },
  { href: "/dashboard/fiscale/chiedi", label: "Chiedi", icon: MessagesSquare, match: ["/dashboard/fiscale/chiedi"] },
];

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70";

/** App rail: vertical on desktop, a horizontal bar on small screens. */
export function SubNav() {
  const pathname = usePathname() ?? "";
  const newInvoice = pathname.startsWith("/dashboard/fiscale/fatture/nuova");

  return (
    <aside className="shrink-0 bg-[var(--fi-rail)] text-[var(--fi-rail-ink)] lg:w-60">
      <div className="lg:sticky lg:top-[61px] lg:flex lg:h-[calc(100vh-61px)] lg:flex-col lg:px-3 lg:py-6">
        <div className="hidden px-3 pb-6 lg:block">
          <p className="text-[15px] font-semibold text-white">Fiscale</p>
          <p className="mt-0.5 text-xs">Forfettario · artigiano</p>
        </div>

        <nav aria-label="Sezioni fiscale" className="flex gap-1 overflow-x-auto px-2 py-2 lg:flex-col lg:overflow-visible lg:p-0">
          {TABS.map(({ href, label, icon: Icon, match }) => {
            const active = match.length === 0 ? pathname === href : match.some((m) => pathname.startsWith(m));
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-150 ${focus} ${
                  active
                    ? "bg-[var(--fi-rail-active)] font-medium text-white"
                    : "hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon aria-hidden className={`h-4 w-4 ${active ? "text-white" : "text-[var(--fi-rail-ink)]/80"}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:mt-auto lg:block">
          <Link
            href="/dashboard/fiscale/fatture/nuova"
            aria-current={newInvoice ? "page" : undefined}
            className={`flex items-center justify-center gap-2 rounded-lg bg-[var(--fi-action)] px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--fi-action-hover)] ${focus}`}
          >
            <Plus aria-hidden className="h-4 w-4" />
            Nuova fattura
          </Link>
        </div>
      </div>
    </aside>
  );
}
