-- =============================================================================
-- Fiscale: immagini e video delle guide "Come pagare".
-- Bucket privato, una cartella per utente: i file restano visibili solo al
-- proprietario tramite link temporanei (mai in /public o nel repository).
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fiscale-guide', 'fiscale-guide', false, 52428800,
        array['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm'])
on conflict (id) do nothing;

create policy "fiscale_guide_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'fiscale-guide' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "fiscale_guide_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fiscale-guide' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "fiscale_guide_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'fiscale-guide' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'fiscale-guide' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "fiscale_guide_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fiscale-guide' and (storage.foldername(name))[1] = (select auth.uid())::text);
