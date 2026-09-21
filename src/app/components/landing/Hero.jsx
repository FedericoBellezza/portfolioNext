import Image from "next/image";
import {
  ArrowRightIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import { CTA, CONTACT } from "@/lib/site-data";

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

// The intro used to be a GSAP timeline built inside a layout effect, which tied
// the first frame of the hero to hydration: the animation could only start once
// the client bundle for the whole landing page had parsed and run, and then it
// competed with that same work for the main thread, so it played in steps.
// It is plain CSS now. The keyframes are transform/opacity only, so the
// compositor runs them off the main thread and the hero is a server component
// shipping zero JS. Every delay below is in seconds and mirrors the old
// timeline: headline first, then the supporting copy, then the buttons.
const WORD_START = 0.14;
const WORD_STAGGER = 0.035;
const SUB_START = 0.7;
const CTA_START = 0.84;
const CTA_STAGGER = 0.06;

const delay = (seconds) => ({ "--fb-hero-delay": `${seconds}s` });

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-[100dvh] items-center px-5 pb-16 pt-24 sm:px-8"
    >
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
                  style={{
                    ...delay(WORD_START + i * WORD_STAGGER),
                    ...(word.accent ? { color: "var(--fb-accent)" } : null),
                  }}
                >
                  {word.text}
                </span>
                {i < HEADLINE.length - 1 && <span>&nbsp;</span>}
              </span>
            ))}
          </h1>

          <p
            className="hero-sub mb-10 max-w-[52ch] text-lg leading-relaxed"
            style={{ ...delay(SUB_START), color: "var(--fb-ink-2)" }}
          >
            Siti, e-commerce, gestionali e automazioni. Sviluppo da solo,
            consegno funzionante, resto raggiungibile dopo.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#contatti"
              className="hero-cta group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--fb-r)] px-7 py-4 text-sm font-medium transition-colors duration-200"
              style={{
                ...delay(CTA_START),
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
                ...delay(CTA_START + CTA_STAGGER),
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
                ...delay(CTA_START + CTA_STAGGER),
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
            {/* The mask does the reveal with overflow instead of animating
                clip-path on the image: clip-path repaints the whole portrait
                every frame, a transform does not. */}
            <div className="relative overflow-hidden rounded-[var(--fb-r-lg)]">
              <Image
                src="/foto-profilo.jpg"
                alt="Federico Bellezza, sviluppatore web freelance"
                width={840}
                height={1050}
                priority
                fetchPriority="high"
                sizes="(max-width: 1024px) 0px, 420px"
                className="fb-hero-portrait aspect-[4/5] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
