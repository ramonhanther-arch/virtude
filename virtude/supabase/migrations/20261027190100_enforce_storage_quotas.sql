-- Bound narrative writes at the Data API boundary as well as the application boundary.
-- Generation quotas remain separate; storage never charges mentor_daily/mentor_minute twice.
begin;
revoke insert, update, delete on public.activities, public.mentor_conversations, public.mentor_messages from public, anon, authenticated;

-- JS trim() whitespace, and UTF-16 length (Zod string limits) rather than code-point length.
-- Private helpers have no externally callable owner/limit/window parameters.
create function private.trim_activity_text(value text) returns text
language sql immutable set search_path='' as $$
 select btrim(value, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF');
$$;
create function private.utf16_length(value text) returns integer
language sql immutable set search_path='' as $$
 select coalesce(sum(case when ascii(c)>65535 then 2 else 1 end),0)::integer
 from regexp_split_to_table(value,'') c;
$$;
revoke all on function private.trim_activity_text(text),private.utf16_length(text) from public,anon,authenticated;

create function public.create_activity(p_title text,p_description text) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid := private.require_user(); activity_id uuid;
 title text := private.trim_activity_text(p_title); description text := private.trim_activity_text(p_description);
begin
 -- Same lock as revocation: no in-flight narrative write can outlive a completed revocation.
 perform 1 from public.consents where user_id=u and sensitive_data for update;
 if not found then raise exception 'Consent required' using errcode='42501'; end if;
 if title is null or description is null
 or private.utf16_length(title) not between 1 and 100
 or private.utf16_length(description) not between 1 and 500
 then raise exception 'Invalid input' using errcode='22023'; end if;
 if not private.increment_limit(u::text,'activities',20,86400)
 then raise exception 'Storage quota exceeded' using errcode='P0429'; end if;
 insert into public.activities(user_id,title,description) values(u,title,description) returning id into activity_id;
 return activity_id;
end $$;
revoke all on function public.create_activity(text,text) from public,anon;
grant execute on function public.create_activity(text,text) to authenticated;

create or replace function public.save_mentor_exchange(p_conversation_id uuid,p_user_content text,p_assistant_content text)
returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid := private.require_user(); c uuid; daily_limit integer;
begin
 perform 1 from public.consents where user_id=u and sensitive_data and ai and history for update;
 if not found then raise exception 'History disabled' using errcode='42501'; end if;
 if p_user_content is null or length(p_user_content) not between 1 and 4000
 or p_assistant_content is null or length(p_assistant_content) not between 1 and 12000
 then raise exception 'Invalid input' using errcode='22023'; end if;
 if p_conversation_id is not null then
  select id into c from public.mentor_conversations where id=p_conversation_id and user_id=u for update;
  if not found then raise exception 'Unauthorized' using errcode='42501'; end if;
 end if;
 -- Only trusted subscription data selects the plan. The caller supplies neither owner nor clock.
 select case when s.plan_code='premium' then 30 else 5 end into daily_limit
 from public.subscriptions s where s.user_id=u;
 -- Independent fixed epoch windows: 5/30 saved pairs per 86400s and 3 per 60s.
 -- A failed insert or exceeded quota rolls the whole pair and counters back atomically.
 if not private.increment_limit(u::text,'mentor_storage_daily',coalesce(daily_limit,5),86400)
 then raise exception 'Storage quota exceeded' using errcode='P0429'; end if;
 if not private.increment_limit(u::text,'mentor_storage_minute',3,60)
 then raise exception 'Storage quota exceeded' using errcode='P0429'; end if;
 if c is null then
  insert into public.mentor_conversations(user_id,title) values(u,'Conversa com o Mentor') returning id into c;
 end if;
 insert into public.mentor_messages(user_id,conversation_id,role,content)
 values(u,c,'user',p_user_content),(u,c,'assistant',p_assistant_content);
 return c;
end $$;
revoke all on function public.save_mentor_exchange(uuid,text,text) from public,anon;
grant execute on function public.save_mentor_exchange(uuid,text,text) to authenticated;
-- Bound every progression mutation, including restart/switch row creation.
create or replace function public.change_journey(p_action text,p_focus text default null)
returns void language plpgsql security definer set search_path='' as $$
declare u uuid := private.require_user(); j public.journeys; a public.mission_assignments; c public.check_ins; new_id uuid; d date := (now() at time zone 'America/Sao_Paulo')::date; f text; begin
 if p_action is null or p_action not in ('advance','adapt','restart','switch') then raise exception 'Invalid action' using errcode='22023'; end if;
 perform 1 from public.profiles where user_id=u for update;
 if not private.sensitive_allowed() then raise exception 'Consent required' using errcode='42501'; end if;
 -- Independent from the HTTP mutation counter: direct RPCs cannot create unlimited restarts.
 if not private.increment_limit(u::text,'journey_storage_minute',30,60)
 then raise exception 'Storage quota exceeded' using errcode='P0429'; end if;
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

revoke all on function public.change_journey(text,text) from public,anon;
grant execute on function public.change_journey(text,text) to authenticated;
commit;
