-- =============================================================================
-- Fiscale: archivio documenti della partita IVA (dichiarazioni, visure,
-- comunicazioni INPS/INAIL, ricevute...). File nel bucket privato
-- `fiscale-docs`, una cartella per utente; metadati in fiscale.documents.
-- =============================================================================

create table if not exists fiscale.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  category text not null default 'other'
    check (category in ('tax_return', 'f24', 'inps', 'inail', 'chamber', 'vat_registration', 'other')),
  year smallint check (year is null or year between 2000 and 2100),
  file_path text not null unique,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists documents_user_id_idx on fiscale.documents (user_id, category, year);

alter table fiscale.documents enable row level security;
create policy "documents_owner_all" on fiscale.documents
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (storage.foldername(file_path))[1] = (select auth.uid())::text);

grant select, insert, update, delete on fiscale.documents to authenticated;
grant all on fiscale.documents to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fiscale-docs', 'fiscale-docs', false, 26214400,
        array['application/pdf', 'image/png', 'image/jpeg', 'application/xml', 'text/xml', 'application/pkcs7-mime'])
on conflict (id) do nothing;

create policy "fiscale_docs_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'fiscale-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "fiscale_docs_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fiscale-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "fiscale_docs_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fiscale-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);
