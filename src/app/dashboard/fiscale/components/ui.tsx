import Link from "next/link";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fi-action)]";

export const btn = {
  primary: `inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--fi-action)] px-3.5 text-sm font-medium text-white shadow-[0_1px_2px_rgba(18,22,43,0.12)] transition-colors duration-150 hover:bg-[var(--fi-action-hover)] disabled:cursor-not-allowed disabled:opacity-50 ${focus}`,
  outline: `inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--fi-rule)] bg-white px-3.5 text-sm font-medium text-[var(--fi-ink)] transition-colors duration-150 hover:border-[var(--fi-rule-strong)] hover:bg-[var(--fi-ground)] disabled:cursor-not-allowed disabled:opacity-50 ${focus}`,
};

const card = "rounded-xl border border-[var(--fi-rule)] bg-[var(--fi-surface)]";
export { card };

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
    <header className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.02em]">{title}</h1>
        {description && <p className="mt-1 max-w-[65ch] text-sm text-[var(--fi-ink-2)]">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </header>
  );
}

/** White card with a heading row. */
export function Panel({
  title,
  description,
  action,
  children,
  className,
  id,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cx(card, "scroll-mt-24 p-5", className)}>
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

/** Heading + content without a container (for lists that bring their own card). */
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

/** Headline figure: label, big number, one line of context. */
export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  tone?: "default" | "accent";
}) {
  return (
    <div
      className={cx(
        "rounded-xl p-5",
        tone === "accent" ? "bg-[var(--fi-action)] text-white" : cx(card),
      )}
    >
      <p className={cx("text-sm", tone === "accent" ? "text-white/80" : "text-[var(--fi-ink-2)]")}>{label}</p>
      <p className="fi-num mt-2 text-[30px] font-semibold leading-none tracking-[-0.02em]">{value}</p>
      {hint && <div className={cx("mt-2.5 text-xs", tone === "accent" ? "text-white/80" : "text-[var(--fi-muted)]")}>{hint}</div>}
    </div>
  );
}

type BadgeTone = "neutral" | "solid" | "outline" | "critical" | "good" | "warning" | "accent";
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: React.ReactNode }) {
  const tones: Record<BadgeTone, string> = {
    neutral: "bg-[var(--fi-fill)] text-[var(--fi-ink-2)]",
    solid: "bg-[var(--fi-ink)] text-white",
    outline: "border border-[var(--fi-rule)] text-[var(--fi-ink-2)]",
    critical: "bg-[var(--fi-critical-soft)] text-[var(--fi-critical-text)]",
    good: "bg-[var(--fi-good-soft)] text-[var(--fi-good-text)]",
    warning: "bg-[var(--fi-warning-soft)] text-[var(--fi-warning-text)]",
    accent: "bg-[var(--fi-action-soft)] text-[var(--fi-action)]",
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
    <p className="mb-6 rounded-xl border border-dashed border-[var(--fi-rule-strong)] bg-white/60 px-4 py-3 text-sm text-[var(--fi-ink-2)]">
      <b className="font-medium text-[var(--fi-ink)]">Dati dimostrativi.</b> Appena crei il tuo profilo fiscale, qui
      vedi i tuoi dati.
    </p>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-sm text-sm font-medium text-[var(--fi-action)] underline-offset-4 hover:underline ${focus}`}
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

/** Segmented tabs driven by a query parameter (server-rendered, no client state). */
export function Tabs({
  items,
  active,
  label,
  className = "mb-6 flex",
}: {
  items: { id: string; label: string; href: string; count?: number }[];
  active: string;
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cx("max-w-full gap-1 overflow-x-auto rounded-xl bg-[var(--fi-fill)] p-1", className)}>
      {items.map((t) => {
        const on = t.id === active;
        return (
          <Link
            key={t.id}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={cx(
              "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm transition-colors duration-150",
              focus,
              on ? "bg-white font-medium text-[var(--fi-ink)] shadow-[0_1px_2px_rgba(18,22,43,0.08)]" : "text-[var(--fi-ink-2)] hover:text-[var(--fi-ink)]",
            )}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={cx("fi-num rounded-full px-1.5 text-[11px]", on ? "bg-[var(--fi-action-soft)] text-[var(--fi-action)]" : "bg-white/70 text-[var(--fi-ink-2)]")}>
                {t.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
