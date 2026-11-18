-- Additive: fourth focus, review ledger, email reminder opt-in, analytics, day personalization.
-- Does not rewrite earlier migrations and does not approve any mission.
begin;

do $$
declare cname text;
begin
  select con.conname into cname from pg_constraint con
  where con.conrelid = 'public.journey_templates'::regclass and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%self_control%';
  if cname is not null then execute format('alter table public.journey_templates drop constraint %I', cname); end if;
  select con.conname into cname from pg_constraint con
  where con.conrelid = 'public.mission_templates'::regclass and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%pending_review%';
  if cname is not null then execute format('alter table public.mission_templates drop constraint %I', cname); end if;
  select con.conname into cname from pg_constraint con
  where con.conrelid = 'public.biblical_contents'::regclass and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%pending_review%';
  if cname is not null then execute format('alter table public.biblical_contents drop constraint %I', cname); end if;
end $$;

alter table public.journey_templates add constraint journey_templates_focus_check check (focus in ('self_control','relationships','stewardship','spiritual_life'));
alter table public.mission_templates add constraint mission_templates_review_status_check check (review_status in ('pending_review','approved','needs_changes','rejected'));
alter table public.biblical_contents add constraint biblical_contents_review_status_check check (review_status in ('pending_review','approved','needs_changes','rejected'));

insert into public.journey_templates(focus, title) values ('spiritual_life', 'Vida espiritual') on conflict (focus) do nothing;

create table public.content_review_decisions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.biblical_contents(id),
  focus text not null,
  day integer not null check (day between 1 and 21),
  decision text not null check (decision in ('approved','needs_changes','rejected')),
  note text not null default '' check (length(note) <= 2000),
  reviewer_email text not null check (length(reviewer_email) between 3 and 254),
  created_at timestamptz not null default now()
);
create index content_review_latest on public.content_review_decisions(focus, day, created_at desc);
alter table public.content_review_decisions enable row level security;
revoke all on public.content_review_decisions from anon, authenticated;

create function public.apply_content_review(p_focus text, p_day integer, p_decision text, p_note text, p_reviewer_email text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare decision_id uuid; content_id uuid;
begin
  if p_focus is null or p_focus not in ('self_control','relationships','stewardship','spiritual_life') then raise exception 'Invalid focus' using errcode = '22023'; end if;
  if p_day is null or p_day < 1 or p_day > 21 then raise exception 'Invalid day' using errcode = '22023'; end if;
  if p_decision is null or p_decision not in ('approved','needs_changes','rejected') then raise exception 'Invalid decision' using errcode = '22023'; end if;
  if p_reviewer_email is null or length(trim(p_reviewer_email)) < 3 or length(p_reviewer_email) > 254 or position('@' in p_reviewer_email) < 2 then raise exception 'Invalid reviewer' using errcode = '22023'; end if;
  if p_note is null then p_note := ''; end if;
  if length(p_note) > 2000 then raise exception 'Invalid note' using errcode = '22023'; end if;
  if p_decision <> 'approved' and length(trim(p_note)) < 8 then raise exception 'Note required' using errcode = '22023'; end if;
  select m.biblical_content_id into content_id from public.mission_templates m where m.focus = p_focus and m.day = p_day;
  if content_id is null then raise exception 'Mission unavailable' using errcode = 'P0001'; end if;
  insert into public.content_review_decisions(content_id, focus, day, decision, note, reviewer_email)
  values (content_id, p_focus, p_day, p_decision, trim(p_note), lower(trim(p_reviewer_email)))
  returning id into decision_id;
  update public.mission_templates set review_status = p_decision where focus = p_focus and day = p_day;
  update public.biblical_contents set review_status = p_decision where id = content_id;
  return decision_id;
end $$;
revoke all on function public.apply_content_review(text, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.apply_content_review(text, integer, text, text, text) to service_role;

alter table public.profiles
  add column reminder_email boolean not null default false,
  add column reminder_opted_out_at timestamptz;

create function public.set_reminder_email(p_enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := private.require_user();
begin
  if p_enabled is null then raise exception 'Invalid input' using errcode = '22023'; end if;
  update public.profiles
    set reminder_email = p_enabled,
        reminder_opted_out_at = case when p_enabled then null else now() end
    where user_id = u;
end $$;
revoke all on function public.set_reminder_email(boolean) from public, anon;
grant execute on function public.set_reminder_email(boolean) to authenticated;

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event text not null check (event in ('signup','onboarding_complete','mission_view','checkin_complete','mentor_message','day7_return')),
  occurred_on date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint analytics_properties_object check (jsonb_typeof(properties) = 'object'),
  constraint analytics_properties_no_pii check (not properties ?| array['email','name','display_name','displayName','phone','reflection','message','content','goal','difficulty'])
);
create index analytics_events_owner on public.analytics_events(user_id, event, created_at desc);
create unique index analytics_signup_once on public.analytics_events(user_id) where event = 'signup';
create unique index analytics_onboarding_once on public.analytics_events(user_id) where event = 'onboarding_complete';
create unique index analytics_day7_once on public.analytics_events(user_id) where event = 'day7_return';
create unique index analytics_mission_daily on public.analytics_events(user_id, occurred_on) where event = 'mission_view';
create unique index analytics_checkin_daily on public.analytics_events(user_id, occurred_on) where event = 'checkin_complete';

alter table public.analytics_events enable row level security;
revoke all on public.analytics_events from anon, authenticated;
grant insert on public.analytics_events to authenticated;
create policy own_insert on public.analytics_events for insert to authenticated
  with check (
    (select public.session_is_valid())
    and user_id = (select auth.uid())
    and event in ('onboarding_complete','mission_view','checkin_complete','mentor_message','day7_return')
    and jsonb_typeof(properties) = 'object'
  );

create function private.record_signup_analytics() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.analytics_events(user_id, event, properties) values (new.id, 'signup', '{}'::jsonb);
  return new;
end $$;
revoke all on function private.record_signup_analytics() from public, anon, authenticated;
create trigger virtude_signup_analytics after insert on auth.users
  for each row execute function private.record_signup_analytics();

alter table public.mission_assignments
  add column personalized_practice text check (personalized_practice is null or length(personalized_practice) between 1 and 1200),
  add column personalized_title text check (personalized_title is null or length(personalized_title) between 1 and 80),
  add column personalized_commitment text check (personalized_commitment is null or length(personalized_commitment) between 1 and 180),
  add column personalization_source text check (personalization_source is null or personalization_source in ('model','fallback')),
  add column personalized_variant text check (personalized_variant is null or personalized_variant in ('standard','simplified','deepened'));

create function public.save_day_personalization(p_assignment_id uuid, p_practice text, p_title text, p_commitment text, p_source text)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := private.require_user(); a public.mission_assignments;
begin
  if p_source is null or p_source not in ('model','fallback') then raise exception 'Invalid source' using errcode = '22023'; end if;
  if p_practice is null or length(trim(p_practice)) < 1 or length(p_practice) > 1200 or position('<' in p_practice) > 0 then raise exception 'Invalid practice' using errcode = '22023'; end if;
  if p_title is not null and (length(trim(p_title)) < 1 or length(p_title) > 80 or position('<' in p_title) > 0) then raise exception 'Invalid title' using errcode = '22023'; end if;
  if p_commitment is not null and (length(trim(p_commitment)) < 1 or length(p_commitment) > 180 or position('<' in p_commitment) > 0) then raise exception 'Invalid commitment' using errcode = '22023'; end if;
  select ma.* into a from public.mission_assignments ma
    join public.journeys j on j.id = ma.journey_id and j.user_id = ma.user_id
    where ma.id = p_assignment_id and ma.user_id = u and j.status = 'active' and ma.day = j.current_day;
  if not found then raise exception 'Assignment unavailable' using errcode = 'P0001'; end if;
  if a.personalization_source is not null and a.personalized_practice is not null and a.personalized_variant = a.variant then return; end if;
  update public.mission_assignments
    set personalized_practice = trim(p_practice),
        personalized_title = nullif(trim(coalesce(p_title, '')), ''),
        personalized_commitment = nullif(trim(coalesce(p_commitment, '')), ''),
        personalization_source = p_source,
        personalized_variant = a.variant
    where id = a.id and user_id = u;
end $$;
revoke all on function public.save_day_personalization(uuid, text, text, text, text) from public, anon;
grant execute on function public.save_day_personalization(uuid, text, text, text, text) to authenticated;

commit;
