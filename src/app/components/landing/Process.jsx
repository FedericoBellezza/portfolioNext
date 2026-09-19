"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "motion/react";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { PROCESS } from "@/lib/site-data";
import Reveal from "./Reveal";

gsap.registerPlugin(ScrollTrigger);

/**
 * Sticky-stack. Motivation: storytelling. The four phases happen in order,
 * so the scroll reveals them in order and physically stacks the finished ones
 * behind the current one.
 */
export default function Process() {
  const root = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce || !root.current) return;

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray(".stack-card");

      cards.forEach((card, i) => {
        if (i === cards.length - 1) return;

        ScrollTrigger.create({
          trigger: card,
          start: "top top",
          endTrigger: cards[cards.length - 1],
          end: "top top",
          pin: true,
          pinSpacing: false,
        });

        gsap.to(card, {
          scale: 0.94,
          opacity: 0.45,
          ease: "none",
          scrollTrigger: {
            trigger: cards[i + 1],
            start: "top bottom",
            end: "top top",
            scrub: true,
          },
        });
      });
    }, root);

    return () => ctx.revert();
  }, [reduce]);

  return (
    <section id="metodo" className="scroll-mt-24 px-5 pt-24 sm:px-8 lg:pt-32">
      <div className="mx-auto max-w-[1400px]">
        <Reveal className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            Come si svolge un lavoro con me
          </h2>
          <p
            className="mt-5 max-w-[60ch] text-lg leading-relaxed"
            style={{ color: "var(--fb-ink-2)" }}
          >
            Sempre lo stesso ordine, dal primo messaggio alla consegna delle
            chiavi.
          </p>
        </Reveal>
      </div>

      <div ref={root} className="relative mx-auto max-w-[1400px]">
        {PROCESS.map((phase) => (
          <div
            key={phase.id}
            className="stack-card sticky top-0 flex min-h-[88dvh] items-center py-6"
          >
            <article
              className="grid w-full grid-cols-1 gap-8 rounded-[var(--fb-r-lg)] border p-8 sm:p-12 lg:grid-cols-12 lg:items-end lg:p-16"
              style={{
                background: "var(--fb-surface)",
                borderColor: "var(--fb-line)",
                boxShadow: "var(--fb-shadow-lg)",
              }}
            >
              <div className="lg:col-span-8">
                <h3 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                  {phase.title}
                </h3>
                <p
                  className="mt-6 max-w-[58ch] text-lg leading-relaxed"
                  style={{ color: "var(--fb-ink-2)" }}
                >
                  {phase.body}
                </p>
              </div>

              <div className="lg:col-span-4">
                <p
                  className="inline-flex items-center gap-2 rounded-[var(--fb-r-sm)] px-4 py-2.5 text-sm font-medium"
                  style={{
                    background: "var(--fb-accent-soft)",
                    color: "var(--fb-accent)",
                  }}
                >
                  <CheckCircleIcon size={16} weight="fill" />
                  {phase.detail}
                </p>
              </div>
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}
