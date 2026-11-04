-- =============================================================================
-- Fiscale: crediti d'imposta (es. credito IRPEF dalla dichiarazione) e loro
-- utilizzo in compensazione negli F24. Il residuo = importo - utilizzi; un
-- trigger impedisce di usare piu' del credito disponibile.
-- =============================================================================

create table if not exists fiscale.tax_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null default 'irpef' check (kind in ('irpef', 'substitute_tax', 'inps', 'other')),
  reference_year smallint not null check (reference_year between 2000 and 2100),
  amount numeric(12,2) not null check (amount > 0),
  destination text not null default 'compensation' check (destination in ('compensation', 'refund')),
  source text check (source is null or length(source) <= 200),
  document_id uuid references fiscale.documents (id) on delete set null,
  notes text check (notes is null or length(notes) <= 1000),
  created_at timestamptz not null default now()
);
create index if not exists tax_credits_user_id_idx on fiscale.tax_credits (user_id);
create index if not exists tax_credits_document_id_idx on fiscale.tax_credits (document_id);

create table if not exists fiscale.tax_credit_uses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  credit_id uuid not null references fiscale.tax_credits (id) on delete cascade,
  used_at date not null,
  amount numeric(12,2) not null check (amount > 0),
  inps_payment_id uuid references fiscale.inps_payments (id) on delete cascade,
  tax_payment_id uuid references fiscale.tax_payments (id) on delete cascade,
  note text check (note is null or length(note) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists tax_credit_uses_credit_id_idx on fiscale.tax_credit_uses (credit_id);
create index if not exists tax_credit_uses_user_id_idx on fiscale.tax_credit_uses (user_id);
create index if not exists tax_credit_uses_inps_payment_id_idx on fiscale.tax_credit_uses (inps_payment_id);
create index if not exists tax_credit_uses_tax_payment_id_idx on fiscale.tax_credit_uses (tax_payment_id);

alter table fiscale.tax_credits enable row level security;
alter table fiscale.tax_credit_uses enable row level security;
create policy "tax_credits_owner_all" on fiscale.tax_credits
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "tax_credit_uses_owner_all" on fiscale.tax_credit_uses
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from fiscale.tax_credits c where c.id = credit_id and c.user_id = (select auth.uid()))
  );

-- A credit cannot be used for more than its amount.
create or replace function fiscale.check_credit_residual()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  total numeric;
  used numeric;
begin
  select amount into total from fiscale.tax_credits where id = new.credit_id;
  select coalesce(sum(amount), 0) into used from fiscale.tax_credit_uses where credit_id = new.credit_id and id <> new.id;
  if used + new.amount > total then
    raise exception 'Credit % exceeded: residual %', new.credit_id, total - used;
  end if;
  return new;
end;
$$;
revoke execute on function fiscale.check_credit_residual() from public, anon;

create trigger tax_credit_uses_residual
  before insert or update on fiscale.tax_credit_uses
  for each row execute function fiscale.check_credit_residual();

grant select, insert, update, delete on fiscale.tax_credits, fiscale.tax_credit_uses to authenticated;
grant all on fiscale.tax_credits, fiscale.tax_credit_uses to service_role;
