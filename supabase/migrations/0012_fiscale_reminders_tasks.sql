-- =============================================================================
-- Fiscale: adempimenti non di pagamento e promemoria personali.
-- * reminders: promemoria creati dal proprietario (IMU, bollo auto, ...),
--   una tantum o ricorrenti, personali o dell'attivita'
-- * task_completions: adempimenti segnati come fatti (anche quelli generati
--   dal calendario, es. "filing:redditi:2026"), con ricevuta opzionale in Documenti
-- =============================================================================

create table if not exists fiscale.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  scope text not null default 'personal' check (scope in ('personal', 'business')),
  first_due date not null,
  recurrence text not null default 'yearly' check (recurrence in ('once', 'monthly', 'yearly')),
  amount numeric(12,2) check (amount is null or amount >= 0),
  notes text check (notes is null or length(notes) <= 1000),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists reminders_user_id_idx on fiscale.reminders (user_id);

create table if not exists fiscale.task_completions (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  task_key text not null check (task_key ~ '^[a-z0-9_:-]{3,120}$'),
  completed_at date not null default current_date,
  document_id uuid references fiscale.documents (id) on delete set null,
  note text check (note is null or length(note) <= 500),
  created_at timestamptz not null default now(),
  primary key (user_id, task_key)
);
create index if not exists task_completions_document_id_idx on fiscale.task_completions (document_id);

alter table fiscale.reminders enable row level security;
alter table fiscale.task_completions enable row level security;

create policy "reminders_owner_all" on fiscale.reminders
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "task_completions_owner_all" on fiscale.task_completions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on fiscale.reminders, fiscale.task_completions to authenticated;
grant all on fiscale.reminders, fiscale.task_completions to service_role;
