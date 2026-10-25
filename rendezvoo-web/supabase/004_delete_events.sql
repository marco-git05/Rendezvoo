-- Run once in Supabase → SQL Editor: lets a hangout's creator (or the group admin) delete it.
create policy "creator or admin deletes events" on events for delete
  using (created_by = auth.uid() or is_admin(group_id));
