import Image from "next/image";
import {
  ArrowRightIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import { CTA, CONTACT, HERO } from "@/lib/site-data";

// The intro is plain CSS on purpose: the keyframes run from the first paint,
// before and regardless of hydration, and touch only transform and opacity,
// so the compositor plays them off the main thread. The hero ships zero JS.
// Delays are in seconds: headline first, then the copy, then the buttons,
// then the screenshots settle in.
const HEADLINE_START = 0.1;
const SUB_START = 0.42;
const CTA_START = 0.54;
const CTA_STAGGER = 0.06;
const SHOT_START = 0.3;
const SHOT_STAGGER = 0.14;

const delay = (seconds) => ({ "--fb-hero-delay": `${seconds}s` });

/** A real screenshot inside a light browser frame. */
function Shot({ shot, priority, className, style }) {
  return (
    <figure
      className={`fb-hero-shot overflow-hidden rounded-[var(--fb-r)] border ${className}`}
      style={{
        background: "var(--fb-surface)",
        borderColor: "var(--fb-line-strong)",
        boxShadow: "var(--fb-shadow-lg)",
        ...style,
      }}
    >
      <div
        aria-hidden="true"
        className="flex h-7 items-center gap-1.5 border-b px-3"
        style={{
          borderColor: "var(--fb-line)",
          background: "var(--fb-surface-2)",
        }}
      >
        <span className="h-2 w-2 rounded-full" style={{ background: "var(--fb-line-strong)" }} />
        <span className="h-2 w-2 rounded-full" style={{ background: "var(--fb-line-strong)" }} />
        <span className="h-2 w-2 rounded-full" style={{ background: "var(--fb-line-strong)" }} />
      </div>
      <Image
        src={shot.src}
        alt={shot.alt}
        width={shot.width}
        height={shot.height}
        priority={priority}
        fetchPriority={priority ? "high" : undefined}
        sizes="(max-width: 1024px) 92vw, 560px"
        className="block h-auto w-full"
      />
    </figure>
  );
}

export default function Hero() {
  const [front, back] = HERO.shots;

  return (
    <section
      id="hero"
      className="relative flex min-h-[100dvh] items-center overflow-hidden px-5 pb-16 pt-28 sm:px-8 lg:pt-24"
    >
      {/* One soft wash of the brand green behind the screenshots, so the
          right half has depth without a decorative object in it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 55% at 82% 45%, var(--fb-accent-soft) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto grid w-full max-w-[1400px] grid-cols-1 items-center gap-14 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-7">
          <p
            className="hero-eyebrow mb-6 font-mono text-xs uppercase tracking-[0.18em]"
            style={{ color: "var(--fb-ink-3)" }}
          >
            {HERO.eyebrow}
          </p>

          <h1
            className="hero-sub mb-7 text-[2.4rem] font-semibold leading-[1.06] tracking-tight text-balance sm:text-5xl xl:text-[3.6rem]"
            style={delay(HEADLINE_START)}
          >
            {HERO.headline.lead}{" "}
            <span className="lg:block" style={{ color: "var(--fb-accent)" }}>
              {HERO.headline.accent}
            </span>
          </h1>

          <p
            className="hero-sub mb-10 max-w-[50ch] text-lg leading-relaxed"
            style={{ ...delay(SUB_START), color: "var(--fb-ink-2)" }}
          >
            {HERO.sub}
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#contatti"
              className="hero-cta group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--fb-r)] px-7 py-4 text-sm font-medium transition-[background-color,transform] duration-200 hover:bg-[var(--fb-accent-hover)] active:translate-y-px"
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
              className="hero-cta hidden items-center justify-center whitespace-nowrap rounded-[var(--fb-r)] border px-7 py-4 text-sm font-medium transition-colors duration-200 hover:bg-[var(--fb-surface-2)] sm:inline-flex"
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

        {/* Two shipped products, overlapped: the back one peeks out above,
            the front one carries the eye. Links to the full list below. */}
        <a
          href="#progetti"
          aria-label="Vedi i progetti realizzati"
          className="group relative block lg:col-span-5"
        >
          <div className="relative mx-auto w-full max-w-[640px] lg:mr-0">
            <Shot
              shot={back}
              className="relative ml-[16%] w-[84%] transition-transform duration-500 group-hover:-translate-y-1"
              style={delay(SHOT_START)}
            />
            <Shot
              shot={front}
              priority
              className="relative -mt-[16%] w-[84%] transition-transform duration-500 group-hover:translate-y-1"
              style={delay(SHOT_START + SHOT_STAGGER)}
            />
          </div>
        </a>
      </div>
    </section>
  );
}
