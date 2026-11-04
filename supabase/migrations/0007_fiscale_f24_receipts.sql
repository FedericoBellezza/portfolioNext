-- =============================================================================
-- Fiscale — registrazione F24 dalla dashboard
-- * ricevuta F24 (file in Storage) su versamenti INPS ed Erario
-- * un solo versamento per adempimento (kind + anno di competenza)
-- * adempimenti segnati come "non dovuti" (es. stima sbagliata)
-- * bucket privato `fiscale-f24`, una cartella per utente
-- =============================================================================

alter table fiscale.inps_payments add column if not exists receipt_path text;
alter table fiscale.tax_payments add column if not exists receipt_path text;

-- Same obligation cannot be registered twice ('other' stays free).
create unique index if not exists inps_payments_one_per_obligation
  on fiscale.inps_payments (user_id, competence_year, kind) where kind <> 'other';
create unique index if not exists tax_payments_one_per_obligation
  on fiscale.tax_payments (user_id, competence_year, kind) where kind <> 'other';

-- Obligations from the simulated F24 calendar the owner marked as not due.
create table if not exists fiscale.obligation_dismissals (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  obligation_key text not null check (obligation_key ~ '^[a-z_0-9]+(:[a-z_0-9]+)*:[0-9]{4}$'),
  reason text,
  created_at timestamptz not null default now(),
  primary key (user_id, obligation_key)
);

alter table fiscale.obligation_dismissals enable row level security;
create policy "obligation_dismissals_owner_all" on fiscale.obligation_dismissals
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on fiscale.obligation_dismissals to authenticated;
grant all on fiscale.obligation_dismissals to service_role;

-- -----------------------------------------------------------------------------
-- Storage: F24 receipts, private, max 5 MB, PDF or images, folder = auth.uid()
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fiscale-f24', 'fiscale-f24', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "fiscale_f24_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'fiscale-f24' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "fiscale_f24_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fiscale-f24' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "fiscale_f24_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fiscale-f24' and (storage.foldername(name))[1] = (select auth.uid())::text);
