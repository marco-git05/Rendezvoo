create table hangouts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  form_id uuid references hangout_forms(id) on delete set null,
  created_by uuid references profiles(id),
  source text not null default 'manual' check (source in ('manual','ai')),
  title text not null,
  description text,
  hangout_type text,
  location_name text,
  location_address text,
  lat double precision,
  lng double precision,
  starts_at timestamptz not null,
  ends_at timestamptz,
  itinerary jsonb,           -- for day plans: [{time, title, place}, ...]
  has_album boolean not null default true,  -- school admins can switch off
  status text not null default 'proposed'
    check (status in ('proposed','confirmed','cancelled')),
  created_at timestamptz default now()
);

create table hangout_rsvps (
  hangout_id uuid references hangouts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  primary key (hangout_id, user_id)
);

create table hangout_photos (
  id uuid primary key default gen_random_uuid(),
  hangout_id uuid not null references hangouts(id) on delete cascade,
  uploaded_by uuid not null references profiles(id),
  storage_path text not null,
  created_at timestamptz default now()
);