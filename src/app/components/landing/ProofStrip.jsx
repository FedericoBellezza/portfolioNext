import { PROOF } from "@/lib/site-data";
import Reveal from "./Reveal";

/**
 * The commitments a buyer checks first (time, money, risk), right under the
 * hero. Plain columns instead of cards: the numbers are the content.
 */
export default function ProofStrip() {
  return (
    <section
      aria-label="Cosa ti garantisco"
      className="border-y px-5 sm:px-8"
      style={{ borderColor: "var(--fb-line)" }}
    >
      <dl className="mx-auto grid max-w-[1400px] grid-cols-2 lg:grid-cols-4">
        {PROOF.map((item, index) => (
          <Reveal
            key={item.value}
            delay={index * 0.06}
            className={`py-8 sm:py-10 ${index % 2 === 1 ? "pl-5 sm:pl-8" : "pr-5 sm:pr-8"} ${
              index > 1 ? "border-t lg:border-t-0" : ""
            } ${index > 0 ? "lg:border-l lg:pl-8" : ""} ${
              index % 2 === 1 ? "border-l" : ""
            }`}
            style={{ borderColor: "var(--fb-line)" }}
          >
            <dt className="fb-nums text-2xl font-semibold tracking-tight sm:text-3xl">
              {item.value}
            </dt>
            <dd
              className="mt-2 max-w-[28ch] text-sm leading-relaxed"
              style={{ color: "var(--fb-ink-2)" }}
            >
              {item.label}
            </dd>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}
