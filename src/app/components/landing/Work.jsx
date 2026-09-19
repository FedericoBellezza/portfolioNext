"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRightIcon, GithubLogoIcon } from "@phosphor-icons/react";
import { PROJECTS, CONTACT } from "@/lib/site-data";
import Reveal from "./Reveal";

gsap.registerPlugin(ScrollTrigger);

/**
 * Horizontal pan. Motivation: storytelling through breadth. Six projects read
 * as one continuous walk past a wall rather than a grid the eye skips.
 * Below lg, and under reduced motion, it degrades to a native swipe rail.
 */
export default function Work() {
  const wrap = useRef(null);
  const track = useRef(null);

  useEffect(() => {
    const mm = gsap.matchMedia();

    mm.add(
      "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
      () => {
        if (!wrap.current || !track.current) return;

        const getDistance = () =>
          track.current.scrollWidth - window.innerWidth + 64;

        gsap.to(track.current, {
          x: () => -getDistance(),
          ease: "none",
          scrollTrigger: {
            trigger: wrap.current,
            start: "top top",
            end: () => `+=${getDistance()}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });
      },
    );

    return () => mm.revert();
  }, []);

  return (
    <>
      <section id="progetti" className="scroll-mt-24 px-5 pt-24 sm:px-8 lg:pt-32">
        <div className="mx-auto max-w-[1400px]">
          <Reveal className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
              Cose che ho messo online
            </h2>
            <p
              className="mt-5 max-w-[60ch] text-lg leading-relaxed"
              style={{ color: "var(--fb-ink-2)" }}
            >
              Sei progetti veri, tutti raggiungibili. Aprili e guarda come si
              comportano.
            </p>
          </Reveal>
        </div>
      </section>

      <div
        ref={wrap}
        className="relative overflow-hidden py-12 lg:flex lg:h-[100dvh] lg:items-center lg:py-0"
      >
        <div
          ref={track}
          className="flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 sm:px-8 lg:items-stretch lg:overflow-x-visible lg:pb-0"
        >
          {PROJECTS.map((project) => (
            <article
              key={project.title}
              className="group flex w-[86vw] shrink-0 snap-center flex-col overflow-hidden rounded-[var(--fb-r-lg)] border transition-colors duration-300 sm:w-[62vw] lg:w-[clamp(380px,30vw,460px)]"
              style={{
                background: "var(--fb-surface)",
                borderColor: "var(--fb-line)",
              }}
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image
                  src={project.image}
                  alt={project.alt}
                  fill
                  sizes="(max-width: 640px) 86vw, (max-width: 1024px) 62vw, 460px"
                  className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.04]"
                />
              </div>

              <div className="flex flex-1 flex-col p-6 sm:p-7">
                <p
                  className="text-xs font-medium"
                  style={{ color: "var(--fb-accent)" }}
                >
                  {project.type}
                </p>

                <h3 className="mt-2 text-xl font-semibold tracking-tight">
                  {project.title}
                </h3>

                <p
                  className="mt-3 text-sm leading-relaxed"
                  style={{ color: "var(--fb-ink-2)" }}
                >
                  {project.description}
                </p>

                <ul className="mt-5 flex flex-wrap gap-1.5">
                  {project.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-[var(--fb-r-sm)] px-2.5 py-1 font-mono text-[11px]"
                      style={{
                        background: "var(--fb-surface-2)",
                        color: "var(--fb-ink-2)",
                      }}
                    >
                      {tag}
                    </li>
                  ))}
                </ul>

                {/* Pinned to the bottom so every card's link sits on one line. */}
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto inline-flex items-center gap-1.5 pt-7 text-sm font-medium"
                  style={{ color: "var(--fb-ink)" }}
                >
                  Apri {project.title}
                  <ArrowUpRightIcon
                    size={15}
                    className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-5 pb-24 sm:px-8 lg:pb-32">
        <Reveal>
          <a
            href={CONTACT.github}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[var(--fb-r)] border px-6 py-3.5 text-sm font-medium transition-colors duration-200"
            style={{
              borderColor: "var(--fb-line-strong)",
              color: "var(--fb-ink)",
            }}
          >
            <GithubLogoIcon size={18} />
            Il resto sta su GitHub
          </a>
        </Reveal>
      </div>
    </>
  );
}
