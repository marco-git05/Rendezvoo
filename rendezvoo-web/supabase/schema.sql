-- ============================================================
-- Rendezvoo database. Run once in Supabase → SQL Editor on a fresh project.
-- ============================================================

-- ---------- Tables ----------

create table if not exists profiles (
  id          uuid primary key references auth.users on delete cascade,
  name        text,
  avatar_url  text,
  created_at  timestamptz default now()
);

-- Home pins live in their own table so they're only visible in groups where the
-- owner turned on "share my home location".
create table if not exists homes (
  user_id  uuid primary key references profiles on delete cascade,
  lat      double precision not null,
  lng      double precision not null
);

create table if not exists groups (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  kind         text not null default 'friends' check (kind in ('friends','school','work')),
  avatar_url   text,
  invite_code  text unique not null default upper(substr(md5(random()::text), 1, 6)),
  admin_id     uuid references profiles(id),
  created_at   timestamptz default now()
);

create table if not exists group_members (
  group_id        uuid references groups on delete cascade,
  user_id         uuid references profiles on delete cascade,
  color           text not null default (array['#E2603B','#F2A541','#3BA776','#2D9CDB','#6C5CE7','#D6457A','#5D6D7E'])[floor(random()*7)::int + 1],
  pinned          boolean not null default false,
  share_location  boolean not null default false,
  is_priority     boolean not null default false,  -- "priority attendance" (school/work groups only)
  joined_at       timestamptz default now(),
  primary key (group_id, user_id)
);

create table if not exists invites (
  id             uuid primary key default gen_random_uuid(),
  group_id       uuid not null references groups on delete cascade,
  creator_id     uuid not null references profiles(id),
  title          text,
  dates          date[] not null default '{}',
  questions      jsonb not null default '[]',   -- [{id, type:'frq'|'yn'|'mcq', prompt, options?}]
  deadline       timestamptz,
  status         text not null default 'open' check (status in ('open','planned','closed')),
  tz_offset      int not null default 0,        -- creator's Date.getTimezoneOffset()
  location_hint  text,                          -- optional area for place/event search
  album          boolean not null default true, -- photo album on the resulting event
  start_hour     int not null default 9,        -- time range people pick hours in (24h)
  end_hour       int not null default 22,       -- exclusive: 22 = until 10 PM
  created_at     timestamptz default now()
);

create table if not exists responses (
  id            uuid primary key default gen_random_uuid(),
  invite_id     uuid not null references invites on delete cascade,
  user_id       uuid not null references profiles(id),
  availability  jsonb not null default '{}',   -- {"2026-10-31": [18, 19, 20]}  (hours free)
  answers       jsonb not null default '{}',   -- {questionId: answer}
  created_at    timestamptz default now(),
  unique (invite_id, user_id)
);

create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups on delete cascade,
  invite_id   uuid references invites on delete set null,
  title       text not null,
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  location    text,
  details     jsonb,   -- AI plan: {description, reasoning, itinerary:[{time,activity,place}], drivers, free_people}
  album       boolean not null default true,
  created_by  uuid references profiles(id),
  created_at  timestamptz default now()
);

create table if not exists event_rsvps (
  event_id  uuid references events on delete cascade,
  user_id   uuid references profiles on delete cascade,
  status    text not null default 'pending' check (status in ('going','declined','pending')),
  primary key (event_id, user_id)
);

create table if not exists photos (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events on delete cascade,
  user_id     uuid not null references profiles(id),
  url         text not null,
  created_at  timestamptz default now()
);

-- ---------- Helper functions (security definer avoids RLS recursion) ----------

create or replace function is_member(g uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from group_members where group_id = g and user_id = auth.uid());
$$;

create or replace function is_admin(g uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from groups where id = g and admin_id = auth.uid());
$$;

create or replace function shares_group(other uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from group_members a join group_members b on a.group_id = b.group_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

create or replace function can_see_invite(inv uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from invites i where i.id = inv and is_member(i.group_id));
$$;

create or replace function can_see_event(ev uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from events e where e.id = ev and is_member(e.group_id));
$$;

create or replace function create_group(group_name text, group_kind text default 'friends') returns uuid
language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  insert into groups (name, kind, admin_id) values (group_name, group_kind, auth.uid()) returning id into gid;
  insert into group_members (group_id, user_id) values (gid, auth.uid());
  return gid;
end $$;

create or replace function join_group(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select id into gid from groups where invite_code = upper(trim(code));
  if gid is null then raise exception 'No group found with that code'; end if;
  insert into group_members (group_id, user_id) values (gid, auth.uid()) on conflict do nothing;
  return gid;
end $$;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();

-- ---------- Row level security ----------

alter table profiles      enable row level security;
alter table homes         enable row level security;
alter table groups        enable row level security;
alter table group_members enable row level security;
alter table invites       enable row level security;
alter table responses     enable row level security;
alter table events        enable row level security;
alter table event_rsvps   enable row level security;
alter table photos        enable row level security;

create policy "see self and groupmates" on profiles for select using (id = auth.uid() or shares_group(id));
create policy "edit own profile"        on profiles for update using (id = auth.uid());

create policy "own home" on homes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "groupmates see shared homes" on homes for select using (
  exists (
    select 1 from group_members owner
    join group_members viewer on viewer.group_id = owner.group_id
    where owner.user_id = homes.user_id and owner.share_location and viewer.user_id = auth.uid()
  )
);

create policy "members see group"  on groups for select using (is_member(id));
create policy "members edit group" on groups for update using (is_member(id));   -- anyone can change name/photo

create policy "members see members"  on group_members for select using (is_member(group_id));
create policy "edit own membership"  on group_members for update using (user_id = auth.uid());
create policy "admin edits members"  on group_members for update using (is_admin(group_id));  -- priority toggles
create policy "leave group"          on group_members for delete using (user_id = auth.uid());

create policy "members see invites"    on invites for select using (is_member(group_id));
create policy "members make invites"   on invites for insert with check (is_member(group_id) and creator_id = auth.uid());
create policy "members update invites" on invites for update using (is_member(group_id));

create policy "members see responses" on responses for select using (can_see_invite(invite_id));
create policy "write own response"    on responses for insert with check (user_id = auth.uid() and can_see_invite(invite_id));
create policy "update own response"   on responses for update using (user_id = auth.uid());

create policy "members see events"  on events for select using (is_member(group_id));
create policy "members make events" on events for insert with check (is_member(group_id) and created_by = auth.uid());
create policy "members edit events" on events for update using (is_member(group_id));
create policy "creator or admin deletes events" on events for delete using (created_by = auth.uid() or is_admin(group_id));

create policy "members see rsvps" on event_rsvps for select using (can_see_event(event_id));
create policy "write own rsvp"    on event_rsvps for insert with check (user_id = auth.uid() and can_see_event(event_id));
create policy "update own rsvp"   on event_rsvps for update using (user_id = auth.uid());

create policy "members see photos" on photos for select using (can_see_event(event_id));
create policy "members add photos" on photos for insert with check (user_id = auth.uid() and can_see_event(event_id));

-- ---------- Storage (profile pics, group pics, album photos) ----------

insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('photos',  'photos',  true) on conflict do nothing;

create policy "read images"    on storage.objects for select using (bucket_id in ('avatars','photos'));
create policy "upload images"  on storage.objects for insert to authenticated with check (bucket_id in ('avatars','photos'));
create policy "replace images" on storage.objects for update to authenticated using (bucket_id in ('avatars','photos'));
