-- Assistente di studio: analisi delle figure (grafici, schemi, immagini delle slide).
--
-- Da applicare dopo 0001_assistant.sql (SQL editor o `supabase db push`). Rieseguibile.
--
-- Il testo del documento viene indicizzato subito; le figure vengono descritte da un modello
-- vision in un secondo momento, a lotti, e salvate come passaggi con titolo "Figura N".
-- Queste colonne tengono il piano degli elementi da analizzare e l'avanzamento, così
-- l'analisi si può riprendere da dove si era interrotta.
--
-- Se la migrazione non è applicata l'assistente funziona come prima, senza analisi delle figure.

alter table public.assistant_documents
  add column if not exists visual_status text not null default 'none'
    check (visual_status in ('none', 'pending', 'processing', 'done', 'error')),
  add column if not exists visual_plan   jsonb,
  add column if not exists visual_total  int not null default 0,
  add column if not exists visual_done   int not null default 0,
  add column if not exists visual_error  text;
