-- =============================================================================
-- Fiscale: piu' file per ogni pagamento (modello F24, quietanza della banca,
-- ricevuta dell'Agenzia...). I file sono normali documenti dell'archivio
-- (fiscale.documents, bucket `fiscale-docs`) collegati a un versamento INPS o
-- Erario. Se il pagamento viene cancellato il documento resta in archivio.
-- =============================================================================

alter table fiscale.documents
  add column if not exists inps_payment_id uuid references fiscale.inps_payments (id) on delete set null,
  add column if not exists tax_payment_id uuid references fiscale.tax_payments (id) on delete set null;

alter table fiscale.documents
  drop constraint if exists documents_one_payment_check;
alter table fiscale.documents
  add constraint documents_one_payment_check check (num_nonnulls(inps_payment_id, tax_payment_id) <= 1);

create index if not exists documents_inps_payment_id_idx on fiscale.documents (inps_payment_id) where inps_payment_id is not null;
create index if not exists documents_tax_payment_id_idx on fiscale.documents (tax_payment_id) where tax_payment_id is not null;
