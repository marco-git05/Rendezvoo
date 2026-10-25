create function is_group_member(gid uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from group_members where group_id = gid and user_id = auth.uid())
$$;

create function is_group_admin(gid uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from group_members
                 where group_id = gid and user_id = auth.uid() and role = 'admin')
$$;

alter table profiles          enable row level security;
alter table user_locations    enable row level security;
alter table groups            enable row level security;
alter table group_members     enable row level security;
alter table hangout_forms     enable row level security;
alter table form_dates        enable row level security;
alter table form_questions    enable row level security;
alter table form_availability enable row level security;
alter table form_answers      enable row level security;
alter table form_responses    enable row level security;
alter table hangouts          enable row level security;
alter table hangout_rsvps     enable row level security;
alter table hangout_photos    enable row level security;

-- PROFILES: anyone logged in can read, you edit only yours
create policy "read profiles" on profiles for select to authenticated using (true);
create policy "edit own profile" on profiles for update to authenticated using (id = auth.uid());

-- LOCATIONS: you manage yours; group-mates see it only if you opted to share with a shared group
create policy "own location" on user_locations for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "shared locations" on user_locations for select to authenticated using (
  exists (
    select 1 from group_members theirs
    join group_members mine on mine.group_id = theirs.group_id and mine.user_id = auth.uid()
    where theirs.user_id = user_locations.user_id and theirs.share_location
  )
);

-- GROUPS
create policy "see my groups" on groups for select to authenticated
  using (created_by = auth.uid() or is_group_member(id));
create policy "create group" on groups for insert to authenticated
  with check (created_by = auth.uid());
create policy "admin edits group" on groups for update to authenticated
  using (is_group_admin(id));
create policy "admin deletes group" on groups for delete to authenticated
  using (is_group_admin(id));

-- GROUP MEMBERS
create policy "see co-members" on group_members for select to authenticated
  using (is_group_member(group_id));
create policy "update own settings" on group_members for update to authenticated
  using (user_id = auth.uid());
create policy "leave group" on group_members for delete to authenticated
  using (user_id = auth.uid() or is_group_admin(group_id));

-- A user can only change their own personal settings, never their role or priority
revoke update on group_members from authenticated;
grant update (is_pinned, calendar_color, share_location) on group_members to authenticated;

create policy "members read forms" on hangout_forms for select to authenticated
  using (is_group_member(group_id));
create policy "members create forms" on hangout_forms for insert to authenticated
  with check (is_group_member(group_id) and created_by = auth.uid());
create policy "creator or admin edits form" on hangout_forms for update to authenticated
  using (created_by = auth.uid() or is_group_admin(group_id));

-- helper so child tables can find their group
create function form_group(fid uuid) returns uuid
language sql security definer set search_path = public stable as $$
  select group_id from hangout_forms where id = fid
$$;

create policy "read dates" on form_dates for select to authenticated
  using (is_group_member(form_group(form_id)));
create policy "creator writes dates" on form_dates for all to authenticated
  using (exists (select 1 from hangout_forms f where f.id = form_id and f.created_by = auth.uid()))
  with check (exists (select 1 from hangout_forms f where f.id = form_id and f.created_by = auth.uid()));

create policy "read questions" on form_questions for select to authenticated
  using (is_group_member(form_group(form_id)));
create policy "creator writes questions" on form_questions for all to authenticated
  using (exists (select 1 from hangout_forms f where f.id = form_id and f.created_by = auth.uid()))
  with check (exists (select 1 from hangout_forms f where f.id = form_id and f.created_by = auth.uid()));

create policy "read availability" on form_availability for select to authenticated
  using (is_group_member(form_group(form_id)));
create policy "write own availability" on form_availability for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "read answers" on form_answers for select to authenticated
  using (is_group_member(form_group((select form_id from form_questions where id = question_id))));
create policy "write own answers" on form_answers for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "read responses" on form_responses for select to authenticated
  using (is_group_member(form_group(form_id)));
create policy "submit own response" on form_responses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
  create policy "read hangouts" on hangouts for select to authenticated
  using (is_group_member(group_id));
create policy "members create hangouts" on hangouts for insert to authenticated
  with check (is_group_member(group_id) and created_by = auth.uid());
create policy "creator or admin edits hangout" on hangouts for update to authenticated
  using (created_by = auth.uid() or is_group_admin(group_id));
create policy "creator or admin deletes hangout" on hangouts for delete to authenticated
  using (created_by = auth.uid() or is_group_admin(group_id));

create policy "read rsvps" on hangout_rsvps for select to authenticated
  using (is_group_member((select group_id from hangouts where id = hangout_id)));
create policy "manage own rsvp" on hangout_rsvps for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "read photos" on hangout_photos for select to authenticated
  using (is_group_member((select group_id from hangouts where id = hangout_id)));
create policy "add photos" on hangout_photos for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (select 1 from hangouts h where h.id = hangout_id
                and h.has_album and is_group_member(h.group_id))
  );
create policy "delete own photos" on hangout_photos for delete to authenticated
  using (uploaded_by = auth.uid());