-- =============================================================================
-- Fiscale: i tutorial di pagamento (immagini e video nella cartella
-- <owner id>/guide del bucket `fiscale-guide`) sono leggibili da tutti gli
-- utenti con un accesso, senza più una lista di email da tenere allineata.
-- Solo l'owner li carica (le altre policy restano sulla propria cartella).
-- Tutti gli altri file (archivio, allegati della chat, ricevute) restano privati per utente.
-- =============================================================================

drop policy if exists "fiscale_guide_shared_select" on storage.objects;

create policy "fiscale_guide_shared_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'fiscale-guide'
    and (storage.foldername(name))[1] = '9e3b974d-02c8-41fc-bd0e-4347694bbbfa'
    and (storage.foldername(name))[2] = 'guide'
  );
