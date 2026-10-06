"use client";

import { useState } from "react";
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  STATI,
  STATO_LABEL,
  ESITI,
  ESITO_LABEL,
  TAGS,
  TAG_LABEL,
  SORT_FIELDS,
  SORT_LABEL,
} from "@/lib/leads/constants";
import { hasActiveFilters } from "./helpers";
import LdSelect from "./LdSelect";

export default function FiltersBar({ filters, onChange, onReset, container }) {
  const [open, setOpen] = useState(false);
  const set = (patch) => onChange({ ...filters, ...patch });
  const active = hasActiveFilters(filters);

  const activeCount = [
    filters.stato,
    filters.esito,
    filters.tag,
    filters.citta,
    filters.min,
    filters.followup,
  ].filter(Boolean).length;

  return (
    <section aria-label="Filtri e ordinamento" className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ld-ink-2)]"
            aria-hidden="true"
          />
          <input
            type="search"
            className="ld-input ld-input-icon"
            placeholder="Cerca per nome o handle…"
            aria-label="Cerca per nome o handle"
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
          />
        </div>
        <button
          type="button"
          className="ld-btn lg:hidden"
          aria-expanded={open}
          aria-controls="ld-filters-panel"
          onClick={() => setOpen((o) => !o)}
        >
          <SlidersHorizontal aria-hidden="true" />
          Filtri{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
      </div>

      {filters.followup && (
        <button
          type="button"
          className="ld-stamp is-late cursor-pointer"
          onClick={() => set({ followup: false })}
          aria-label="Rimuovi filtro follow-up"
        >
          Solo follow-up scaduti o di oggi
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      )}

      <div
        id="ld-filters-panel"
        className={`${open ? "grid" : "hidden"} grid-cols-2 gap-3 sm:grid-cols-3 lg:grid lg:grid-cols-[repeat(5,minmax(0,1fr))_minmax(0,1.7fr)_auto]`}
      >
        <Field label="Stato">
          <LdSelect
            container={container}
            value={filters.stato}
            onChange={(v) => set({ stato: v, followup: false })}
            allLabel="Tutti"
            options={STATI.map((s) => ({ value: s, label: STATO_LABEL[s] }))}
            isSet={Boolean(filters.stato)}
          />
        </Field>

        <Field label="Esito">
          <LdSelect
            container={container}
            value={filters.esito}
            onChange={(v) => set({ esito: v })}
            allLabel="Tutti"
            options={ESITI.map((s) => ({ value: s, label: ESITO_LABEL[s] }))}
            isSet={Boolean(filters.esito)}
          />
        </Field>

        <Field label="Tag">
          <LdSelect
            container={container}
            value={filters.tag}
            onChange={(v) => set({ tag: v })}
            allLabel="Tutti"
            options={TAGS.map((t) => ({ value: t, label: TAG_LABEL[t] }))}
            isSet={Boolean(filters.tag)}
          />
        </Field>

        <Field label="Città">
          <input
            className={`ld-input ${filters.citta ? "is-set" : ""}`}
            placeholder="Es. Verona"
            value={filters.citta}
            onChange={(e) => set({ citta: e.target.value })}
          />
        </Field>

        <Field label="Punteggio min.">
          <LdSelect
            container={container}
            value={filters.min}
            onChange={(v) => set({ min: v })}
            allLabel="Qualsiasi"
            options={Array.from({ length: 10 }, (_, i) => ({
              value: String(i + 1),
              label: `${i + 1}`,
            }))}
            isSet={Boolean(filters.min)}
          />
        </Field>

        <Field label="Ordina per">
          <div className="flex gap-2">
            <LdSelect
              container={container}
              value={filters.sort}
              onChange={(v) => set({ sort: v })}
              options={SORT_FIELDS.map((f) => ({
                value: f,
                label: SORT_LABEL[f],
              }))}
            />
            <button
              type="button"
              className="ld-btn ld-btn-icon shrink-0"
              onClick={() =>
                set({ dir: filters.dir === "desc" ? "asc" : "desc" })
              }
              aria-label={
                filters.dir === "desc"
                  ? "Ordine decrescente, passa a crescente"
                  : "Ordine crescente, passa a decrescente"
              }
              title={filters.dir === "desc" ? "Decrescente" : "Crescente"}
            >
              {filters.dir === "desc" ? (
                <ArrowDownWideNarrow aria-hidden="true" />
              ) : (
                <ArrowUpNarrowWide aria-hidden="true" />
              )}
            </button>
          </div>
        </Field>

        <div className="col-span-full flex items-end lg:col-span-1">
          <button
            type="button"
            className="ld-btn ld-btn-ghost w-full lg:w-auto"
            onClick={onReset}
            disabled={!active}
          >
            <X aria-hidden="true" />
            Azzera
          </button>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block min-w-0">
      <span className="ld-label">{label}</span>
      {children}
    </label>
  );
}
