"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin bar at the top while a page of the section loads: it starts on the
 * click of an internal link (tabs and query-string views included, which
 * loading.tsx does not cover) and ends when the URL has changed.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [active, setActive] = useState(false);

  useEffect(() => setActive(false), [pathname, search]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement) || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const to = new URL(a.href, location.href);
      // Other sites and file downloads (/api/...) do not change the page.
      if (to.origin !== location.origin || to.pathname.startsWith("/api/")) return;
      const here = new URL(location.href);
      // Same page (or only a #anchor): nothing loads.
      if (to.pathname === here.pathname && to.search === here.search) return;
      setActive(true);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Never stuck: a failed navigation leaves the URL as it was.
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setActive(false), 15_000);
    return () => clearTimeout(t);
  }, [active]);

  if (!active) return null;
  return (
    <div role="progressbar" aria-label="Caricamento della pagina" className="fi-nav-progress pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden">
      {/* Outside .fi, so the colour is spelled out (= --fi-action). */}
      <div className="h-full w-1/3 bg-[#4b5bdc]" />
    </div>
  );
}
