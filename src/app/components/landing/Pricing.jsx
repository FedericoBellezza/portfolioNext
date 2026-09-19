import { CheckIcon, PlusIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLANS, PRICING_FAQ, CTA } from "@/lib/site-data";
import Reveal from "./Reveal";

export default function Pricing() {
  return (
    <section
      id="prezzi"
      className="scroll-mt-24 border-y px-5 py-24 sm:px-8 lg:py-32"
      style={{
        borderColor: "var(--fb-line)",
        background: "var(--fb-surface-2)",
      }}
    >
      <div className="mx-auto max-w-[1400px]">
        <Reveal className="mb-14 max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            Quanto costa, detto prima
          </h2>
          <p
            className="mt-5 max-w-[60ch] text-lg leading-relaxed"
            style={{ color: "var(--fb-ink-2)" }}
          >
            Due punti di partenza reali. Dopo la prima call ricevi un preventivo
            chiuso, con una cifra sola.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {PLANS.map((plan, index) => (
            <Reveal key={plan.id} delay={index * 0.1} className="h-full">
              <article
                className="flex h-full flex-col rounded-[var(--fb-r-lg)] border p-8 sm:p-10"
                style={{
                  background: "var(--fb-surface)",
                  borderColor: plan.featured
                    ? "var(--fb-accent)"
                    : "var(--fb-line)",
                  boxShadow: plan.featured ? "var(--fb-shadow-lg)" : "none",
                }}
              >
                {/* Fixed-height header block so both feature lists start on
                    the same baseline regardless of copy length. */}
                <header className="min-h-[9.5rem]">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-semibold tracking-tight">
                      {plan.name}
                    </h3>
                    {plan.featured && (
                      <Badge variant="soft">Il più richiesto</Badge>
                    )}
                  </div>
                  <p
                    className="mt-3 max-w-[42ch] text-sm leading-relaxed"
                    style={{ color: "var(--fb-ink-2)" }}
                  >
                    {plan.description}
                  </p>
                </header>

                <div
                  className="flex min-h-[6rem] flex-col justify-center border-y py-6"
                  style={{ borderColor: "var(--fb-line)" }}
                >
                  <p className="flex items-baseline gap-2">
                    <span
                      className="text-sm"
                      style={{ color: "var(--fb-ink-3)" }}
                    >
                      da
                    </span>
                    <span className="fb-nums text-4xl font-semibold tracking-tight">
                      &euro;{plan.price}
                    </span>
                    <span
                      className="text-sm"
                      style={{ color: "var(--fb-ink-2)" }}
                    >
                      {plan.priceUnit}
                    </span>
                  </p>
                  <p
                    className="mt-1.5 text-xs"
                    style={{ color: "var(--fb-ink-3)" }}
                  >
                    Regime forfettario, nessuna IVA da aggiungere
                  </p>
                </div>

                <ul className="mt-7 space-y-3.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <CheckIcon
                        size={16}
                        weight="bold"
                        className="mt-0.5 shrink-0"
                        style={{ color: "var(--fb-accent)" }}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div
                  className="mt-7 border-t pt-6"
                  style={{ borderColor: "var(--fb-line)" }}
                >
                  <p
                    className="mb-3 text-xs font-medium"
                    style={{ color: "var(--fb-ink-3)" }}
                  >
                    Si può aggiungere
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {plan.addOns.map((addOn) => (
                      <li
                        key={addOn}
                        className="inline-flex items-center gap-1.5 rounded-[var(--fb-r-sm)] px-2.5 py-1.5 text-xs"
                        style={{
                          background: "var(--fb-surface-2)",
                          color: "var(--fb-ink-2)",
                        }}
                      >
                        <PlusIcon size={11} weight="bold" />
                        {addOn}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* mt-auto keeps both CTAs on one horizontal line. */}
                <div className="mt-auto pt-9">
                  <Button
                    asChild
                    size="fb"
                    variant={plan.featured ? "accent" : "quiet"}
                    className="w-full"
                  >
                    <a href="#contatti">{CTA.contact}</a>
                  </Button>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        {/* Side-by-side answers instead of an accordion: nothing here is long
            enough to be worth a click. */}
        <div className="mt-20">
          <Reveal className="mb-10">
            <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Le domande che mi fanno sempre
            </h3>
          </Reveal>

          <dl className="grid grid-cols-1 gap-x-12 gap-y-9 md:grid-cols-2">
            {PRICING_FAQ.map((item, index) => (
              <Reveal key={item.q} delay={index * 0.05}>
                <dt className="text-base font-semibold">{item.q}</dt>
                <dd
                  className="mt-2.5 max-w-[60ch] text-sm leading-relaxed"
                  style={{ color: "var(--fb-ink-2)" }}
                >
                  {item.a}
                </dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
