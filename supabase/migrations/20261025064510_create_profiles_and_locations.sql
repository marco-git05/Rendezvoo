create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

create table user_locations (
  user_id uuid primary key references profiles(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  label text
);