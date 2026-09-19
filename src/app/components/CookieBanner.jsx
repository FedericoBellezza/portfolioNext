"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      setVisible(true);
    }
  }, []);

  function handleAccept() {
    localStorage.setItem("cookie_consent", "accepted");
    setVisible(false);
  }

  function handleDecline() {
    localStorage.setItem("cookie_consent", "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 p-4 sm:p-6"
      style={{ zIndex: "var(--fb-z-toast)" }}
    >
      <div
        className="mx-auto flex max-w-4xl flex-col items-start gap-4 rounded-[var(--fb-r-lg)] border p-5 sm:flex-row sm:items-center sm:p-6"
        style={{
          background: "var(--fb-surface)",
          borderColor: "var(--fb-line-strong)",
          boxShadow: "var(--fb-shadow-lg)",
        }}
      >
        <div
          className="flex-1 text-sm leading-relaxed"
          style={{ color: "var(--fb-ink-2)" }}
        >
          <span className="font-semibold" style={{ color: "var(--fb-ink)" }}>
            Questo sito utilizza i cookie.
          </span>{" "}
          Usiamo cookie tecnici e di analytics (Vercel Analytics) per migliorare
          la tua esperienza. Puoi accettare o rifiutare i cookie non essenziali.{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-2 transition-colors"
            style={{ color: "var(--fb-ink)" }}
          >
            Privacy Policy
          </Link>
        </div>
        <div className="flex shrink-0 gap-3">
          <button
            onClick={handleDecline}
            className="cursor-pointer rounded-[var(--fb-r-sm)] border px-4 py-2 text-sm font-medium transition-colors duration-200"
            style={{
              borderColor: "var(--fb-line-strong)",
              color: "var(--fb-ink-2)",
            }}
          >
            Rifiuta
          </button>
          <button
            onClick={handleAccept}
            className="cursor-pointer rounded-[var(--fb-r-sm)] px-4 py-2 text-sm font-medium transition-colors duration-200"
            style={{
              background: "var(--fb-accent)",
              color: "var(--fb-accent-ink)",
            }}
          >
            Accetta
          </button>
        </div>
      </div>
    </div>
  );
}
