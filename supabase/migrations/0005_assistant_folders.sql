-- Assistente di studio: cartelle dentro ogni corso (es. i moduli di una materia).
--
-- Da applicare dopo 0001..0003 (SQL editor o `supabase db push`). Rieseguibile.
--
-- Un livello solo: corso > cartella > documento. Il corso resta il testo `course` dei documenti;
-- la cartella è `assistant_documents.folder` (null = direttamente nel corso). La tabella
-- `assistant_folders` serve a far esistere una cartella anche quando è ancora vuota.
--
-- Se la migrazione non è applicata l'assistente funziona come prima, senza cartelle.

alter table public.assistant_documents
  add column if not exists folder text;

create table if not exists public.assistant_folders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course      text not null,
  name        text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, course, name)
);

create index if not exists assistant_documents_folder_idx on public.assistant_documents (user_id, course, folder);

alter table public.assistant_folders enable row level security;

drop policy if exists "assistant_folders_owner" on public.assistant_folders;
create policy "assistant_folders_owner" on public.assistant_folders
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
