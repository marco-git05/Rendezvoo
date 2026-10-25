create table hangout_forms (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  created_by uuid not null references profiles(id),
  title text,
  deadline timestamptz,
  status text not null default 'open' check (status in ('open','closed','decided')),
  created_at timestamptz default now()
);

-- the dates the creator offers (the When2Meet-style calendar)
create table form_dates (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references hangout_forms(id) on delete cascade,
  date date not null,
  unique (form_id, date)
);

-- premade AND custom questions share one table
create table form_questions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references hangout_forms(id) on delete cascade,
  premade_key text,  -- 'driver', 'vibe', 'budget', 'deadline', ... null if custom
  prompt text not null,
  type text not null check (type in ('frq','yn','mcq')),
  options jsonb,     -- for mcq: ["Casual","Night out"]
  position int default 0
);

create table form_availability (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references hangout_forms(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  start_time time,  -- null start/end = free all day
  end_time time
);

create table form_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references form_questions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  answer jsonb not null,
  unique (question_id, user_id)
);

-- marks who has submitted, so "answered before the deadline" is easy to query
create table form_responses (
  form_id uuid references hangout_forms(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  submitted_at timestamptz default now(),
  primary key (form_id, user_id)
);