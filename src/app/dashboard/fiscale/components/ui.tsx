import Link from "next/link";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fi-action)]";

export const btn = {
  primary: `inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-[var(--fi-action)] px-3.5 text-sm font-medium text-white transition-colors hover:bg-[var(--fi-action-hover)] disabled:cursor-not-allowed disabled:opacity-50 ${focus}`,
  outline: `inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--fi-rule)] bg-white px-3.5 text-sm font-medium text-[var(--fi-ink)] transition-colors hover:border-[var(--fi-action)] hover:text-[var(--fi-action)] disabled:cursor-not-allowed disabled:opacity-50 ${focus}`,
};

/** Page heading: the only place the dashboard serif appears. */
export function PageTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="fi-display text-[28px] font-semibold leading-tight tracking-[-0.02em]">{title}</h1>
        {description && <p className="mt-1 max-w-[65ch] text-sm text-[var(--fi-ink-2)]">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </header>
  );
}

/** Contained block (forms, detail panes). */
export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("rounded-xl border border-[var(--fi-rule)] bg-[var(--fi-surface)] p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-[var(--fi-ink-2)]">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Uncontained block: heading + content, separated by space rather than borders. */
export function Section({
  title,
  action,
  children,
  className,
  id,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cx("scroll-mt-24", className)}>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

type BadgeTone = "neutral" | "solid" | "outline" | "critical" | "good" | "warning";
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: React.ReactNode }) {
  const tones: Record<BadgeTone, string> = {
    neutral: "bg-[var(--fi-fill)] text-[var(--fi-ink-2)]",
    solid: "bg-[var(--fi-ink)] text-white",
    outline: "border border-[var(--fi-rule)] text-[var(--fi-ink-2)]",
    critical: "bg-[#fbeceb] text-[var(--fi-critical)]",
    good: "bg-[#e6f2e6] text-[var(--fi-good-text)]",
    warning: "bg-[var(--fi-warning-soft)] text-[var(--fi-warning-text)]",
  };
  return (
    <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", tones[tone])}>
      {children}
    </span>
  );
}

export function DemoNotice({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p className="mb-6 rounded-lg border border-dashed border-[var(--fi-rule)] px-4 py-3 text-sm text-[var(--fi-ink-2)]">
      <b className="font-medium text-[var(--fi-ink)]">Dati dimostrativi.</b> Appena crei il tuo profilo fiscale, qui
      vedi i tuoi dati.
    </p>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`text-sm text-[var(--fi-action)] underline-offset-4 hover:underline ${focus} rounded-sm`}
    >
      {children}
    </Link>
  );
}

/** Progressive disclosure for secondary detail. */
export function Disclosure({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-sm text-sm text-[var(--fi-ink-2)] hover:text-[var(--fi-ink)] [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="inline-block transition-transform duration-200 group-open:rotate-90">›</span>
        {summary}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
