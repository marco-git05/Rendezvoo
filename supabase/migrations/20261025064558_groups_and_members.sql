create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar_url text,
  group_type text not null default 'friends'
    check (group_type in ('friends','school','work')),
  join_code text unique default substr(md5(random()::text), 1, 8),
  created_by uuid not null references profiles(id),
  created_at timestamptz default now()
);

create table group_members (
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','member')),
  is_priority boolean not null default false,
  is_pinned boolean not null default false,
  calendar_color text default '#6C8EF5',
  share_location boolean not null default false,
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);