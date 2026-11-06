-- =============================================================================
-- Fiscale: allegati della chat "Chiedi" (foto, PDF, Word, PowerPoint, testo).
-- Il browser li carica qui, una cartella per utente; la route li legge o ne
-- crea link firmati per la cartella temporanea di Claude. Separati
-- dall'archivio (`fiscale-docs`): la route cancella quelli più vecchi di 30 giorni.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fiscale-chat', 'fiscale-chat', false, 20971520,
        array[
          'application/pdf',
          'image/png',
          'image/jpeg',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'text/markdown',
          'text/csv',
          'application/xml',
          'text/xml',
          'message/rfc822'
        ])
on conflict (id) do nothing;

create policy "fiscale_chat_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'fiscale-chat' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "fiscale_chat_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fiscale-chat' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "fiscale_chat_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fiscale-chat' and (storage.foldername(name))[1] = (select auth.uid())::text);
