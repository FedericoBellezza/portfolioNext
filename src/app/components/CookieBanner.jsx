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
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 text-sm text-slate-300 leading-relaxed">
          <span className="font-semibold text-white">Questo sito utilizza i cookie.</span>{" "}
          Usiamo cookie tecnici e di analytics (Vercel Analytics) per migliorare
          la tua esperienza. Puoi accettare o rifiutare i cookie non essenziali.{" "}
          <Link
            href="/privacy"
            className="text-white underline underline-offset-2 hover:text-slate-300 transition-colors"
          >
            Privacy Policy
          </Link>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white border border-slate-600 hover:border-slate-400 rounded-lg transition-colors duration-200"
          >
            Rifiuta
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm font-medium bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition-colors duration-200"
          >
            Accetta
          </button>
        </div>
      </div>
    </div>
  );
}
