-- Filtro su più documenti: p_document_id (uuid) diventa p_document_ids (uuid[]).
-- null o array vuoto = nessun filtro sul documento.
--
-- Rieseguibile. Le vecchie firme si eliminano: lasciarle creerebbe un overload e PostgREST
-- non saprebbe quale scegliere.

drop function if exists public.assistant_search(vector, text, uuid, int, float);
drop function if exists public.assistant_search_fts(text[], text, uuid, int);

create or replace function public.assistant_search(
  query_embedding       vector(1536),
  p_course              text    default null,
  p_document_ids        uuid[]  default null,
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
    and (coalesce(cardinality(p_document_ids), 0) = 0 or c.document_id = any (p_document_ids))
    and 1 - (c.embedding <=> query_embedding) > similarity_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function public.assistant_search_fts(
  p_terms         text[],
  p_course        text   default null,
  p_document_ids  uuid[] default null,
  match_count     int    default 12
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
    and (coalesce(cardinality(p_document_ids), 0) = 0 or c.document_id = any (p_document_ids))
  order by rank desc
  limit match_count;
$$;
