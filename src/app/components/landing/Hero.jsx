"use client";

import { useRef, useEffect, useLayoutEffect } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ArrowRightIcon, WhatsappLogoIcon } from "@phosphor-icons/react";
import { CTA, CONTACT } from "@/lib/site-data";

// Runs before paint on the client, falls back to useEffect during SSR so
// React does not warn about useLayoutEffect on the server.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Seven words, so it lands on two lines at desktop instead of three.
const HEADLINE = [
  { text: "Costruisco" },
  { text: "software" },
  { text: "su", accent: true },
  { text: "misura", accent: true },
  { text: "per" },
  { text: "la" },
  { text: "tua" },
  { text: "azienda." },
];

export default function Hero() {
  const root = useRef(null);

  // Empty dependency list on purpose. useReducedMotion() reports null on the
  // first render and only resolves on the second, and letting that re-run the
  // effect reverted the timeline mid-flight: opacity finished at 1 while the
  // words stayed translated 110% down, clipped out of sight by their wrapper.
  // The preference is read straight from matchMedia instead, so this runs once.
  useIsomorphicLayoutEffect(() => {
    const el = root.current;
    if (!el) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // The hidden start state ships in the HTML via [data-hero="pending"], so
    // there is no flash of the finished hero before GSAP takes over. Whatever
    // happens next, the attribute is cleared and the copy ends up visible.
    if (prefersReduced) {
      el.dataset.hero = "ready";
      return;
    }

    // Motivation: the headline lands first, then the supporting copy, so the
    // value proposition is read in the order it was written.
    const ctx = gsap.context(() => {
      el.dataset.hero = "ready";

      // fromTo, not from: both ends are declared, so nothing is inferred from
      // whatever the element happens to look like when the tween is built.
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      tl.fromTo(
        ".hero-eyebrow",
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4 },
      )
        .fromTo(
          ".hero-word",
          { yPercent: 110, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.65, stagger: 0.035 },
          "-=0.25",
        )
        .fromTo(
          ".hero-sub",
          { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.45 },
          "-=0.35",
        )
        // Kept under ~1.1s end to end: the primary CTA must be on screen fast.
        .fromTo(
          ".hero-cta",
          { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, stagger: 0.06 },
          "-=0.3",
        );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="hero"
      ref={root}
      data-hero="pending"
      className="relative flex min-h-[100dvh] items-center px-5 pb-16 pt-24 sm:px-8"
    >
      {/* Without JS the intro never runs, so reveal the copy immediately. */}
      <noscript>
        <style>{`[data-hero="pending"] .hero-word,[data-hero="pending"] .hero-eyebrow,[data-hero="pending"] .hero-sub,[data-hero="pending"] .hero-cta{opacity:1;transform:none}`}</style>
      </noscript>

      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <p
            className="hero-eyebrow mb-6 font-mono text-xs uppercase tracking-[0.18em]"
            style={{ color: "var(--fb-ink-3)" }}
          >
            Full stack developer e automazioni
          </p>

          <h1 className="mb-7 text-[2.5rem] font-semibold leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl">
            {HEADLINE.map((word, i) => (
              <span
                key={`${word.text}-${i}`}
                className="inline-block overflow-hidden pb-[0.12em] align-bottom"
              >
                <span
                  className="hero-word inline-block"
                  style={word.accent ? { color: "var(--fb-accent)" } : undefined}
                >
                  {word.text}
                </span>
                {i < HEADLINE.length - 1 && <span>&nbsp;</span>}
              </span>
            ))}
          </h1>

          <p
            className="hero-sub mb-10 max-w-[52ch] text-lg leading-relaxed"
            style={{ color: "var(--fb-ink-2)" }}
          >
            Siti, e-commerce, gestionali e automazioni. Sviluppo da solo,
            consegno funzionante, resto raggiungibile dopo.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#contatti"
              className="hero-cta group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--fb-r)] px-7 py-4 text-sm font-medium transition-colors duration-200"
              style={{
                background: "var(--fb-accent)",
                color: "var(--fb-accent-ink)",
              }}
            >
              {CTA.contact}
              <ArrowRightIcon
                size={16}
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </a>

            <a
              href="#progetti"
              className="hero-cta hidden items-center justify-center whitespace-nowrap rounded-[var(--fb-r)] border px-7 py-4 text-sm font-medium transition-colors duration-200 sm:inline-flex"
              style={{
                borderColor: "var(--fb-line-strong)",
                color: "var(--fb-ink)",
              }}
            >
              {CTA.work}
            </a>

            <a
              href={CONTACT.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="hero-cta inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--fb-r)] border px-7 py-4 text-sm font-medium sm:hidden"
              style={{
                borderColor: "var(--fb-line-strong)",
                color: "var(--fb-ink)",
              }}
            >
              <WhatsappLogoIcon size={18} />
              {CTA.whatsapp}
            </a>
          </div>
        </div>

        {/* Portrait, offset inside an accent frame so the split is asymmetric
            rather than two balanced halves. */}
        <div className="hidden lg:col-span-5 lg:block">
          <div className="relative ml-auto w-full max-w-[420px]">
            <div
              aria-hidden="true"
              className="absolute -bottom-5 -right-5 h-full w-full rounded-[var(--fb-r-lg)] border"
              style={{ borderColor: "var(--fb-accent)" }}
            />
            <Image
              src="/foto-profilo.jpg"
              alt="Federico Bellezza, sviluppatore web freelance"
              width={840}
              height={1050}
              priority
              sizes="(max-width: 1024px) 0px, 420px"
              className="fb-clip-up relative aspect-[4/5] w-full rounded-[var(--fb-r-lg)] object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
