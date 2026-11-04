-- =============================================================================
-- Fiscale — fatture scartate dallo SdI
-- Una fattura scartata (ricevuta NS) si considera non emessa: va corretta e
-- reinviata con lo stesso numero e data entro 5 giorni. Solo in quello stato si
-- possono aggiornare i dati del cliente congelati all'emissione.
-- =============================================================================

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
      new.forfettario_clause)
     is distinct from
     (old.client_id, old.document_type, old.fiscal_year, old.number, old.issue_date,
      old.taxable_amount, old.stamp_duty_amount, old.stamp_duty_charged, old.total_amount,
      old.forfettario_clause) then
    raise exception 'Invoice % is issued: fiscal fields are read-only', old.id;
  end if;
  if new.client_snapshot is distinct from old.client_snapshot and old.sdi_status <> 'rejected' then
    raise exception 'Invoice % is issued: client data can change only after an SdI rejection', old.id;
  end if;
  if new.status = 'draft' then
    raise exception 'An issued invoice cannot go back to draft';
  end if;
  return new;
end;
$$;

revoke execute on function fiscale.guard_issued_invoice() from public, anon;
