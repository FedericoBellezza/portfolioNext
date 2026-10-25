"use client";

import { useEffect, useState } from "react";
import { WhatsappLogoIcon } from "@phosphor-icons/react";
import { CTA, CONTACT } from "@/lib/site-data";

/**
 * Phone-only bar that keeps the two contact routes one tap away while the
 * visitor reads. Hidden on the hero (which has its own buttons) and on the
 * contact section (where the form already is).
 */
export default function MobileCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero");
    const contact = document.getElementById("contatti");
    if (!hero || !contact) return;

    const state = { hero: true, contact: false };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === hero) state.hero = entry.isIntersecting;
        if (entry.target === contact) state.contact = entry.isIntersecting;
      });
      setVisible(!state.hero && !state.contact);
    });
    observer.observe(hero);
    observer.observe(contact);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className="fixed inset-x-0 bottom-0 border-t px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 transition-[transform,opacity] duration-300 lg:hidden"
      style={{
        zIndex: "var(--fb-z-overlay)",
        background: "color-mix(in srgb, var(--fb-bg) 88%, transparent)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderColor: "var(--fb-line)",
        transform: visible ? "translateY(0)" : "translateY(110%)",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div className="flex gap-2">
        <a
          href="#contatti"
          tabIndex={visible ? 0 : -1}
          className="flex h-12 flex-1 items-center justify-center rounded-[var(--fb-r)] px-4 text-sm font-medium"
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
          tabIndex={visible ? 0 : -1}
          aria-label={CTA.whatsapp}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--fb-r)] border"
          style={{ borderColor: "var(--fb-line-strong)", color: "var(--fb-ink)" }}
        >
          <WhatsappLogoIcon size={20} />
        </a>
      </div>
    </div>
  );
}
