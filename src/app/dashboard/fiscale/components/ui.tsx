import Link from "next/link";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

export const btn = {
  primary:
    "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-[var(--fi-action)] px-3.5 text-sm font-medium text-white transition-colors hover:bg-[var(--fi-action-hover)] disabled:cursor-not-allowed disabled:opacity-50",
  outline:
    "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--fi-rule)] bg-white px-3.5 text-sm font-medium text-[var(--fi-ink)] transition-colors hover:border-[var(--fi-action)] hover:text-[var(--fi-action)]",
};

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
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="fi-display text-[26px] font-semibold leading-tight tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-[var(--fi-ink-2)]">{description}</p>}
      </div>
      {action}
    </header>
  );
}

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
          <h2 className="fi-display text-[19px] font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-[var(--fi-ink-2)]">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Kpi({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  tone?: "default" | "reserve" | "good";
}) {
  return (
    <div
      className={cx(
        "rounded-xl border bg-[var(--fi-surface)] p-5",
        tone === "reserve" ? "border-[var(--fi-reserve)]/40 bg-[var(--fi-reserve-soft)]" : "border-[var(--fi-rule)]",
      )}
    >
      <p className="fi-label">{label}</p>
      <p
        className={cx(
          "fi-display fi-num mt-2 text-[28px] font-semibold leading-none tracking-tight",
          tone === "reserve" && "text-[var(--fi-reserve)]",
          tone === "good" && "text-[var(--fi-good-text)]",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-[var(--fi-ink-2)]">{hint}</p>}
    </div>
  );
}

type BadgeTone = "neutral" | "solid" | "outline" | "critical" | "good";
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: React.ReactNode }) {
  const tones: Record<BadgeTone, string> = {
    neutral: "bg-[var(--fi-fill)] text-[var(--fi-ink-2)]",
    solid: "bg-[var(--fi-ink)] text-white",
    outline: "border border-[var(--fi-rule)] text-[var(--fi-ink-2)]",
    critical: "bg-[var(--fi-critical)] text-white",
    good: "bg-[#e3f3e3] text-[var(--fi-good-text)]",
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
    <p className="mb-6 rounded-lg border border-dashed border-[var(--fi-rule)] bg-[var(--fi-surface)] px-4 py-3 text-sm text-[var(--fi-ink-2)]">
      <b className="text-[var(--fi-ink)]">Dati dimostrativi.</b> Non c&apos;è ancora un profilo in{" "}
      <code>fiscale.fiscal_profiles</code>: appena lo crei, la dashboard usa i tuoi dati.
    </p>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-xs text-[var(--fi-ink-2)] hover:text-[var(--fi-action)]">
      {children}
    </Link>
  );
}
