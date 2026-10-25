import { PROCESS } from "@/lib/site-data";
import Reveal from "./Reveal";

/**
 * A single horizontal track instead of four full-screen pinned cards: the
 * whole method reads in one glance, and the form is three sections closer.
 * Below lg it becomes a vertical line with the same markers.
 */
export default function Process() {
  return (
    <section
      id="metodo"
      className="scroll-mt-24 border-y px-5 py-24 sm:px-8 lg:py-32"
      style={{
        borderColor: "var(--fb-line)",
        background: "var(--fb-surface-2)",
      }}
    >
      <div className="mx-auto max-w-[1400px]">
        <Reveal className="mb-16 max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            Come lavoriamo, dal primo messaggio alla consegna
          </h2>
          <p
            className="mt-5 max-w-[60ch] text-lg leading-relaxed"
            style={{ color: "var(--fb-ink-2)" }}
          >
            Sempre lo stesso ordine. Sai in anticipo cosa succede, quando e
            quanto costa.
          </p>
        </Reveal>

        <ol className="relative grid grid-cols-1 gap-10 lg:grid-cols-4 lg:gap-8">
          {/* The track the markers sit on. */}
          <span
            aria-hidden="true"
            className="absolute bottom-2 left-[7px] top-2 w-px lg:bottom-auto lg:left-2 lg:right-0 lg:top-[7px] lg:h-px lg:w-auto"
            style={{ background: "var(--fb-line-strong)" }}
          />

          {PROCESS.map((phase, index) => (
            <li key={phase.id}>
              <Reveal
                delay={index * 0.08}
                className="relative pl-10 lg:pl-0 lg:pt-12"
              >
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1 h-[15px] w-[15px] rounded-full border-[3px] lg:top-0"
                  style={{
                    borderColor: "var(--fb-surface-2)",
                    background: "var(--fb-accent)",
                    boxShadow: "0 0 0 1px var(--fb-accent)",
                  }}
                />
                <h3 className="text-2xl font-semibold tracking-tight">
                  {phase.title}
                </h3>
                <p
                  className="mt-3 max-w-[40ch] leading-relaxed"
                  style={{ color: "var(--fb-ink-2)" }}
                >
                  {phase.body}
                </p>
                <p
                  className="mt-5 inline-flex rounded-[var(--fb-r-sm)] px-3 py-1.5 text-sm font-medium"
                  style={{
                    background: "var(--fb-accent-soft)",
                    color: "var(--fb-accent)",
                  }}
                >
                  {phase.detail}
                </p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
