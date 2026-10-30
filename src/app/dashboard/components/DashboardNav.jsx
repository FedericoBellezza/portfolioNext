"use client";

import { createClient } from "@/lib/supabase/client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Home, LayoutDashboard, GraduationCap, TrendingUp } from "lucide-react";

const LINKS = [
  { href: "/dashboard/assistant", label: "Assistente", Icon: GraduationCap },
  { href: "/dashboard/trader", label: "Trader", Icon: TrendingUp },
];

// Sotto i 768px i link restano solo icona (con nome accessibile), così la barra non sborda.
const item =
  "inline-flex min-h-10 items-center gap-1.5 rounded-md px-2.5 text-sm transition-colors pointer-coarse:min-h-11";

export default function DashboardNav({ user }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--dashboard-border)] bg-[var(--dashboard-card-bg)] px-3 py-2.5 shadow-sm sm:px-6">
      <div className="container mx-auto flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1 sm:gap-3">
          <Link
            href="/dashboard"
            className="mr-1 flex shrink-0 items-center gap-2 rounded-md px-1 font-serif text-xl font-semibold text-[var(--dashboard-text)]"
          >
            <LayoutDashboard aria-hidden className="h-6 w-6 text-[var(--dashboard-accent)]" />
            <span className="hidden min-[400px]:inline">Dashboard</span>
            <span className="sr-only min-[400px]:hidden">Dashboard</span>
          </Link>
          {LINKS.map(({ href, label, Icon }) => {
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={`${item} uppercase tracking-wide ${
                  active
                    ? "bg-[var(--dashboard-bg-secondary)] text-[var(--dashboard-text)] [&>svg]:text-[var(--dashboard-accent)]"
                    : "text-[var(--dashboard-text-secondary)] hover:bg-[var(--dashboard-bg)] hover:text-[var(--dashboard-accent)]"
                }`}
              >
                <Icon aria-hidden className="h-4 w-4" />
                <span className={active ? "max-[359px]:sr-only" : "hidden md:inline"}>{label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <span className="mr-2 hidden max-w-[16rem] truncate text-sm text-[var(--dashboard-text-secondary)] lg:block">
            {user.email}
          </span>
          <Link
            href="/"
            aria-label="Portfolio"
            className={`${item} font-medium text-[var(--dashboard-text-secondary)] hover:bg-[var(--dashboard-bg-secondary)] hover:text-[var(--dashboard-accent)]`}
          >
            <Home aria-hidden className="h-4 w-4" />
            <span className="hidden sm:inline">Portfolio</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Logout"
            className={`${item} cursor-pointer border border-[var(--dashboard-border)] font-medium text-[var(--dashboard-text-secondary)] hover:border-[var(--dashboard-accent)] hover:bg-[var(--dashboard-bg-secondary)] hover:text-[var(--dashboard-accent)]`}
          >
            <LogOut aria-hidden className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
