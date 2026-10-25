-- 1) New signup automatically gets a profile row
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)));
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- 2) Whoever creates a group becomes its admin
create function add_creator_as_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into group_members (group_id, user_id, role)
  values (new.id, new.created_by, 'admin');
  return new;
end $$;

create trigger on_group_created
after insert on groups
for each row execute function add_creator_as_admin();

-- 3) Priority attendance only applies to non-friend groups
create function check_priority() returns trigger
language plpgsql as $$
begin
  if new.is_priority and (select group_type from groups where id = new.group_id) = 'friends' then
    raise exception 'Priority attendance is not available in friend groups';
  end if;
  return new;
end $$;

create trigger enforce_priority
before insert or update on group_members
for each row execute function check_priority();