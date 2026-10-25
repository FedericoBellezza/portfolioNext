import {
  ArrowsLeftRightIcon,
  ChatsCircleIcon,
  FileTextIcon,
  BrowserIcon,
  SquaresFourIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react/dist/ssr";
import { SERVICES } from "@/lib/site-data";
import Reveal from "./Reveal";

const ICONS = {
  automation: ArrowsLeftRightIcon,
  ai: ChatsCircleIcon,
  documents: FileTextIcon,
  web: BrowserIcon,
  software: SquaresFourIcon,
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
    case "muted":
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

function Example({ text }) {
  return (
    <p
      className="mt-auto flex items-start gap-2.5 border-t pt-5 text-sm leading-relaxed"
      style={{ borderColor: "var(--fb-line)", color: "var(--fb-ink-2)" }}
    >
      <span
        className="shrink-0 font-medium"
        style={{ color: "var(--fb-ink)" }}
      >
        Esempio:
      </span>
      {text}
    </p>
  );
}

/**
 * Services, led by the situation the visitor recognises rather than by the
 * technology behind it. The service name sits small above each problem so
 * nobody has to guess what they would be buying.
 */
export default function Services() {
  return (
    <section id="servizi" className="scroll-mt-24 px-5 py-24 sm:px-8 lg:py-32">
      <div className="mx-auto max-w-[1400px]">
        <Reveal className="mb-14 max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            Ti riconosci in una di queste situazioni?
          </h2>
          <p
            className="mt-5 max-w-[60ch] text-lg leading-relaxed"
            style={{ color: "var(--fb-ink-2)" }}
          >
            Ognuna ha una soluzione concreta, quasi sempre senza cambiare i
            programmi che usate già.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {SERVICES.map((service, index) => {
            const Icon = ICONS[service.id];
            const wide = service.area.includes("col-span-12");

            return (
              <Reveal
                key={service.id}
                delay={index * 0.06}
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
                          "radial-gradient(ellipse at 90% 0%, #000 0%, transparent 60%)",
                        WebkitMaskImage:
                          "radial-gradient(ellipse at 90% 0%, #000 0%, transparent 60%)",
                      }}
                    />
                  )}

                  <div
                    className={`relative flex h-full flex-col ${
                      wide ? "lg:grid lg:grid-cols-12 lg:items-end lg:gap-10" : ""
                    }`}
                  >
                    <div className={wide ? "lg:col-span-7" : undefined}>
                      <p
                        className="flex items-center gap-2 text-sm font-medium"
                        style={{ color: "var(--fb-accent)" }}
                      >
                        <Icon size={18} weight="duotone" />
                        {service.label}
                      </p>

                      <h3 className="mt-5 max-w-[24ch] text-2xl font-semibold leading-tight tracking-tight text-balance sm:text-[1.7rem]">
                        {service.title}
                      </h3>

                      <p
                        className="mt-4 max-w-[54ch] leading-relaxed"
                        style={{ color: "var(--fb-ink-2)" }}
                      >
                        {service.body}
                      </p>
                    </div>

                    {wide ? (
                      <div className="mt-8 lg:col-span-5 lg:mt-0">
                        <Example text={service.example} />
                        <a
                          href="#contatti"
                          className="group mt-6 inline-flex items-center gap-2 text-sm font-medium"
                          style={{ color: "var(--fb-ink)" }}
                        >
                          Il tuo caso non è qui? Raccontamelo
                          <ArrowRightIcon
                            size={15}
                            className="transition-transform duration-200 group-hover:translate-x-1"
                          />
                        </a>
                      </div>
                    ) : (
                      <div className="mt-10 flex flex-1 flex-col">
                        <Example text={service.example} />
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
