import Image from "next/image";
import { ABOUT, STACK, TESTIMONIALS } from "@/lib/site-data";
import Reveal from "./Reveal";

/**
 * Answers the objection every company has with a freelancer ("who am I
 * dealing with, and what if he disappears?") right before prices. The
 * portrait lives here now, small, instead of in the hero.
 */
export default function About() {
  return (
    <section
      id="chi-sono"
      aria-labelledby="chi-sono-titolo"
      className="scroll-mt-24 px-5 py-24 sm:px-8 lg:py-32"
    >
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-12 md:grid-cols-12 lg:gap-16">
        <Reveal className="md:col-span-4 lg:col-span-3 lg:col-start-2">
          <div className="relative mx-auto w-full max-w-[280px] md:max-w-none">
            <div
              aria-hidden="true"
              className="absolute -bottom-3 -right-3 h-full w-full rounded-[var(--fb-r-lg)] border"
              style={{ borderColor: "var(--fb-accent)" }}
            />
            <Image
              src={ABOUT.photo.src}
              alt={ABOUT.photo.alt}
              width={560}
              height={700}
              sizes="(max-width: 768px) 280px, 320px"
              className="relative aspect-[4/5] w-full rounded-[var(--fb-r-lg)] object-cover"
            />
          </div>
        </Reveal>

        <Reveal delay={0.08} className="md:col-span-8 lg:col-span-7">
          <h2
            id="chi-sono-titolo"
            className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl"
          >
            {ABOUT.title}
          </h2>
          {ABOUT.body.map((paragraph) => (
            <p
              key={paragraph.slice(0, 24)}
              className="mt-5 max-w-[62ch] text-lg leading-relaxed"
              style={{ color: "var(--fb-ink-2)" }}
            >
              {paragraph}
            </p>
          ))}

          <ul
            aria-label="Tecnologie che utilizzo"
            className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-5"
          >
            {STACK.map((tech) => (
              <li key={tech.name}>
                <Image
                  src={tech.src}
                  alt={tech.name}
                  title={tech.name}
                  width={32}
                  height={32}
                  className="fb-logo h-7 w-7 object-contain"
                />
              </li>
            ))}
          </ul>
        </Reveal>
      </div>

      {TESTIMONIALS.length > 0 && (
        <div className="mx-auto mt-20 grid max-w-[1400px] grid-cols-1 gap-4 md:grid-cols-2">
          {TESTIMONIALS.map((item, index) => (
            <Reveal key={item.name} delay={index * 0.06}>
              <figure
                className="h-full rounded-[var(--fb-r-lg)] border p-7 sm:p-9"
                style={{
                  background: "var(--fb-surface)",
                  borderColor: "var(--fb-line)",
                }}
              >
                <blockquote className="text-lg leading-relaxed">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-5 text-sm">
                  <span className="font-semibold">{item.name}</span>
                  <span style={{ color: "var(--fb-ink-3)" }}>, {item.role}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}
