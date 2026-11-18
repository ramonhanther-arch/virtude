-- Virtude on Neon Postgres 16. No Supabase Auth schema.
-- The Worker is the only database client. It sets app.user_id after Auth.js
-- accepts the session, and every user query also filters by that id.
-- Row policies repeat the same rule for a non-owner role. The table owner
-- bypasses them; do not expose this role to browsers.
begin;

create schema if not exists private;
revoke all on schema private from public;
alter default privileges in schema private revoke execute on functions from public;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null unique,
  "emailVerified" timestamptz,
  image text,
  password_hash text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references public.users(id) on delete cascade,
  type text not null,
  provider text not null,
  "providerAccountId" text not null,
  refresh_token text,
  access_token text,
  expires_at bigint,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  unique (provider, "providerAccountId")
);
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  "sessionToken" text not null unique,
  "userId" uuid not null references public.users(id) on delete cascade,
  expires timestamptz not null
);
create index sessions_user on public.sessions("userId");
create table public.verification_tokens (
  identifier text not null,
  token text not null,
  expires timestamptz not null,
  primary key (identifier, token)
);

create function public.app_user() returns uuid
language sql stable security definer set search_path = '' as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;
revoke all on function public.app_user() from public;

create table public.journey_templates (
  id uuid primary key default gen_random_uuid(),
  focus text not null unique check (focus in ('self_control','relationships','stewardship','spiritual_life')),
  title text not null,
  days integer not null default 21 check (days = 21)
);
create table public.biblical_contents (
  id uuid primary key default gen_random_uuid(),
  reference text not null,
  context text not null,
  review_status text not null default 'pending_review' check (review_status in ('pending_review','approved','needs_changes','rejected'))
);
create table public.mission_templates (
  id uuid primary key default gen_random_uuid(),
  focus text not null references public.journey_templates(focus),
  day integer not null check (day between 1 and 21),
  biblical_content_id uuid references public.biblical_contents(id),
  phase text not null default '',
  title text not null default '',
  reference text not null default '',
  context text not null default '',
  principle text not null default '',
  practice text not null default '',
  simplified text not null default '',
  deepened text not null default '',
  reflection_question text not null default '',
  review_status text not null default 'pending_review' check (review_status in ('pending_review','approved','needs_changes','rejected')),
  unique (focus, day)
);
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('free','premium')),
  mentor_daily_limit integer not null check (mentor_daily_limit between 0 and 30)
);
insert into public.plans(code, mentor_daily_limit) values ('free', 5), ('premium', 30);
insert into public.journey_templates(focus, title) values
  ('self_control','Domínio próprio'),
  ('relationships','Relacionamentos'),
  ('stewardship','Mordomia'),
  ('spiritual_life','Vida espiritual');

create table private.deployment_config (
  singleton boolean primary key default true check (singleton),
  environment text not null default 'production' check (environment in ('development','production')),
  allow_unreviewed boolean not null default false,
  check (environment <> 'production' or not allow_unreviewed)
);
insert into private.deployment_config default values;

create function private.mission_available(p_focus text, p_day integer) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.mission_templates m
    where m.focus = p_focus and m.day = p_day
    and ((m.review_status = 'approved' and m.title <> '' and m.practice <> '' and m.reference <> '')
      or exists(select 1 from private.deployment_config where environment = 'development' and allow_unreviewed))
  );
$$;
revoke all on function private.mission_available(text, integer) from public;

create function public.content_visible(p_status text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_status = 'approved'
    or exists(select 1 from private.deployment_config where environment = 'development' and allow_unreviewed);
$$;
revoke all on function public.content_visible(text) from public;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  display_name text not null default '' check (length(display_name) <= 80),
  preferred_time time not null default '08:00',
  locale text not null default 'pt-BR' check (locale = 'pt-BR'),
  timezone text not null default 'America/Sao_Paulo' check (timezone = 'America/Sao_Paulo'),
  reminder_email boolean not null default false,
  reminder_opted_out_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  sensitive_data boolean not null default false,
  ai boolean not null default false,
  history boolean not null default false,
  journey_context boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.personal_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  goal text not null check (length(goal) between 1 and 600),
  created_at timestamptz not null default now()
);
create index personal_goals_owner on public.personal_goals(user_id, created_at desc);
create table public.journeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  focus text not null references public.journey_templates(focus),
  current_day integer not null default 1 check (current_day between 1 and 21),
  status text not null default 'active' check (status in ('active','completed','archived')),
  difficulty text not null check (length(difficulty) between 1 and 600),
  goal text not null check (length(goal) between 1 and 600),
  last_advanced_on date,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (id, user_id, focus)
);
create unique index one_active_journey on public.journeys(user_id) where status = 'active';
create index journeys_owner on public.journeys(user_id, created_at desc);
create table public.mission_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  journey_id uuid not null,
  focus text not null,
  day integer not null check (day between 1 and 21),
  variant text not null default 'standard' check (variant in ('standard','simplified','deepened')),
  personalized_practice text check (personalized_practice is null or length(personalized_practice) between 1 and 1200),
  personalized_title text check (personalized_title is null or length(personalized_title) between 1 and 80),
  personalized_commitment text check (personalized_commitment is null or length(personalized_commitment) between 1 and 180),
  personalization_source text check (personalization_source is null or personalization_source in ('model','fallback')),
  personalized_variant text check (personalized_variant is null or personalized_variant in ('standard','simplified','deepened')),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (journey_id, day),
  foreign key (journey_id, user_id, focus) references public.journeys(id, user_id, focus) on delete cascade,
  foreign key (focus, day) references public.mission_templates(focus, day)
);
create index assignments_owner on public.mission_assignments(user_id, journey_id);
create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  assignment_id uuid not null unique,
  status text not null check (status in ('completed','attempted','skipped')),
  reflection text check (length(reflection) <= 4000),
  learned text check (length(learned) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (assignment_id, user_id) references public.mission_assignments(id, user_id) on delete cascade
);
create index checkins_owner on public.check_ins(user_id, created_at desc);
create table public.mentor_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 120),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);
create table public.mentor_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  conversation_id uuid not null,
  role text not null check (role in ('user','assistant')),
  content text not null check (length(content) between 1 and 12000),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (conversation_id, user_id) references public.mentor_conversations(id, user_id) on delete cascade
);
create index messages_owner on public.mentor_messages(user_id, conversation_id, created_at);
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 100),
  description text not null check (length(description) between 1 and 500),
  created_at timestamptz not null default now()
);
create index activities_owner on public.activities(user_id, created_at desc);
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  plan_code text not null default 'free' references public.plans(code),
  created_at timestamptz not null default now()
);
create table public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  event text not null check (event in ('onboarding_completed','day_practiced','journey_completed','journey_restarted','journey_switched')),
  created_at timestamptz not null default now()
);
create index events_owner on public.product_events(user_id, created_at);
create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
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
create table private.rate_limits (
  subject text not null,
  operation text not null,
  bucket bigint not null,
  hits integer not null,
  expires_at timestamptz not null,
  primary key (subject, operation, bucket)
);

create function private.trim_activity_text(value text) returns text
language sql immutable set search_path = '' as $$
  select btrim(value, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF');
$$;
create function private.utf16_length(value text) returns integer
language sql immutable set search_path = '' as $$
  select coalesce(sum(case when ascii(c) > 65535 then 2 else 1 end), 0)::integer
  from regexp_split_to_table(value, '') c;
$$;
create function private.increment_limit(p_subject text, p_operation text, p_limit integer, p_window integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare b bigint := floor(extract(epoch from now()) / p_window); n integer;
begin
  insert into private.rate_limits(subject, operation, bucket, hits, expires_at)
  values (p_subject, p_operation, b, 1, now() + make_interval(secs => p_window * 2))
  on conflict (subject, operation, bucket) do update set hits = private.rate_limits.hits + 1
  returning hits into n;
  delete from private.rate_limits where ctid in (select ctid from private.rate_limits where expires_at < now() limit 100);
  return n <= p_limit;
end $$;
revoke all on function private.trim_activity_text(text), private.utf16_length(text), private.increment_limit(text, text, integer, integer) from public;

create function private.known_user(p_user_id uuid) returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_user_id is null or not exists(select 1 from public.users where id = p_user_id) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;
  return p_user_id;
end $$;
revoke all on function private.known_user(uuid) from public;

-- Writes go through these functions. The caller is the Worker, which passes the Auth.js user id.
create function public.complete_onboarding(p_user_id uuid, p_display_name text, p_focus text, p_difficulty text, p_goal text, p_preferred_time text, p_ai boolean, p_history boolean, p_journey_context boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := private.known_user(p_user_id); j uuid;
begin
  perform 1 from public.profiles where user_id = u for update;
  if length(trim(p_display_name)) not between 1 and 80 or length(trim(p_difficulty)) not between 1 and 600 or length(trim(p_goal)) not between 1 and 600 or p_preferred_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or p_ai is null or p_history is null or p_journey_context is null then raise exception 'Invalid input' using errcode = '22023'; end if;
  if not private.mission_available(p_focus, 1) then raise exception 'Content unavailable' using errcode = 'P0001'; end if;
  if exists(select 1 from public.journeys where user_id = u) then raise exception 'Already initialized' using errcode = 'P0001'; end if;
  update public.profiles set display_name = trim(p_display_name), preferred_time = p_preferred_time::time where user_id = u;
  update public.consents set sensitive_data = true, ai = p_ai, history = p_history, journey_context = p_journey_context, updated_at = now() where user_id = u;
  insert into public.personal_goals(user_id, goal) values (u, trim(p_goal));
  insert into public.journeys(user_id, focus, difficulty, goal) values (u, p_focus, trim(p_difficulty), trim(p_goal)) returning id into j;
  insert into public.mission_assignments(user_id, journey_id, focus, day) values (u, j, p_focus, 1);
  insert into public.product_events(user_id, event) values (u, 'onboarding_completed');
  return j;
end $$;

create function public.save_checkin(p_user_id uuid, p_assignment_id uuid, p_status text, p_reflection text default null, p_learned text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := private.known_user(p_user_id); a public.mission_assignments;
begin
  perform 1 from public.consents where user_id = u and sensitive_data for update;
  if not found then raise exception 'Consent required' using errcode = '42501'; end if;
  if p_status is null or p_status not in ('completed','attempted','skipped') then raise exception 'Invalid input' using errcode = '22023'; end if;
  select ma.* into a from public.mission_assignments ma
    join public.journeys j on j.id = ma.journey_id and j.user_id = ma.user_id
    where ma.id = p_assignment_id and ma.user_id = u and j.status = 'active' and ma.day = j.current_day for update of j;
  if not found then raise exception 'Assignment unavailable' using errcode = 'P0001'; end if;
  if not private.mission_available(a.focus, a.day) then raise exception 'Content unavailable' using errcode = 'P0001'; end if;
  insert into public.check_ins(user_id, assignment_id, status, reflection, learned)
  values (u, a.id, p_status, p_reflection, p_learned)
  on conflict (assignment_id) do update set status = excluded.status, reflection = excluded.reflection, learned = excluded.learned, updated_at = now();
end $$;

create function public.change_journey(p_user_id uuid, p_action text, p_focus text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := private.known_user(p_user_id); j public.journeys; a public.mission_assignments; c public.check_ins; new_id uuid; d date := (now() at time zone 'America/Sao_Paulo')::date; f text;
begin
  if p_action is null or p_action not in ('advance','adapt','restart','switch') then raise exception 'Invalid action' using errcode = '22023'; end if;
  perform 1 from public.profiles where user_id = u for update;
  if not exists(select 1 from public.consents where user_id = u and sensitive_data) then raise exception 'Consent required' using errcode = '42501'; end if;
  if not private.increment_limit(u::text, 'journey_storage_minute', 30, 60) then raise exception 'Storage quota exceeded' using errcode = 'P0429'; end if;
  select * into j from public.journeys where user_id = u and status in ('active','completed') order by created_at desc limit 1 for update;
  if not found then raise exception 'Journey unavailable' using errcode = 'P0001'; end if;
  if p_action in ('restart','switch') then
    f := case when p_action = 'switch' then p_focus else j.focus end;
    if not private.mission_available(f, 1) then raise exception 'Content unavailable' using errcode = 'P0001'; end if;
    update public.journeys set status = 'archived' where id = j.id;
    insert into public.journeys(user_id, focus, difficulty, goal, last_advanced_on) values (u, f, j.difficulty, j.goal, j.last_advanced_on) returning id into new_id;
    insert into public.mission_assignments(user_id, journey_id, focus, day) values (u, new_id, f, 1);
    insert into public.product_events(user_id, event) values (u, case when p_action = 'switch' then 'journey_switched' else 'journey_restarted' end);
    return;
  end if;
  if j.status <> 'active' then raise exception 'Journey completed' using errcode = 'P0001'; end if;
  select * into a from public.mission_assignments where journey_id = j.id and user_id = u and day = j.current_day;
  if not private.mission_available(j.focus, j.current_day) then raise exception 'Content unavailable' using errcode = 'P0001'; end if;
  if p_action = 'adapt' then update public.mission_assignments set variant = 'simplified' where id = a.id; return; end if;
  select * into c from public.check_ins where assignment_id = a.id and user_id = u;
  if not found then raise exception 'Check-in required' using errcode = 'P0001'; end if;
  if exists(select 1 from public.journeys where user_id = u and last_advanced_on = d) then raise exception 'Daily progression limit' using errcode = 'P0001'; end if;
  if j.current_day = 21 then
    update public.journeys set status = 'completed', last_advanced_on = d where id = j.id;
    insert into public.product_events(user_id, event) values (u, 'journey_completed');
  else
    if not private.mission_available(j.focus, j.current_day + 1) then raise exception 'Content unavailable' using errcode = 'P0001'; end if;
    update public.journeys set current_day = current_day + 1, last_advanced_on = d where id = j.id;
    insert into public.mission_assignments(user_id, journey_id, focus, day, variant)
    values (u, j.id, j.focus, j.current_day + 1, case when c.status <> 'completed' then 'simplified' when exists(select 1 from public.check_ins prev join public.mission_assignments pa on pa.id = prev.assignment_id and pa.user_id = prev.user_id where pa.journey_id = j.id and pa.day = j.current_day - 1 and prev.user_id = u and prev.status = 'completed') then 'deepened' else 'standard' end);
    insert into public.product_events(user_id, event) values (u, 'day_practiced');
  end if;
end $$;

create function public.update_settings(p_user_id uuid, p_display_name text default null, p_preferred_time text default null, p_consents jsonb default null)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := private.known_user(p_user_id);
begin
  perform 1 from public.consents where user_id = u for update;
  if p_display_name is not null and length(trim(p_display_name)) not between 1 and 80 then raise exception 'Invalid name' using errcode = '22023'; end if;
  if p_preferred_time is not null and p_preferred_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Invalid time' using errcode = '22023'; end if;
  if p_consents is not null then
    if jsonb_typeof(p_consents) <> 'object' or exists(select 1 from jsonb_each(p_consents) e where e.key not in ('sensitiveData','ai','history','journeyContext') or jsonb_typeof(e.value) <> 'boolean') then raise exception 'Invalid consent' using errcode = '22023'; end if;
    if p_consents ? 'sensitiveData' and not (p_consents->>'sensitiveData')::boolean then raise exception 'Account deletion required' using errcode = 'P0001'; end if;
    if p_consents ? 'sensitiveData' and not exists(select 1 from public.consents where user_id = u and sensitive_data) then raise exception 'Onboarding required' using errcode = 'P0001'; end if;
    update public.consents set ai = coalesce((p_consents->>'ai')::boolean, ai), history = coalesce((p_consents->>'history')::boolean, history), journey_context = coalesce((p_consents->>'journeyContext')::boolean, journey_context), updated_at = now() where user_id = u;
    if exists(select 1 from public.consents where user_id = u and not history) then delete from public.mentor_conversations where user_id = u; end if;
  end if;
  update public.profiles set display_name = coalesce(trim(p_display_name), display_name), preferred_time = coalesce(p_preferred_time::time, preferred_time) where user_id = u;
end $$;

create function public.set_reminder_email(p_user_id uuid, p_enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := private.known_user(p_user_id);
begin
  if p_enabled is null then raise exception 'Invalid input' using errcode = '22023'; end if;
  update public.profiles set reminder_email = p_enabled, reminder_opted_out_at = case when p_enabled then null else now() end where user_id = u;
end $$;

create function public.save_day_personalization(p_user_id uuid, p_assignment_id uuid, p_practice text, p_title text, p_commitment text, p_source text)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := private.known_user(p_user_id); a public.mission_assignments;
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

create function public.create_activity(p_user_id uuid, p_title text, p_description text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare u uuid := private.known_user(p_user_id); activity_id uuid;
  title text := private.trim_activity_text(p_title); description text := private.trim_activity_text(p_description);
begin
  perform 1 from public.consents where user_id = u and sensitive_data for update;
  if not found then raise exception 'Consent required' using errcode = '42501'; end if;
  if title is null or description is null or private.utf16_length(title) not between 1 and 100 or private.utf16_length(description) not between 1 and 500 then raise exception 'Invalid input' using errcode = '22023'; end if;
  if not private.increment_limit(u::text, 'activities', 20, 86400) then raise exception 'Storage quota exceeded' using errcode = 'P0429'; end if;
  insert into public.activities(user_id, title, description) values (u, title, description) returning id into activity_id;
  return activity_id;
end $$;

create function public.save_mentor_exchange(p_user_id uuid, p_conversation_id uuid, p_user_content text, p_assistant_content text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := private.known_user(p_user_id); c uuid; daily_limit integer;
begin
  perform 1 from public.consents where user_id = u and sensitive_data and ai and history for update;
  if not found then raise exception 'History disabled' using errcode = '42501'; end if;
  if p_user_content is null or length(p_user_content) not between 1 and 4000 or p_assistant_content is null or length(p_assistant_content) not between 1 and 12000 then raise exception 'Invalid input' using errcode = '22023'; end if;
  if p_conversation_id is not null then
    select id into c from public.mentor_conversations where id = p_conversation_id and user_id = u for update;
    if not found then raise exception 'Unauthorized' using errcode = '42501'; end if;
  end if;
  select case when s.plan_code = 'premium' then 30 else 5 end into daily_limit from public.subscriptions s where s.user_id = u;
  if not private.increment_limit(u::text, 'mentor_storage_daily', coalesce(daily_limit, 5), 86400) then raise exception 'Storage quota exceeded' using errcode = 'P0429'; end if;
  if not private.increment_limit(u::text, 'mentor_storage_minute', 3, 60) then raise exception 'Storage quota exceeded' using errcode = 'P0429'; end if;
  if c is null then insert into public.mentor_conversations(user_id, title) values (u, 'Conversa com o Mentor') returning id into c; end if;
  insert into public.mentor_messages(user_id, conversation_id, role, content) values (u, c, 'user', p_user_content), (u, c, 'assistant', p_assistant_content);
  return c;
end $$;

create function public.update_personal_goal(p_user_id uuid, p_goal text, p_difficulty text) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := private.known_user(p_user_id); j uuid;
begin
  perform 1 from public.consents where user_id = u and sensitive_data for update;
  if not found then raise exception 'Consent required' using errcode = '42501'; end if;
  if p_goal is null or p_difficulty is null or private.utf16_length(private.trim_activity_text(p_goal)) not between 1 and 600 or private.utf16_length(private.trim_activity_text(p_difficulty)) not between 1 and 600 then raise exception 'Invalid input' using errcode = '22023'; end if;
  select id into j from public.journeys where user_id = u and status = 'active' for update;
  if not found then raise exception 'Journey unavailable' using errcode = 'P0001'; end if;
  if not private.increment_limit(u::text, 'goal_updates', 5, 3600) then raise exception 'Storage quota exceeded' using errcode = 'P0429'; end if;
  update public.journeys set goal = private.trim_activity_text(p_goal), difficulty = private.trim_activity_text(p_difficulty) where id = j and user_id = u;
  insert into public.personal_goals(user_id, goal) values (u, private.trim_activity_text(p_goal));
end $$;

create function public.consume_rate_limit(p_user_id uuid, p_operation text, p_limit integer, p_window_seconds integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare u uuid := private.known_user(p_user_id); lim integer; win integer; op text;
begin
  if p_limit is null or p_limit < 1 or p_window_seconds is null or p_window_seconds < 1 then raise exception 'Unauthorized' using errcode = '42501'; end if;
  op := replace(p_operation, '-', '_');
  if op = 'mentor_day' then op := 'mentor_daily'; end if;
  if op = 'mentor_daily' then
    select p.mentor_daily_limit into lim from public.subscriptions s join public.plans p on p.code = s.plan_code where s.user_id = u;
    lim := coalesce(lim, 5); win := 86400;
  elsif op = 'mentor_minute' then lim := 3; win := 60;
  elsif op = 'mentor_read' then lim := 60; win := 60;
  elsif op = 'activities' then lim := 20; win := 86400;
  elsif op = 'export' then lim := 3; win := 3600;
  elsif op = 'account' then lim := 3; win := 3600;
  elsif op = 'onboarding' then lim := 5; win := 3600;
  elsif op in ('settings','checkins','journey','mutations') then lim := 30; win := 60;
  else raise exception 'Invalid operation' using errcode = '22023'; end if;
  return private.increment_limit(u::text, op, least(lim, p_limit), win);
end $$;

create function public.consume_auth_limit(p_subject text, p_operation text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if p_subject !~ '^[0-9a-f]{64}$' or p_operation not in ('login','signup','forgot','reset','callback') then raise exception 'Invalid input' using errcode = '22023'; end if;
  return private.increment_limit(p_subject, 'auth_' || p_operation, case when p_operation = 'signup' then 5 else 10 end, 900);
end $$;

create function public.delete_account(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := private.known_user(p_user_id);
begin
  delete from private.rate_limits where subject = u::text;
  delete from public.users where id = u;
end $$;

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

create function private.guard_history_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.consents where user_id = new.user_id and sensitive_data and ai and history) then
    raise exception 'History disabled' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function private.guard_history_write() from public;
create trigger guard_conversation before insert or update on public.mentor_conversations for each row execute function private.guard_history_write();
create trigger guard_message before insert or update on public.mentor_messages for each row execute function private.guard_history_write();

-- Non-owner roles only see their own rows, and only approved catalog text.
do $$ declare t text; begin
  foreach t in array array['profiles','consents','personal_goals','journeys','mission_assignments','check_ins','mentor_conversations','mentor_messages','activities','subscriptions','product_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy own_all on public.%I for all using (user_id = public.app_user()) with check (user_id = public.app_user())', t);
  end loop;
  alter table public.analytics_events enable row level security;
  create policy own_insert on public.analytics_events for insert with check (user_id = public.app_user());
  foreach t in array array['journey_templates','plans'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy read_catalog on public.%I for select using (true)', t);
  end loop;
  foreach t in array array['biblical_contents','mission_templates'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy read_approved on public.%I for select using (public.content_visible(review_status))', t);
  end loop;
  alter table public.content_review_decisions enable row level security;
  alter table public.users enable row level security;
  alter table public.accounts enable row level security;
  alter table public.sessions enable row level security;
  alter table public.verification_tokens enable row level security;
  create policy own_user on public.users for select using (id = public.app_user());
  create policy own_account on public.accounts for select using ("userId" = public.app_user());
  create policy own_session on public.sessions for select using ("userId" = public.app_user());
end $$;

revoke all on all tables in schema private from public;
commit;
