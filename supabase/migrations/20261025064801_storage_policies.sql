create policy "members read album files" on storage.objects for select to authenticated
using (bucket_id = 'hangout-photos' and
  is_group_member((select group_id from hangouts where id = ((storage.foldername(name))[1])::uuid)));

create policy "members upload album files" on storage.objects for insert to authenticated
with check (bucket_id = 'hangout-photos' and
  is_group_member((select group_id from hangouts where id = ((storage.foldername(name))[1])::uuid)));