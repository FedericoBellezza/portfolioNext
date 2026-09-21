import Image from "next/image";
import { STACK } from "@/lib/site-data";

function Row({ ariaHidden }) {
  return (
    <ul
      className="flex shrink-0 items-center"
      aria-hidden={ariaHidden ? "true" : undefined}
    >
      {STACK.map((tech) => (
        <li key={tech.name} className="shrink-0 px-9 sm:px-12">
          <Image
            src={tech.src}
            alt={ariaHidden ? "" : tech.name}
            width={44}
            height={44}
            className="fb-logo h-9 w-9 object-contain sm:h-10 sm:w-10"
          />
        </li>
      ))}
    </ul>
  );
}

/**
 * The one marquee on the page. Motivation: it shows breadth of stack,
 * which is exactly the kind of list nobody reads item by item.
 */
export default function StackMarquee() {
  return (
    <section
      aria-label="Tecnologie che utilizzo"
      className="border-y py-12"
      style={{ borderColor: "var(--fb-line)" }}
    >
      <p
        className="mb-8 px-5 text-center text-sm sm:px-8"
        style={{ color: "var(--fb-ink-3)" }}
      >
        Lo stack con cui lavoro
      </p>

      <div className="fb-marquee relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-20 sm:w-32"
          style={{
            background:
              "linear-gradient(to right, var(--fb-bg), transparent)",
            zIndex: "var(--fb-z-sticky)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-20 sm:w-32"
          style={{
            background: "linear-gradient(to left, var(--fb-bg), transparent)",
            zIndex: "var(--fb-z-sticky)",
          }}
        />

        <div className="fb-marquee-track flex w-max">
          <Row />
          <Row ariaHidden />
        </div>
      </div>
    </section>
  );
}
