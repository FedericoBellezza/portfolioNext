-- Outcome of the Claude check of a payment file (kind, final or not, date,
-- amount, match with the linked payment, note). Null = not checked yet.
alter table fiscale.documents add column if not exists ai_check jsonb;
comment on column fiscale.documents.ai_check is 'Esito del controllo con Claude di un file di pagamento: tipo, definitivo, data, importo, coerenza con il pagamento, nota. Null = non ancora controllato.';
