"use client";

import { useEffect, useState } from "react";
import { DesktopIcon, SunIcon, MoonIcon } from "@phosphor-icons/react";

const STORAGE_KEY = "fb-theme";

const OPTIONS = [
  { value: "system", label: "Automatico", Icon: DesktopIcon },
  { value: "light", label: "Chiaro", Icon: SunIcon },
  { value: "dark", label: "Scuro", Icon: MoonIcon },
];

function applyTheme(value) {
  const root = document.documentElement;
  if (value === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", value);
  }
}

/**
 * Three-state segmented control rather than a sun/moon switch, so the
 * system preference stays a real, selectable option.
 */
export default function ThemeControl({ showLabels = false }) {
  const [theme, setTheme] = useState("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stored = "system";
    try {
      stored = window.localStorage.getItem(STORAGE_KEY) || "system";
    } catch {
      stored = "system";
    }
    setTheme(stored);
    setReady(true);
  }, []);

  const choose = (value) => {
    setTheme(value);
    applyTheme(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* private mode, the choice just does not persist */
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Tema del sito"
      className="inline-flex items-center gap-0.5 rounded-[var(--fb-r-sm)] border p-0.5"
      style={{ borderColor: "var(--fb-line)", background: "var(--fb-surface)" }}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = ready && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => choose(value)}
            className="flex cursor-pointer items-center gap-1.5 rounded-[6px] px-2 py-1.5 text-xs font-medium transition-colors duration-200"
            style={{
              background: active ? "var(--fb-accent)" : "transparent",
              color: active ? "var(--fb-accent-ink)" : "var(--fb-ink-2)",
            }}
          >
            <Icon size={14} weight={active ? "fill" : "regular"} />
            {showLabels && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
