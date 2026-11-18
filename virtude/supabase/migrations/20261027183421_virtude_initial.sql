-- VIRTUDE initial schema. Apply as postgres using Supabase migrations.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from public;

-- No parameters: caller cannot use this as an oracle about another user's session.
create function private.live_session() returns boolean
language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists (
  select 1 from auth.sessions s where s.user_id = auth.uid()
  and s.id::text = (auth.jwt()->>'session_id')
  and (s.not_after is null or s.not_after > now())
 ) and coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false;
$$;
revoke all on function private.live_session() from public, anon, authenticated;
create function public.session_is_valid() returns boolean
language sql stable security definer set search_path = '' as $$ select private.live_session(); $$;
revoke all on function public.session_is_valid() from public, anon;
grant execute on function public.session_is_valid() to authenticated;

create table public.journey_templates (
 id uuid primary key default gen_random_uuid(), focus text not null unique check(focus in ('self_control','relationships','stewardship')),
 title text not null, days integer not null default 21 check(days = 21)
);
create table public.biblical_contents (
 id uuid primary key default gen_random_uuid(), reference text not null, context text not null,
 review_status text not null default 'pending_review' check(review_status in ('pending_review','approved'))
);
create table public.mission_templates (
 id uuid primary key default gen_random_uuid(), focus text not null references public.journey_templates(focus),
 day integer not null check(day between 1 and 21), biblical_content_id uuid references public.biblical_contents(id),
 phase text not null default '', title text not null default '', reference text not null default '',
 context text not null default '', principle text not null default '', practice text not null default '',
 simplified text not null default '', deepened text not null default '', reflection_question text not null default '',
 review_status text not null default 'pending_review' check(review_status in ('pending_review','approved')),
 unique(focus,day)
);
create table public.plans (
 id uuid primary key default gen_random_uuid(), code text not null unique check(code in ('free','premium')),
 mentor_daily_limit integer not null check(mentor_daily_limit between 0 and 30)
);
insert into public.plans(code,mentor_daily_limit) values ('free',5),('premium',30);
insert into public.journey_templates(focus,title) values ('self_control','Domínio próprio'),('relationships','Relacionamentos'),('stewardship','Mordomia');
-- Pending metadata only; original editorial copy is populated by an operator seed.
insert into public.mission_templates(focus,day)
 select t.focus, d from public.journey_templates t cross join generate_series(1,21) d;
create table private.deployment_config (
 singleton boolean primary key default true check(singleton), environment text not null default 'production' check(environment in ('development','production')),
 allow_unreviewed boolean not null default false,
 check(environment <> 'production' or not allow_unreviewed)
);
insert into private.deployment_config default values;
create function private.mission_available(p_focus text,p_day integer) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.mission_templates m where m.focus=p_focus and m.day=p_day
 and ((m.review_status='approved' and m.title<>'' and m.practice<>'' and m.reference<>'')
 or exists(select 1 from private.deployment_config where environment='development' and allow_unreviewed)));
$$;
revoke all on function private.mission_available(text,integer) from public,anon,authenticated;

create table public.profiles (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
 display_name text not null default '' check(length(display_name)<=80), preferred_time time not null default '08:00',
 locale text not null default 'pt-BR' check(locale='pt-BR'), timezone text not null default 'America/Sao_Paulo' check(timezone='America/Sao_Paulo'),
 created_at timestamptz not null default now()
);
create table public.consents (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
 sensitive_data boolean not null default false, ai boolean not null default false, history boolean not null default false,
 journey_context boolean not null default false, updated_at timestamptz not null default now()
);
create table public.personal_goals (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 goal text not null check(length(goal) between 1 and 600), created_at timestamptz not null default now(), unique(id,user_id)
);
create table public.journeys (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 focus text not null references public.journey_templates(focus), current_day integer not null default 1 check(current_day between 1 and 21),
 status text not null default 'active' check(status in ('active','completed','archived')),
 difficulty text not null check(length(difficulty) between 1 and 600), goal text not null check(length(goal) between 1 and 600),
 last_advanced_on date, created_at timestamptz not null default now(), unique(id,user_id), unique(id,user_id,focus)
);
create unique index one_active_journey on public.journeys(user_id) where status='active';
create index journeys_owner on public.journeys(user_id,created_at desc);
create table public.mission_assignments (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 journey_id uuid not null, focus text not null, day integer not null check(day between 1 and 21),
 variant text not null default 'standard' check(variant in ('standard','simplified','deepened')),
 created_at timestamptz not null default now(), unique(id,user_id), unique(journey_id,day),
 foreign key(journey_id,user_id,focus) references public.journeys(id,user_id,focus) on delete cascade,
 foreign key(focus,day) references public.mission_templates(focus,day)
);
create index assignments_owner on public.mission_assignments(user_id,journey_id);
create table public.check_ins (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 assignment_id uuid not null unique, status text not null check(status in ('completed','attempted','skipped')),
 reflection text check(length(reflection)<=4000), learned text check(length(learned)<=4000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(id,user_id), foreign key(assignment_id,user_id) references public.mission_assignments(id,user_id) on delete cascade
);
create index checkins_owner on public.check_ins(user_id,created_at desc);
-- Reflections live with their unique check-in to make consent + export + upsert atomic.
create table public.mentor_conversations (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(title) between 1 and 120), created_at timestamptz not null default now(), unique(id,user_id)
);
create index conversations_owner on public.mentor_conversations(user_id,created_at desc);
create table public.mentor_messages (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 conversation_id uuid not null, role text not null check(role in ('user','assistant')), content text not null check(length(content) between 1 and 12000),
 created_at timestamptz not null default now(), foreign key(conversation_id,user_id) references public.mentor_conversations(id,user_id) on delete cascade
);
create index messages_owner_conversation on public.mentor_messages(user_id,conversation_id,created_at);
create table public.activities (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(title) between 1 and 120), description text not null check(length(description) between 1 and 1500),
 created_at timestamptz not null default now()
);
create index activities_owner on public.activities(user_id,created_at desc);
create table public.subscriptions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
 plan_code text not null default 'free' references public.plans(code), created_at timestamptz not null default now()
);
create table public.product_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 event text not null check(event in ('onboarding_completed','day_practiced','journey_completed','journey_restarted','journey_switched')),
 created_at timestamptz not null default now()
);
create index events_owner on public.product_events(user_id,created_at);
create table private.rate_limits (
 subject text not null, operation text not null, bucket bigint not null, hits integer not null,
 expires_at timestamptz not null, primary key(subject,operation,bucket)
);

create function private.bootstrap_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 -- Never copy user_metadata into authorization, plan or consent.
 insert into public.profiles(user_id) values(new.id);
 insert into public.consents(user_id) values(new.id);
 insert into public.subscriptions(user_id,plan_code) values(new.id,'free');
 return new;
end $$;
revoke all on function private.bootstrap_user() from public,anon,authenticated;
create trigger virtude_bootstrap after insert on auth.users for each row execute function private.bootstrap_user();
-- Existing users are initialized safely when applying to a nonempty project.
insert into public.profiles(user_id) select id from auth.users on conflict(user_id) do nothing;
insert into public.consents(user_id) select id from auth.users on conflict(user_id) do nothing;
insert into public.subscriptions(user_id) select id from auth.users on conflict(user_id) do nothing;

create function private.sensitive_allowed() returns boolean language sql stable security definer set search_path='' as $$
 select private.live_session() and exists(select 1 from public.consents where user_id=auth.uid() and sensitive_data);
$$;
create function private.history_allowed() returns boolean language sql stable security definer set search_path='' as $$
 select private.sensitive_allowed() and exists(select 1 from public.consents where user_id=auth.uid() and history);
$$;
revoke all on function private.sensitive_allowed(), private.history_allowed() from public,anon,authenticated;
create function public.sensitive_access() returns boolean language sql stable security definer set search_path='' as $$ select private.sensitive_allowed(); $$;
create function public.history_access() returns boolean language sql stable security definer set search_path='' as $$ select private.history_allowed(); $$;
revoke all on function public.sensitive_access(),public.history_access() from public,anon;
grant execute on function public.sensitive_access(),public.history_access() to authenticated;

do $$ declare t text; predicate text; begin
 foreach t in array array['profiles','consents','personal_goals','journeys','mission_assignments','check_ins','mentor_conversations','mentor_messages','activities','subscriptions','product_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  predicate := '(select public.session_is_valid()) and user_id=(select auth.uid())';
  if t in ('mentor_conversations','mentor_messages') then predicate := predicate || ' and (select public.history_access())';
  elsif t not in ('profiles','consents','subscriptions') then predicate := predicate || ' and (select public.sensitive_access())'; end if;
  execute format('create policy owner_select on public.%I for select to authenticated using (%s)',t,predicate);
  if t<>'subscriptions' then
  execute format('create policy owner_insert on public.%I for insert to authenticated with check (%s)',t,predicate);
  execute format('create policy owner_update on public.%I for update to authenticated using (%s) with check (%s)',t,predicate,predicate);
  execute format('create policy owner_delete on public.%I for delete to authenticated using (%s)',t,predicate);
  end if;
 end loop;
 foreach t in array array['journey_templates','biblical_contents','mission_templates','plans'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  if t in ('biblical_contents','mission_templates') then
   execute format('create policy approved_read on public.%I for select to authenticated using ((select public.session_is_valid()) and review_status=''approved'')',t);
  else
   execute format('create policy public_metadata on public.%I for select to authenticated using ((select public.session_is_valid()))',t);
  end if;
 end loop;
end $$;
-- User-editable narrative data only. All progression, consent, plan writes go through bounded RPCs.
grant insert,update,delete on public.mentor_conversations, public.mentor_messages, public.activities to authenticated;

create function private.require_user() returns uuid language plpgsql stable security definer set search_path='' as $$
begin if not private.live_session() then raise exception 'Unauthorized' using errcode='42501'; end if; return auth.uid(); end $$;
revoke all on function private.require_user() from public,anon,authenticated;

create function public.complete_onboarding(p_display_name text,p_focus text,p_difficulty text,p_goal text,p_preferred_time text,p_ai boolean,p_history boolean,p_journey_context boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid := private.require_user(); j uuid; begin
 perform 1 from public.profiles where user_id=u for update;
 if length(trim(p_display_name)) not between 1 and 80 or length(trim(p_difficulty)) not between 1 and 600 or length(trim(p_goal)) not between 1 and 600 or p_preferred_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or p_ai is null or p_history is null or p_journey_context is null then raise exception 'Invalid input' using errcode='22023'; end if;
 if not private.mission_available(p_focus,1) then raise exception 'Content unavailable' using errcode='P0001'; end if;
 if exists(select 1 from public.journeys where user_id=u) then raise exception 'Already initialized' using errcode='P0001'; end if;
 update public.profiles set display_name=trim(p_display_name),preferred_time=p_preferred_time::time where user_id=u;
 update public.consents set sensitive_data=true,ai=p_ai,history=p_history,journey_context=p_journey_context,updated_at=now() where user_id=u;
 insert into public.personal_goals(user_id,goal) values(u,trim(p_goal));
 insert into public.journeys(user_id,focus,difficulty,goal) values(u,p_focus,trim(p_difficulty),trim(p_goal)) returning id into j;
 insert into public.mission_assignments(user_id,journey_id,focus,day) values(u,j,p_focus,1);
 insert into public.product_events(user_id,event) values(u,'onboarding_completed');
 return j;
end $$;

create function public.save_checkin(p_assignment_id uuid,p_status text,p_reflection text default null,p_learned text default null)
returns void language plpgsql security definer set search_path='' as $$
declare u uuid := private.require_user(); a public.mission_assignments; begin
 perform 1 from public.consents where user_id=u and sensitive_data for update;
 if not found then raise exception 'Consent required' using errcode='42501'; end if;
 select ma.* into a from public.mission_assignments ma join public.journeys j on j.id=ma.journey_id and j.user_id=ma.user_id where ma.id=p_assignment_id and ma.user_id=u and j.status='active' and ma.day=j.current_day for update of j;
 if not found then raise exception 'Assignment unavailable' using errcode='P0001'; end if;
 if not private.mission_available(a.focus,a.day) then raise exception 'Content unavailable' using errcode='P0001'; end if;
 insert into public.check_ins(user_id,assignment_id,status,reflection,learned) values(u,a.id,p_status,p_reflection,p_learned)
 on conflict(assignment_id) do update set status=excluded.status,reflection=excluded.reflection,learned=excluded.learned,updated_at=now();
end $$;

create function public.change_journey(p_action text,p_focus text default null)
returns void language plpgsql security definer set search_path='' as $$
declare u uuid := private.require_user(); j public.journeys; a public.mission_assignments; c public.check_ins; new_id uuid; d date := (now() at time zone 'America/Sao_Paulo')::date; f text; begin
 if p_action is null or p_action not in ('advance','adapt','restart','switch') then raise exception 'Invalid action' using errcode='22023'; end if;
 perform 1 from public.profiles where user_id=u for update;
 if not private.sensitive_allowed() then raise exception 'Consent required' using errcode='42501'; end if;
 select * into j from public.journeys where user_id=u and status in ('active','completed') order by created_at desc limit 1 for update;
 if not found then raise exception 'Journey unavailable' using errcode='P0001'; end if;
 if p_action in ('restart','switch') then
  f := case when p_action='switch' then p_focus else j.focus end;
  if not private.mission_available(f,1) then raise exception 'Content unavailable' using errcode='P0001'; end if;
  update public.journeys set status='archived' where id=j.id;
  insert into public.journeys(user_id,focus,difficulty,goal,last_advanced_on) values(u,f,j.difficulty,j.goal,j.last_advanced_on) returning id into new_id;
  insert into public.mission_assignments(user_id,journey_id,focus,day) values(u,new_id,f,1);
  insert into public.product_events(user_id,event) values(u,case when p_action='switch' then 'journey_switched' else 'journey_restarted' end);
  return;
 end if;
 if j.status<>'active' then raise exception 'Journey completed' using errcode='P0001'; end if;
 select * into a from public.mission_assignments where journey_id=j.id and user_id=u and day=j.current_day;
 if not private.mission_available(j.focus,j.current_day) then raise exception 'Content unavailable' using errcode='P0001'; end if;
 if p_action='adapt' then update public.mission_assignments set variant='simplified' where id=a.id; return; end if;
 if p_action<>'advance' then raise exception 'Invalid action' using errcode='22023'; end if;
 select * into c from public.check_ins where assignment_id=a.id and user_id=u;
 if not found then raise exception 'Check-in required' using errcode='P0001'; end if;
 -- Across all journeys, so restarting cannot bypass the daily progression cap.
 if exists(select 1 from public.journeys where user_id=u and last_advanced_on=d) then raise exception 'Daily progression limit' using errcode='P0001'; end if;
 if j.current_day=21 then
  update public.journeys set status='completed',last_advanced_on=d where id=j.id;
  insert into public.product_events(user_id,event) values(u,'journey_completed');
 else
  if not private.mission_available(j.focus,j.current_day+1) then raise exception 'Content unavailable' using errcode='P0001'; end if;
  update public.journeys set current_day=current_day+1,last_advanced_on=d where id=j.id;
  insert into public.mission_assignments(user_id,journey_id,focus,day,variant) values(u,j.id,j.focus,j.current_day+1,case when c.status<>'completed' then 'simplified' when exists(select 1 from public.check_ins prev join public.mission_assignments pa on pa.id=prev.assignment_id and pa.user_id=prev.user_id where pa.journey_id=j.id and pa.day=j.current_day-1 and prev.user_id=u and prev.status='completed') then 'deepened' else 'standard' end);
  insert into public.product_events(user_id,event) values(u,'day_practiced');
 end if;
end $$;

create function public.update_settings(p_display_name text default null,p_preferred_time text default null,p_consents jsonb default null)
returns void language plpgsql security definer set search_path='' as $$
declare u uuid := private.require_user(); begin
 perform 1 from public.consents where user_id=u for update;
 if p_display_name is not null and length(trim(p_display_name)) not between 1 and 80 then raise exception 'Invalid name' using errcode='22023'; end if;
 if p_preferred_time is not null and p_preferred_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Invalid time' using errcode='22023'; end if;
 if p_consents is not null then
  if jsonb_typeof(p_consents)<>'object' or exists(select 1 from jsonb_each(p_consents) e where e.key not in ('sensitiveData','ai','history','journeyContext') or jsonb_typeof(e.value)<>'boolean') then raise exception 'Invalid consent' using errcode='22023'; end if;
  if p_consents ? 'sensitiveData' and not (p_consents->>'sensitiveData')::boolean then raise exception 'Account deletion required' using errcode='P0001'; end if;
  -- Only onboarding grants the sensitive consent, with explicit initial context.
  if p_consents ? 'sensitiveData' and not exists(select 1 from public.consents where user_id=u and sensitive_data) then raise exception 'Onboarding required' using errcode='P0001'; end if;
  update public.consents set ai=coalesce((p_consents->>'ai')::boolean,ai),history=coalesce((p_consents->>'history')::boolean,history),journey_context=coalesce((p_consents->>'journeyContext')::boolean,journey_context),updated_at=now() where user_id=u;
  if exists(select 1 from public.consents where user_id=u and not history) then delete from public.mentor_conversations where user_id=u; end if;
 end if;
 update public.profiles set display_name=coalesce(trim(p_display_name),display_name),preferred_time=coalesce(p_preferred_time::time,preferred_time) where user_id=u;
end $$;

-- Lock consent before narrative writes: revocation and in-flight persistence serialize.
create function private.guard_history_write() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.user_id<>auth.uid() or not private.live_session() then raise exception 'Unauthorized' using errcode='42501'; end if;
 perform 1 from public.consents where user_id=new.user_id and sensitive_data and ai and history for update;
 if not found then raise exception 'History disabled' using errcode='42501'; end if;
 return new;
end $$;
revoke all on function private.guard_history_write() from public,anon,authenticated;
create trigger guard_conversation before insert or update on public.mentor_conversations for each row execute function private.guard_history_write();
create trigger guard_message before insert or update on public.mentor_messages for each row execute function private.guard_history_write();

create function private.increment_limit(p_subject text,p_operation text,p_limit integer,p_window integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare b bigint := floor(extract(epoch from now())/p_window); n integer; begin
 insert into private.rate_limits(subject,operation,bucket,hits,expires_at) values(p_subject,p_operation,b,1,now()+make_interval(secs=>p_window*2))
 on conflict(subject,operation,bucket) do update set hits=private.rate_limits.hits+1 returning hits into n;
 -- Expired counters contain only UUID/HMAC, never raw IP or narrative. Bounded lazy cleanup.
 delete from private.rate_limits where ctid in (select ctid from private.rate_limits where expires_at<now() limit 100);
 return n<=p_limit;
end $$;
revoke all on function private.increment_limit(text,text,integer,integer) from public,anon,authenticated;
create function public.consume_rate_limit(p_user_id uuid,p_operation text,p_limit integer,p_window_seconds integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare u uuid := private.require_user(); lim integer; win integer; op text; begin
 if p_user_id is null or u<>p_user_id or p_limit is null or p_limit<1 or p_window_seconds is null or p_window_seconds<1 then raise exception 'Unauthorized' using errcode='42501'; end if;
 op := replace(p_operation,'-','_');
 if op='mentor_day' then op:='mentor_daily'; end if;
 if op='mentor_daily' then
  select p.mentor_daily_limit into lim from public.subscriptions s join public.plans p on p.code=s.plan_code where s.user_id=u;
  lim:=coalesce(lim,5); win:=86400;
 elsif op='mentor_minute' then lim:=3;win:=60;
 elsif op='mentor_read' then lim:=60;win:=60;
 elsif op='activities' then lim:=20;win:=86400;
 elsif op='export' then lim:=3;win:=3600;
 elsif op='account' then lim:=3;win:=3600;
 elsif op='onboarding' then lim:=5;win:=3600;
 elsif op in ('settings','checkins','journey','mutations') then lim:=30;win:=60;
 else raise exception 'Invalid operation' using errcode='22023'; end if;
 return private.increment_limit(u::text,op,least(lim,p_limit),win);
end $$;
create function public.consume_auth_limit(p_subject text,p_operation text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if p_subject !~ '^[0-9a-f]{64}$' or p_operation not in ('login','signup','forgot','reset','callback') then raise exception 'Invalid input' using errcode='22023'; end if;
 return private.increment_limit(p_subject,'auth_'||p_operation,case when p_operation='signup' then 5 else 10 end,900);
end $$;
revoke all on function public.consume_auth_limit(text,text) from public,anon,authenticated;
grant execute on function public.consume_auth_limit(text,text) to service_role;

create function public.save_mentor_exchange(p_conversation_id uuid,p_user_content text,p_assistant_content text)
returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid := private.require_user(); c uuid; begin
 perform 1 from public.consents where user_id=u and sensitive_data and ai and history for update;
 if not found then raise exception 'History disabled' using errcode='42501'; end if;
 if p_user_content is null or length(p_user_content) not between 1 and 4000 or p_assistant_content is null or length(p_assistant_content) not between 1 and 12000 then raise exception 'Invalid input' using errcode='22023'; end if;
 if p_conversation_id is null then
  insert into public.mentor_conversations(user_id,title) values(u,'Conversa com o Mentor') returning id into c;
 else
  select id into c from public.mentor_conversations where id=p_conversation_id and user_id=u for update;
  if not found then raise exception 'Unauthorized' using errcode='42501'; end if;
 end if;
 insert into public.mentor_messages(user_id,conversation_id,role,content) values(u,c,'user',p_user_content),(u,c,'assistant',p_assistant_content);
 return c;
end $$;
revoke all on function public.save_mentor_exchange(uuid,text,text) from public,anon;
grant execute on function public.save_mentor_exchange(uuid,text,text) to authenticated;

-- Authenticated narrow deletion capability, with a fresh password AMR on the SAME real session.
create function public.delete_my_account() returns void language plpgsql security definer set search_path='' as $$
declare u uuid := private.require_user(); begin
 if not exists(select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'::jsonb)) a where a->>'method'='password' and (a->>'timestamp')::bigint between extract(epoch from now())-120 and extract(epoch from now())+10) then raise exception 'Recent password required' using errcode='42501'; end if;
 delete from private.rate_limits where subject=u::text;
 delete from auth.sessions where user_id=u;
 delete from auth.users where id=u;
end $$;

do $$ declare signature text; begin
 foreach signature in array array[
 'public.complete_onboarding(text,text,text,text,text,boolean,boolean,boolean)',
 'public.save_checkin(uuid,text,text,text)','public.change_journey(text,text)',
 'public.update_settings(text,text,jsonb)','public.consume_rate_limit(uuid,text,integer,integer)',
 'public.delete_my_account()'] loop
 execute 'revoke all on function '||signature||' from public,anon,authenticated';
 execute 'grant execute on function '||signature||' to authenticated';
 end loop;
end $$;
alter table private.deployment_config enable row level security;
alter table private.rate_limits enable row level security;
revoke all on all tables in schema private from public,anon,authenticated;
commit;
