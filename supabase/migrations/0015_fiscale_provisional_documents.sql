-- =============================================================================
-- Fiscale: file "provvisori" di un pagamento (es. prenotazione del bollo,
-- ricevuta di invio di un F24 programmato). Finche' un pagamento ha solo file
-- provvisori, la dashboard continua a chiedere la ricevuta definitiva.
-- =============================================================================

alter table fiscale.documents
  add column if not exists provisional boolean not null default false;
