-- =============================================================================
-- Fiscale — gestionale fiscale personale (dashboard /dashboard/fiscale)
-- Regime Forfettario, INPS Gestione Artigiani, FatturaPA via Invoicetronic.
-- Lives in its own schema `fiscale` inside the shared portfolio project.
-- Single owner per row (user_id = auth.uid()), enforced by RLS everywhere.
-- Requires `fiscale` in Settings → Data API → Exposed schemas.
-- Money: numeric(12,2) in euro. The app converts to integer cents for math.
-- =============================================================================

create schema if not exists fiscale;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type fiscale.client_kind as enum ('company', 'individual', 'public_administration', 'foreign');

create type fiscale.invoice_status as enum ('draft', 'issued', 'cancelled');

-- Lifecycle on the Sistema di Interscambio (SdI)
create type fiscale.sdi_status as enum (
  'not_sent',       -- local only
  'queued',         -- handed to the provider
  'sent',           -- provider forwarded to SdI
  'delivered',      -- RC  ricevuta di consegna
  'not_delivered',  -- MC  mancata consegna (available in the client's cassetto fiscale)
  'rejected',       -- NS  scartata by SdI: must be fixed and re-sent within 5 days
  'accepted',       -- NE  esito committente EC01 (PA only)
  'refused',        -- NE  esito committente EC02 (PA only)
  'expired'         -- DT  decorrenza termini (PA only)
);

create type fiscale.inps_payment_kind as enum (
  'fixed_q1', 'fixed_q2', 'fixed_q3', 'fixed_q4',
  'excess_balance', 'excess_advance_1', 'excess_advance_2',
  'other'
);

create type fiscale.tax_payment_kind as enum (
  'substitute_tax_balance',    -- 1792
  'substitute_tax_advance_1',  -- 1790
  'substitute_tax_advance_2',  -- 1791
  'stamp_duty_q1',             -- 2521
  'stamp_duty_q2',             -- 2522
  'stamp_duty_q3',             -- 2523
  'stamp_duty_q4',             -- 2524
  'chamber_fee',               -- 3850
  'other'
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function fiscale.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- fiscal_profiles — one row per user: my own anagrafica + tax settings
-- ---------------------------------------------------------------------------
create table fiscale.fiscal_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,

  -- Cedente/prestatore (used in the FatturaPA header)
  first_name text not null,
  last_name text not null,
  vat_number char(11) not null check (vat_number ~ '^[0-9]{11}$'),
  tax_code text not null check (tax_code ~ '^[A-Z0-9]{16}$'),
  address text not null,
  street_number text,
  postal_code char(5) not null check (postal_code ~ '^[0-9]{5}$'),
  city text not null,
  province char(2) not null check (province ~ '^[A-Z]{2}$'),
  country char(2) not null default 'IT',
  email text,
  pec text,
  iban text check (iban is null or iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$'),

  -- Tax settings (mirrors FiscalProfile in src/lib/tax-config.ts)
  activity_start_date date not null default '2025-11-01',
  ateco_code text not null default '62.10.00',
  regime_fiscale char(4) not null default 'RF19',
  profitability_coefficient numeric(4,3) not null default 0.670
    check (profitability_coefficient > 0 and profitability_coefficient <= 1),
  startup_tax_rate numeric(4,3) not null default 0.050,
  standard_tax_rate numeric(4,3) not null default 0.150,
  startup_years smallint not null default 5,
  inps_scheme text not null default 'artigiani' check (inps_scheme in ('artigiani')),
  inps_reduction_35_active boolean not null default false,
  inps_reduction_50_new_enrollment_active boolean not null default false,
  charge_stamp_duty_to_client boolean not null default true,

  -- Invoicing
  invoice_number_prefix text not null default '',
  default_payment_terms_days smallint not null default 30,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger fiscal_profiles_updated_at
  before update on fiscale.fiscal_profiles
  for each row execute function fiscale.set_updated_at();

-- ---------------------------------------------------------------------------
-- clients — Anagrafica clienti (cessionario/committente)
-- ---------------------------------------------------------------------------
create table fiscale.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind fiscale.client_kind not null default 'company',

  company_name text,           -- Denominazione
  first_name text,             -- Nome (individuals)
  last_name text,              -- Cognome (individuals)
  vat_number text,             -- IdFiscaleIVA/IdCodice (no country prefix)
  vat_country char(2) not null default 'IT',
  tax_code text,               -- CodiceFiscale

  -- Recapito SdI: 7 chars for privates, 6 for PA (codice univoco ufficio)
  sdi_code text not null default '0000000' check (sdi_code ~ '^[A-Z0-9]{6,7}$'),
  pec text,

  address text not null,
  street_number text,
  postal_code text not null,
  city text not null,
  province char(2),
  country char(2) not null default 'IT',

  email text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint clients_name_present check (
    company_name is not null or (first_name is not null and last_name is not null)
  ),
  constraint clients_fiscal_id_present check (vat_number is not null or tax_code is not null),
  constraint clients_italian_fields check (
    country <> 'IT' or (postal_code ~ '^[0-9]{5}$' and province ~ '^[A-Z]{2}$')
  ),
  constraint clients_pa_sdi_code check (kind <> 'public_administration' or length(sdi_code) = 6),
  constraint clients_foreign_sdi_code check (kind <> 'foreign' or sdi_code = 'XXXXXXX')
);

create index clients_user_id_idx on fiscale.clients (user_id);
create trigger clients_updated_at
  before update on fiscale.clients
  for each row execute function fiscale.set_updated_at();

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------
create table fiscale.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id uuid not null references fiscale.clients (id) on delete restrict,

  status fiscale.invoice_status not null default 'draft',
  document_type char(4) not null default 'TD01' check (document_type in ('TD01', 'TD04', 'TD05', 'TD06')),
  -- Number is assigned when the invoice is issued (see issue_invoice()).
  fiscal_year smallint,
  number integer,
  issue_date date,
  due_date date,

  -- Totals (computed by src/lib/invoice-math.ts, frozen on issue)
  currency char(3) not null default 'EUR',
  taxable_amount numeric(12,2) not null default 0 check (taxable_amount >= 0),
  stamp_duty_amount numeric(12,2) not null default 0 check (stamp_duty_amount in (0, 2)),
  stamp_duty_charged boolean not null default false,
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),

  payment_method char(4) not null default 'MP05', -- MP05 bonifico
  payment_iban text,
  forfettario_clause text not null,
  notes text,
  -- Client anagrafica as it was when the invoice was issued
  client_snapshot jsonb,
  -- Original invoice for credit notes (TD04)
  related_invoice_id uuid references fiscale.invoices (id),

  -- SdI / provider
  sdi_status fiscale.sdi_status not null default 'not_sent',
  sdi_provider text,                 -- 'invoicetronic'
  sdi_provider_id text,              -- id on the provider
  sdi_identifier text,               -- IdentificativoSdI
  sdi_filename text,                 -- IT{piva}_{progressivo}.xml
  sdi_last_message text,
  sdi_updated_at timestamptz,
  xml_payload text,

  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint invoices_number_unique unique (user_id, fiscal_year, number),
  constraint invoices_issued_fields check (
    status = 'draft' or (fiscal_year is not null and number is not null and issue_date is not null)
  )
);

create index invoices_user_id_idx on fiscale.invoices (user_id);
create index invoices_client_id_idx on fiscale.invoices (client_id);
create index invoices_user_issue_date_idx on fiscale.invoices (user_id, issue_date);
create index invoices_related_invoice_id_idx on fiscale.invoices (related_invoice_id);
create unique index invoices_sdi_provider_id_idx on fiscale.invoices (sdi_provider, sdi_provider_id)
  where sdi_provider_id is not null;
create trigger invoices_updated_at
  before update on fiscale.invoices
  for each row execute function fiscale.set_updated_at();

-- Issued invoices are immutable except for SdI tracking fields and cancellation.
create or replace function fiscale.guard_issued_invoice()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'draft' then
    return coalesce(new, old); -- old on DELETE: returning null would cancel it
  end if;
  if tg_op = 'DELETE' then
    raise exception 'Issued invoices cannot be deleted; issue a credit note (TD04) instead';
  end if;
  if (new.client_id, new.document_type, new.fiscal_year, new.number, new.issue_date,
      new.taxable_amount, new.stamp_duty_amount, new.stamp_duty_charged, new.total_amount,
      new.forfettario_clause, new.client_snapshot)
     is distinct from
     (old.client_id, old.document_type, old.fiscal_year, old.number, old.issue_date,
      old.taxable_amount, old.stamp_duty_amount, old.stamp_duty_charged, old.total_amount,
      old.forfettario_clause, old.client_snapshot) then
    raise exception 'Invoice % is issued: fiscal fields are read-only', old.id;
  end if;
  if new.status = 'draft' then
    raise exception 'An issued invoice cannot go back to draft';
  end if;
  return new;
end;
$$;

create trigger invoices_guard_update
  before update on fiscale.invoices
  for each row execute function fiscale.guard_issued_invoice();
create trigger invoices_guard_delete
  before delete on fiscale.invoices
  for each row execute function fiscale.guard_issued_invoice();

-- ---------------------------------------------------------------------------
-- invoice_items — DettaglioLinee
-- ---------------------------------------------------------------------------
create table fiscale.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references fiscale.invoices (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position smallint not null,
  description text not null check (length(description) between 1 and 1000),
  quantity numeric(12,4) not null default 1 check (quantity > 0),
  unit_of_measure text,
  unit_price numeric(14,4) not null,
  line_total numeric(12,2) not null,
  vat_nature char(4) not null default 'N2.2',  -- forfettario: non soggette, altri casi
  is_stamp_duty_recharge boolean not null default false,
  created_at timestamptz not null default now(),
  constraint invoice_items_position_unique unique (invoice_id, position)
);

create index invoice_items_invoice_id_idx on fiscale.invoice_items (invoice_id);
create index invoice_items_user_id_idx on fiscale.invoice_items (user_id);

create or replace function fiscale.guard_issued_invoice_items()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_status fiscale.invoice_status;
begin
  select status into parent_status
  from fiscale.invoices
  where id = coalesce(new.invoice_id, old.invoice_id);

  -- parent_status is null while the parent draft is being cascade-deleted
  if parent_status is not null and parent_status <> 'draft' then
    raise exception 'Lines of an issued invoice cannot be changed';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger invoice_items_guard
  before insert or update or delete on fiscale.invoice_items
  for each row execute function fiscale.guard_issued_invoice_items();

-- ---------------------------------------------------------------------------
-- invoice_payments — incassi (cash basis: these dates decide the tax year)
-- ---------------------------------------------------------------------------
create table fiscale.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references fiscale.invoices (id) on delete restrict,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  collected_at date not null,
  amount numeric(12,2) not null check (amount <> 0),
  method text not null default 'bonifico',
  reference text,
  notes text,
  created_at timestamptz not null default now()
);

create index invoice_payments_invoice_id_idx on fiscale.invoice_payments (invoice_id);
create index invoice_payments_user_date_idx on fiscale.invoice_payments (user_id, collected_at);

-- ---------------------------------------------------------------------------
-- inps_payments — F24 Sezione INPS (deductible in the year of payment)
-- ---------------------------------------------------------------------------
create table fiscale.inps_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  paid_at date not null,
  competence_year smallint not null,
  kind fiscale.inps_payment_kind not null,
  amount numeric(12,2) not null check (amount > 0),
  f24_causale text not null default 'AF' check (f24_causale in ('AF', 'AP')),
  f24_reference text,          -- protocollo / ricevuta F24
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inps_payments_user_date_idx on fiscale.inps_payments (user_id, paid_at);
create trigger inps_payments_updated_at
  before update on fiscale.inps_payments
  for each row execute function fiscale.set_updated_at();

-- ---------------------------------------------------------------------------
-- tax_payments — F24 Sezione Erario (imposta sostitutiva, bollo, diritto camerale)
-- ---------------------------------------------------------------------------
create table fiscale.tax_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  paid_at date not null,
  competence_year smallint not null,
  kind fiscale.tax_payment_kind not null,
  tribute_code char(4),        -- 1790, 1791, 1792, 2521-2524, 3850
  amount numeric(12,2) not null check (amount > 0),
  f24_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tax_payments_user_date_idx on fiscale.tax_payments (user_id, paid_at);
create trigger tax_payments_updated_at
  before update on fiscale.tax_payments
  for each row execute function fiscale.set_updated_at();

-- ---------------------------------------------------------------------------
-- expenses — operating costs (NOT deductible in forfettario, analytics only)
-- ---------------------------------------------------------------------------
create table fiscale.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  spent_at date not null,
  amount numeric(12,2) not null check (amount > 0),
  category text not null default 'other'
    check (category in ('software', 'hardware', 'hosting', 'office', 'training', 'travel', 'accountant', 'other')),
  vendor text,
  description text,
  receipt_path text,           -- Supabase Storage object path
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_user_date_idx on fiscale.expenses (user_id, spent_at);
create trigger expenses_updated_at
  before update on fiscale.expenses
  for each row execute function fiscale.set_updated_at();

-- ---------------------------------------------------------------------------
-- invoice_events — raw provider webhooks (Invoicetronic), written by the server
-- ---------------------------------------------------------------------------
create table fiscale.invoice_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  invoice_id uuid references fiscale.invoices (id) on delete set null,
  provider text not null,
  provider_event_id text,
  event_type text not null,
  sdi_status fiscale.sdi_status,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  constraint invoice_events_dedup unique (provider, provider_event_id)
);

create index invoice_events_invoice_id_idx on fiscale.invoice_events (invoice_id);
create index invoice_events_user_id_idx on fiscale.invoice_events (user_id);

-- ---------------------------------------------------------------------------
-- Invoice numbering: gap-free, per user and fiscal year
-- ---------------------------------------------------------------------------
create table fiscale.invoice_sequences (
  user_id uuid not null references auth.users (id) on delete cascade,
  fiscal_year smallint not null,
  last_number integer not null default 0,
  primary key (user_id, fiscal_year)
);

-- Issues a draft: assigns the next number, freezes client data. Runs as the caller (RLS applies).
create or replace function fiscale.issue_invoice(p_invoice_id uuid, p_issue_date date default current_date)
returns fiscale.invoices
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inv fiscale.invoices;
  next_number integer;
  y smallint := extract(year from p_issue_date)::smallint;
begin
  select * into inv from fiscale.invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Invoice not found';
  end if;
  if inv.status <> 'draft' then
    raise exception 'Invoice already issued';
  end if;
  if not exists (select 1 from fiscale.invoice_items where invoice_id = p_invoice_id) then
    raise exception 'Invoice has no lines';
  end if;

  insert into fiscale.invoice_sequences as s (user_id, fiscal_year, last_number)
  values (inv.user_id, y, 1)
  on conflict (user_id, fiscal_year) do update set last_number = s.last_number + 1
  returning last_number into next_number;

  update fiscale.invoices i set
    status = 'issued',
    fiscal_year = y,
    number = next_number,
    issue_date = p_issue_date,
    issued_at = now(),
    client_snapshot = (select to_jsonb(c) - 'notes' - 'user_id' from fiscale.clients c where c.id = i.client_id)
  where i.id = p_invoice_id
  returning * into inv;

  return inv;
end;
$$;

-- ---------------------------------------------------------------------------
-- Registro incassi e pagamenti (for the accountant / Quadro LM)
-- ---------------------------------------------------------------------------
create view fiscale.ledger_entries
with (security_invoker = true)
as
select
  p.user_id,
  p.collected_at as entry_date,
  'income'::text as direction,
  'invoice_payment'::text as source,
  p.id as source_id,
  i.fiscal_year,
  i.number as invoice_number,
  coalesce(c.company_name, concat_ws(' ', c.first_name, c.last_name)) as counterparty,
  coalesce(c.vat_number, c.tax_code) as counterparty_fiscal_id,
  'Incasso fattura ' || i.number || '/' || i.fiscal_year as description,
  p.amount,
  null::text as f24_code
from fiscale.invoice_payments p
join fiscale.invoices i on i.id = p.invoice_id
join fiscale.clients c on c.id = i.client_id
union all
select
  ip.user_id, ip.paid_at, 'outflow', 'inps_payment', ip.id, ip.competence_year, null,
  'INPS', null, 'Contributi INPS ' || ip.kind || ' ' || ip.competence_year, ip.amount, ip.f24_causale
from fiscale.inps_payments ip
union all
select
  tp.user_id, tp.paid_at, 'outflow', 'tax_payment', tp.id, tp.competence_year, null,
  'Agenzia delle Entrate', null, 'F24 ' || tp.kind || ' ' || tp.competence_year, tp.amount, tp.tribute_code
from fiscale.tax_payments tp;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table fiscale.fiscal_profiles enable row level security;
alter table fiscale.clients enable row level security;
alter table fiscale.invoices enable row level security;
alter table fiscale.invoice_items enable row level security;
alter table fiscale.invoice_payments enable row level security;
alter table fiscale.inps_payments enable row level security;
alter table fiscale.tax_payments enable row level security;
alter table fiscale.expenses enable row level security;
alter table fiscale.invoice_events enable row level security;
alter table fiscale.invoice_sequences enable row level security;

-- Owner-only CRUD on user tables
do $$
declare
  t text;
begin
  foreach t in array array[
    'fiscal_profiles', 'clients', 'invoices', 'invoice_items', 'invoice_payments',
    'inps_payments', 'tax_payments', 'expenses', 'invoice_sequences'
  ] loop
    execute format(
      'create policy "%1$s_owner_all" on fiscale.%1$I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end;
$$;

-- Webhook events: readable by the owner, written only by the service role (bypasses RLS)
create policy "invoice_events_owner_read" on fiscale.invoice_events
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Line items must belong to an invoice of the same user
create policy "invoice_items_parent_owner" on fiscale.invoice_items
  as restrictive for all to authenticated
  using (exists (select 1 from fiscale.invoices i where i.id = invoice_id and i.user_id = (select auth.uid())))
  with check (exists (select 1 from fiscale.invoices i where i.id = invoice_id and i.user_id = (select auth.uid())));

create policy "invoice_payments_parent_owner" on fiscale.invoice_payments
  as restrictive for all to authenticated
  using (exists (select 1 from fiscale.invoices i where i.id = invoice_id and i.user_id = (select auth.uid())))
  with check (exists (select 1 from fiscale.invoices i where i.id = invoice_id and i.user_id = (select auth.uid())));

-- Clients must belong to the same user as the invoice
create policy "invoices_client_owner" on fiscale.invoices
  as restrictive for all to authenticated
  using (true)
  with check (exists (select 1 from fiscale.clients c where c.id = client_id and c.user_id = (select auth.uid())));

-- ---------------------------------------------------------------------------
-- Grants: only signed-in users (through RLS) and the service role
-- ---------------------------------------------------------------------------
revoke all on schema fiscale from public, anon;
grant usage on schema fiscale to authenticated, service_role;

grant select, insert, update, delete on all tables in schema fiscale to authenticated;
revoke insert, update, delete on fiscale.invoice_events from authenticated;
grant all on all tables in schema fiscale to service_role;

revoke execute on all functions in schema fiscale from public, anon;
grant execute on function fiscale.issue_invoice(uuid, date) to authenticated, service_role;

alter default privileges in schema fiscale revoke all on tables from public, anon;
alter default privileges in schema fiscale revoke execute on functions from public, anon;
