import {
  CodeIcon,
  LightningIcon,
  DatabaseIcon,
  SparkleIcon,
  CheckIcon,
} from "@phosphor-icons/react/dist/ssr";
import { SERVICES } from "@/lib/site-data";
import Reveal from "./Reveal";

const ICONS = {
  fullstack: CodeIcon,
  automation: LightningIcon,
  data: DatabaseIcon,
  ai: SparkleIcon,
};

/**
 * Surface variation only. A solid-accent fill was tried first and dropped:
 * body copy on top of it could not clear WCAG AA in both themes.
 */
function cellStyle(tone) {
  switch (tone) {
    case "accent":
      return {
        background: "var(--fb-accent-soft)",
        borderColor: "var(--fb-accent-soft)",
      };
    case "dots":
      return {
        background: "var(--fb-surface-2)",
        borderColor: "var(--fb-line)",
      };
    default:
      return {
        background: "var(--fb-surface)",
        borderColor: "var(--fb-line)",
      };
  }
}

export default function Services() {
  return (
    <section id="servizi" className="scroll-mt-24 px-5 py-24 sm:px-8 lg:py-32">
      <div className="mx-auto max-w-[1400px]">
        <Reveal className="mb-14 max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            Quattro cose che so fare bene
          </h2>
          <p
            className="mt-5 max-w-[60ch] text-lg leading-relaxed"
            style={{ color: "var(--fb-ink-2)" }}
          >
            Di solito un progetto ne tocca due o tre insieme. Le trovi qui
            separate solo per chiarezza.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {SERVICES.map((service, index) => {
            const Icon = ICONS[service.id];
            const muted = "var(--fb-ink-2)";

            return (
              <Reveal
                key={service.id}
                delay={index * 0.07}
                className={service.area}
              >
                <article
                  className="relative flex h-full flex-col overflow-hidden rounded-[var(--fb-r-lg)] border p-7 sm:p-9"
                  style={cellStyle(service.tone)}
                >
                  {service.tone === "dots" && (
                    <span
                      aria-hidden="true"
                      className="fb-dots pointer-events-none absolute inset-0 opacity-70"
                      style={{
                        maskImage:
                          "radial-gradient(ellipse at 85% 0%, #000 0%, transparent 65%)",
                        WebkitMaskImage:
                          "radial-gradient(ellipse at 85% 0%, #000 0%, transparent 65%)",
                      }}
                    />
                  )}

                  <div className="relative flex h-full flex-col">
                    <Icon
                      size={26}
                      weight="duotone"
                      style={{ color: "var(--fb-accent)" }}
                    />

                    <h3 className="mt-6 text-xl font-semibold tracking-tight sm:text-2xl">
                      {service.title}
                    </h3>

                    <p
                      className="mt-3 max-w-[52ch] leading-relaxed"
                      style={{ color: muted }}
                    >
                      {service.body}
                    </p>

                    {service.points.length > 0 && (
                      <ul className="mt-auto flex flex-wrap gap-2 pt-10">
                        {service.points.map((point) => (
                          <li
                            key={point}
                            className="inline-flex items-center gap-1.5 rounded-[var(--fb-r-sm)] border px-3 py-1.5 text-xs font-medium"
                            style={{
                              borderColor: "var(--fb-line-strong)",
                              color: "var(--fb-ink-2)",
                            }}
                          >
                            <CheckIcon size={12} weight="bold" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    )}

                    {service.children && (
                      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {service.children.map((child) => (
                          <div
                            key={child.title}
                            className="rounded-[var(--fb-r)] border p-5"
                            style={{
                              background: "var(--fb-surface)",
                              borderColor: "var(--fb-line)",
                            }}
                          >
                            <h4 className="text-sm font-semibold">
                              {child.title}
                            </h4>
                            <p
                              className="mt-2 text-sm leading-relaxed"
                              style={{ color: muted }}
                            >
                              {child.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
