-- Adjust the current objective without changing completed practice or archived journeys.
begin;
create index personal_goals_owner on public.personal_goals(user_id,created_at desc);
create function public.update_personal_goal(p_goal text,p_difficulty text) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid := private.require_user(); j uuid;
begin
 perform 1 from public.consents where user_id=u and sensitive_data for update;
 if not found then raise exception 'Consent required' using errcode='42501'; end if;
 if p_goal is null or p_difficulty is null
 or private.utf16_length(private.trim_activity_text(p_goal)) not between 1 and 600
 or private.utf16_length(private.trim_activity_text(p_difficulty)) not between 1 and 600
 then raise exception 'Invalid input' using errcode='22023'; end if;
 select id into j from public.journeys where user_id=u and status='active' for update;
 if not found then raise exception 'Journey unavailable' using errcode='P0001'; end if;
 if not private.increment_limit(u::text,'goal_updates',5,3600)
 then raise exception 'Storage quota exceeded' using errcode='P0429'; end if;
 update public.journeys set goal=private.trim_activity_text(p_goal),difficulty=private.trim_activity_text(p_difficulty) where id=j and user_id=u;
 insert into public.personal_goals(user_id,goal) values(u,private.trim_activity_text(p_goal));
end $$;
revoke all on function public.update_personal_goal(text,text) from public,anon;
grant execute on function public.update_personal_goal(text,text) to authenticated;
commit;
