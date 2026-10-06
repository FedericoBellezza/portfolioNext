-- Assistente di studio (RAG): documenti, chunk con embedding, ricerca ibrida e bucket Storage.
--
-- Da applicare al progetto Supabase del portfolio (SQL editor oppure `supabase db push`).
-- Lo script è rieseguibile: usa "if not exists" / "drop policy if exists".
--
-- Modello di sicurezza: nessuna service-role key. Tutto passa dalla sessione dell'utente e dalla RLS
-- (`user_id = auth.uid()`); le route /api/assistant/* verificano inoltre che l'utente sia OWNER_EMAIL.
-- Consigliato: in Supabase > Authentication disattiva le registrazioni pubbliche ("Allow new users to sign up").

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- Tabelle
-- ---------------------------------------------------------------------------

create table if not exists public.assistant_documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course      text not null,
  name        text not null,
  file_path   text not null,
  file_type   text not null,
  file_size   bigint,
  page_count  int,
  status      text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'error')),
  error_msg   text,
  created_at  timestamptz not null default now()
);

create table if not exists public.assistant_chunks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  document_id  uuid not null references public.assistant_documents(id) on delete cascade,
  course       text not null,
  content      text not null,
  embedding    vector(1536),                -- OpenAI text-embedding-3-small
  chunk_index  int not null,
  page_start   int,                         -- PDF: pagina, PPTX: n. slide
  page_end     int,
  ts_start     int,                         -- SRT/VTT: secondo di inizio
  heading      text,
  fts          tsvector generated always as (
                 to_tsvector('italian'::regconfig, coalesce(heading, '') || ' ' || content)
               ) stored
);

create index if not exists assistant_documents_user_course_idx on public.assistant_documents (user_id, course);
create index if not exists assistant_chunks_user_course_idx    on public.assistant_chunks (user_id, course);
create index if not exists assistant_chunks_document_idx       on public.assistant_chunks (document_id, chunk_index);
create index if not exists assistant_chunks_fts_idx            on public.assistant_chunks using gin (fts);
create index if not exists assistant_chunks_embedding_idx      on public.assistant_chunks using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.assistant_documents enable row level security;
alter table public.assistant_chunks    enable row level security;

drop policy if exists "assistant_documents_owner" on public.assistant_documents;
create policy "assistant_documents_owner" on public.assistant_documents
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "assistant_chunks_owner" on public.assistant_chunks;
create policy "assistant_chunks_owner" on public.assistant_chunks
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Ricerca: vettoriale + full-text italiano. `security invoker`: la RLS resta attiva.
-- La fusione dei due ranking (RRF) avviene lato applicazione.
-- ---------------------------------------------------------------------------

create or replace function public.assistant_search(
  query_embedding       vector(1536),
  p_course              text    default null,
  p_document_id         uuid    default null,
  match_count           int     default 12,
  similarity_threshold  float   default 0.2
)
returns table (
  id           uuid,
  document_id  uuid,
  course       text,
  content      text,
  page_start   int,
  page_end     int,
  ts_start     int,
  heading      text,
  chunk_index  int,
  similarity   float
)
language sql stable
security invoker
set search_path = public, extensions
as $$
  select
    c.id, c.document_id, c.course, c.content, c.page_start, c.page_end, c.ts_start, c.heading, c.chunk_index,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.assistant_chunks c
  where c.embedding is not null
    and (p_course is null or c.course = p_course)
    and (p_document_id is null or c.document_id = p_document_id)
    and 1 - (c.embedding <=> query_embedding) > similarity_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- p_terms: parole già ripulite dall'applicazione (solo lettere/numeri), combinate in OR.
create or replace function public.assistant_search_fts(
  p_terms        text[],
  p_course       text default null,
  p_document_id  uuid default null,
  match_count    int  default 12
)
returns table (
  id           uuid,
  document_id  uuid,
  course       text,
  content      text,
  page_start   int,
  page_end     int,
  ts_start     int,
  heading      text,
  chunk_index  int,
  rank         float
)
language sql stable
security invoker
set search_path = public, extensions
as $$
  with q as (
    select to_tsquery('italian'::regconfig, array_to_string(p_terms, ' | ')) as tsq
  )
  select
    c.id, c.document_id, c.course, c.content, c.page_start, c.page_end, c.ts_start, c.heading, c.chunk_index,
    ts_rank_cd(c.fts, q.tsq)::float as rank
  from public.assistant_chunks c, q
  where cardinality(p_terms) > 0
    and c.fts @@ q.tsq
    and (p_course is null or c.course = p_course)
    and (p_document_id is null or c.document_id = p_document_id)
  order by rank desc
  limit match_count;
$$;

-- ---------------------------------------------------------------------------
-- Storage: bucket privato, un solo "cassetto" per utente (primo segmento del path = user id)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('assistant-files', 'assistant-files', false, 52428800)  -- 50 MB
on conflict (id) do nothing;

drop policy if exists "assistant_files_select" on storage.objects;
create policy "assistant_files_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'assistant-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "assistant_files_insert" on storage.objects;
create policy "assistant_files_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'assistant-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "assistant_files_update" on storage.objects;
create policy "assistant_files_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'assistant-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "assistant_files_delete" on storage.objects;
create policy "assistant_files_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'assistant-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
