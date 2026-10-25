-- Run this once in Supabase → SQL Editor if you already ran schema.sql before hourly availability existed.
alter table invites add column if not exists start_hour int not null default 9;
alter table invites add column if not exists end_hour   int not null default 22;
