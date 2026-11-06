-- =============================================================================
-- Fiscale: le immagini e i video delle guide di pagamento caricati dal
-- proprietario (cartella <owner id>/guide nel bucket `fiscale-guide`) sono
-- visibili, in sola lettura, agli utenti della sezione Fiscale.
-- La lista delle email è la stessa di FISCALE_USERS in src/lib/auth/access.js:
-- se ne cambi una, aggiorna anche questa policy (drop + create).
-- =============================================================================

create policy "fiscale_guide_shared_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'fiscale-guide'
    and (storage.foldername(name))[1] = '9e3b974d-02c8-41fc-bd0e-4347694bbbfa'
    and (storage.foldername(name))[2] = 'guide'
    and lower(coalesce(auth.jwt() ->> 'email', '')) = any (array['gabriele.bellezza1999@gmail.com'])
  );
