"use client";

import { useEffect, useState } from "react";
import { useScroll, useMotionValueEvent } from "motion/react";
import { ListIcon, XIcon, WhatsappLogoIcon } from "@phosphor-icons/react";
import { NAV_LINKS, CTA, CONTACT } from "@/lib/site-data";
import ThemeControl from "./ThemeControl";

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const [active, setActive] = useState("");

  // Motion's scroll value instead of a raw scroll listener: batched,
  // no re-render per frame beyond the single boolean flip.
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => {
    setCondensed((prev) => (prev === y > 24 ? prev : y > 24));
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    document
      .querySelectorAll("section[id]")
      .forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  // Lock body scroll while the mobile sheet is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className="fixed inset-x-0 top-0 transition-colors duration-300"
      style={{
        zIndex: "var(--fb-z-nav)",
        background: condensed || open ? "color-mix(in srgb, var(--fb-bg) 82%, transparent)" : "transparent",
        backdropFilter: condensed || open ? "blur(14px)" : "none",
        borderBottom: `1px solid ${condensed ? "var(--fb-line)" : "transparent"}`,
      }}
    >
      <div className="mx-auto flex h-[68px] max-w-[1400px] items-center justify-between px-5 sm:px-8">
        <a
          href="#hero"
          className="font-mono text-[15px] font-medium tracking-tight"
          style={{ color: "var(--fb-ink)" }}
        >
          federico<span style={{ color: "var(--fb-accent)" }}>.</span>bellezza
        </a>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Principale">
          {NAV_LINKS.map((link) => {
            const isActive = active === link.href.slice(1);
            return (
              <a
                key={link.href}
                href={link.href}
                aria-current={isActive ? "true" : undefined}
                className="rounded-[var(--fb-r-sm)] px-3 py-2 text-sm font-medium transition-colors duration-200"
                style={{ color: isActive ? "var(--fb-ink)" : "var(--fb-ink-2)" }}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeControl />
          <a
            href="#contatti"
            className="whitespace-nowrap rounded-[var(--fb-r-sm)] px-4 py-2.5 text-sm font-medium transition-colors duration-200"
            style={{
              background: "var(--fb-accent)",
              color: "var(--fb-accent-ink)",
            }}
          >
            {CTA.contact}
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? "Chiudi il menu" : "Apri il menu"}
          className="cursor-pointer rounded-[var(--fb-r-sm)] p-2 lg:hidden"
          style={{ color: "var(--fb-ink)" }}
        >
          {open ? <XIcon size={22} /> : <ListIcon size={22} />}
        </button>
      </div>

      <div
        id="menu-mobile"
        hidden={!open}
        className="border-t lg:hidden"
        style={{
          borderColor: "var(--fb-line)",
          background: "var(--fb-bg)",
        }}
      >
        <div className="flex flex-col gap-1 px-5 pb-6 pt-4">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-[var(--fb-r-sm)] py-3 text-base font-medium"
              style={{ color: "var(--fb-ink)" }}
            >
              {link.label}
            </a>
          ))}

          <a
            href="#contatti"
            onClick={() => setOpen(false)}
            className="mt-3 rounded-[var(--fb-r-sm)] px-4 py-3.5 text-center text-sm font-medium"
            style={{
              background: "var(--fb-accent)",
              color: "var(--fb-accent-ink)",
            }}
          >
            {CTA.contact}
          </a>
          <a
            href={CONTACT.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 rounded-[var(--fb-r-sm)] border px-4 py-3.5 text-sm font-medium"
            style={{ borderColor: "var(--fb-line-strong)", color: "var(--fb-ink)" }}
          >
            <WhatsappLogoIcon size={18} />
            {CTA.whatsapp}
          </a>

          <div className="mt-5 flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--fb-ink-3)" }}>
              Tema
            </span>
            <ThemeControl />
          </div>
        </div>
      </div>
    </header>
  );
}
