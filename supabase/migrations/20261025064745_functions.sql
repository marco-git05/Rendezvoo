-- Join a group with its code
create function join_group_by_code(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  select id into gid from groups where join_code = code;
  if gid is null then raise exception 'Invalid join code'; end if;
  insert into group_members (group_id, user_id) values (gid, auth.uid())
  on conflict do nothing;
  return gid;
end $$;

-- Anyone in the group can change the group photo (not only the admin)
create function set_group_avatar(gid uuid, url text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_group_member(gid) then raise exception 'Not a member'; end if;
  update groups set avatar_url = url where id = gid;
end $$;

-- Admin sets roles / priority attendance
create function admin_set_member(gid uuid, uid uuid, new_role text, new_priority boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_group_admin(gid) then raise exception 'Admins only'; end if;
  update group_members set role = new_role, is_priority = new_priority
  where group_id = gid and user_id = uid;
end $$;

-- Roll up a form's responses: this is the data the AI will read later
create function get_form_summary(fid uuid) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'respondents', (select count(*) from form_responses where form_id = fid),
    'date_votes', coalesce((
      select jsonb_agg(jsonb_build_object('date', date, 'people_available', cnt) order by cnt desc)
      from (select date, count(distinct user_id) cnt
            from form_availability where form_id = fid group by date) d), '[]'::jsonb),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'prompt', q.prompt, 'type', q.type, 'premade_key', q.premade_key,
        'answers', (select coalesce(jsonb_agg(a.answer), '[]'::jsonb)
                    from form_answers a where a.question_id = q.id)))
      from form_questions q where q.form_id = fid), '[]'::jsonb)
  )
$$;