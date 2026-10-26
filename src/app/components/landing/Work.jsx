import Image from "next/image";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import { PROJECTS, CONTACT } from "@/lib/site-data";
import Reveal from "./Reveal";

/**
 * The strongest project spans the full width as a horizontal card, the other
 * four sit below in two columns. It used to be a pinned horizontal pan, which
 * cost the visitor several screens of scrolling before reaching prices and the
 * form. The whole card is the link, so every project opens in one tap.
 * The featured image keeps a fixed aspect ratio instead of stretching to fill
 * the row: stretching crops it and scales it past the size next/image serves,
 * which is what made it blurry.
 */
const LAYOUT = [
  { area: "lg:col-span-12", featured: true },
  { area: "lg:col-span-6" },
  { area: "lg:col-span-6" },
  { area: "lg:col-span-6" },
  { area: "lg:col-span-6" },
];

function ProjectCard({ project, featured }) {
  return (
    <a
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex h-full flex-col overflow-hidden rounded-[var(--fb-r-lg)] border transition-[border-color,box-shadow] duration-300 hover:border-[var(--fb-line-strong)] hover:shadow-[var(--fb-shadow)] ${
        featured ? "lg:flex-row" : ""
      }`}
      style={{
        background: "var(--fb-surface)",
        borderColor: "var(--fb-line)",
      }}
    >
      <div
        className={`relative overflow-hidden border-b ${
          featured
            ? "aspect-[16/10] lg:w-[58%] lg:shrink-0 lg:border-b-0 lg:border-r"
            : "aspect-[16/9]"
        }`}
        style={{ borderColor: "var(--fb-line)" }}
      >
        <Image
          src={project.image}
          alt={project.alt}
          fill
          sizes={
            featured
              ? "(max-width: 1024px) 92vw, 820px"
              : "(max-width: 1024px) 92vw, 690px"
          }
          className="object-cover object-left-top transition-transform duration-700 group-hover:scale-[1.03]"
        />
      </div>

      <div
        className={
          featured ? "p-7 sm:p-9 lg:flex lg:flex-1 lg:flex-col lg:justify-center" : "p-6 sm:p-7"
        }
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              className="text-xs font-medium"
              style={{ color: "var(--fb-accent)" }}
            >
              {project.type}
            </p>
            <h3
              className={`mt-1.5 font-semibold tracking-tight ${
                featured ? "text-2xl sm:text-3xl" : "text-xl"
              }`}
            >
              {project.title}
            </h3>
          </div>
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--fb-r-sm)] border transition-colors duration-200 group-hover:bg-[var(--fb-accent)] group-hover:text-[var(--fb-accent-ink)] group-hover:border-[var(--fb-accent)]"
            style={{ borderColor: "var(--fb-line-strong)" }}
          >
            <ArrowUpRightIcon size={16} />
          </span>
        </div>

        <p
          className={`mt-3 leading-relaxed ${featured ? "max-w-[58ch]" : "text-sm"}`}
          style={{ color: "var(--fb-ink-2)" }}
        >
          {project.description}
        </p>

        <p
          className="mt-4 font-mono text-[11px]"
          style={{ color: "var(--fb-ink-3)" }}
        >
          {project.tags.join(" / ")}
        </p>
        <span className="sr-only">(apre {project.title} in una nuova scheda)</span>
      </div>
    </a>
  );
}

export default function Work() {
  return (
    <section
      id="progetti"
      className="scroll-mt-24 px-5 pb-24 sm:px-8 lg:pb-32"
    >
      <div className="mx-auto max-w-[1400px]">
        <Reveal className="mb-14 max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            Progetti online, da aprire e provare
          </h2>
          <p
            className="mt-5 max-w-[60ch] text-lg leading-relaxed"
            style={{ color: "var(--fb-ink-2)" }}
          >
            Niente mockup: sono tutti in produzione. Aprili e guarda come si
            comportano.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {PROJECTS.map((project, index) => {
            const slot = LAYOUT[index] ?? { area: "lg:col-span-6" };
            return (
              <Reveal
                key={project.title}
                delay={(index % 3) * 0.06}
                className={slot.area}
              >
                <ProjectCard project={project} featured={slot.featured} />
              </Reveal>
            );
          })}
        </div>

        <Reveal className="mt-10">
          <a
            href={CONTACT.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium underline decoration-[var(--fb-line-strong)] underline-offset-4 transition-colors duration-200 hover:decoration-[var(--fb-accent)]"
            style={{ color: "var(--fb-ink-2)" }}
          >
            Altro codice su GitHub
          </a>
        </Reveal>
      </div>
    </section>
  );
}
