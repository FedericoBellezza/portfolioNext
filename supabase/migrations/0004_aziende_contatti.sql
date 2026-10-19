-- Pipeline B2B "azienda -> persona giusta -> messaggio" (sostituisce il flusso Instagram su public.leads).
--
-- Solo aggiunte: public.leads non viene toccata qui. Il rename in leads_instagram_archivio avviene al
-- cutover, quando la dashboard punta alle nuove tabelle.
--
-- Rieseguibile.
-- Accesso: RLS attivo e nessuna policy, come per leads. Ci si arriva solo con la service role
-- (route API della dashboard e workflow n8n).

create table if not exists public.aziende (
  id                  uuid primary key default gen_random_uuid(),
  ragione_sociale     text not null,
  dominio             text unique,
  sito_url            text,
  fonte               text not null default 'csv'
                        check (fonte in ('google_maps', 'apollo', 'csv')),
  google_place_id     text unique,
  settore             text,
  citta               text,
  dipendenti_stimati  integer check (dipendenti_stimati >= 0),
  fascia_dimensione   text
                        check (fascia_dimensione in ('1-10', '11-50', '51-250', '250+')),
  descrizione         text,
  punti_carenti       jsonb not null default '[]'::jsonb,
  tag                 text[] not null default '{}',
  punteggio           smallint check (punteggio between 1 and 10),
  stato               text not null default 'nuova'
                        check (stato in (
                          'nuova', 'arricchita', 'contatto_trovato', 'messaggio_pronto',
                          'da_rivedere', 'contattata', 'risposta', 'scartata',
                          'fuori_target', 'errore_analisi'
                        )),
  note                text,
  costo_usd           numeric(8, 4),
  analizzata_il       timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.contatti (
  id                       uuid primary key default gen_random_uuid(),
  azienda_id               uuid not null references public.aziende (id) on delete cascade,
  nome                     text not null,
  ruolo                    text,
  livello                  text check (livello in ('vertice', 'responsabile', 'operativo')),
  ruolo_target             text,
  motivo_scelta            text,
  angolo                   text,
  linkedin_url             text,
  email                    text,
  email_stato              text
                             check (email_stato in ('trovata', 'inferita', 'verificata', 'non_valida')),
  confidenza               numeric(3, 2) check (confidenza between 0 and 1),
  fonte_url                text,
  evidenza                 text,
  principale               boolean not null default false,
  messaggio_email_oggetto  text,
  messaggio_email          text,
  messaggio_linkedin       text,
  stato                    text not null default 'candidato'
                             check (stato in (
                               'candidato', 'messaggio_pronto', 'da_rivedere',
                               'contattato', 'risposto', 'scartato'
                             )),
  canale_invio             text check (canale_invio in ('email', 'linkedin', 'whatsapp', 'telefono')),
  messaggio_inviato_il     timestamptz,
  risposto_il              timestamptz,
  esito                    text
                             check (esito in (
                               'nessuna_risposta', 'interessato', 'non_interessato',
                               'call_fissata', 'cliente', 'non_raggiungibile'
                             )),
  data_followup            date,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists aziende_stato_idx on public.aziende (stato);
create index if not exists contatti_azienda_idx on public.contatti (azienda_id);
-- Lo stesso nome non si ripete nella stessa azienda: il workflow può rilanciare l'analisi con upsert.
create unique index if not exists contatti_azienda_nome_uq
  on public.contatti (azienda_id, lower(nome));
-- Al più un contatto principale per azienda.
create unique index if not exists contatti_un_principale_uq
  on public.contatti (azienda_id) where principale;

create or replace function public.pipeline_b2b_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists aziende_updated_at on public.aziende;
create trigger aziende_updated_at
  before update on public.aziende
  for each row execute function public.pipeline_b2b_set_updated_at();

drop trigger if exists contatti_updated_at on public.contatti;
create trigger contatti_updated_at
  before update on public.contatti
  for each row execute function public.pipeline_b2b_set_updated_at();

alter table public.aziende enable row level security;
alter table public.contatti enable row level security;
