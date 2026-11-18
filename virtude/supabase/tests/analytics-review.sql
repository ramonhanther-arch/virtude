begin;
create function pg_temp.assert_pilot(value boolean, label text) returns void language plpgsql as $$ begin if value is distinct from true then raise exception 'ASSERTION FAILED: %', label; end if; end $$;

select pg_temp.assert_pilot((select count(*) = 4 from public.journey_templates), 'four focuses');
select pg_temp.assert_pilot((select count(*) = 84 from public.mission_templates), '84 missions');
select pg_temp.assert_pilot((select count(*) = 21 from public.mission_templates where focus = 'spiritual_life' and review_status = 'pending_review' and title <> ''), 'spiritual life pending');
select pg_temp.assert_pilot((select count(*) = 0 from public.mission_templates where review_status = 'approved'), 'nothing approved by migration');
select pg_temp.assert_pilot(not private.mission_available('spiritual_life', 1), 'spiritual life blocked in production');
select pg_temp.assert_pilot(not private.mission_available('self_control', 1), 'original catalog still blocked');

insert into auth.users(id, email) values ('33333333-3333-4333-8333-333333333333', 'pilot@example.test');
insert into auth.sessions(id, user_id, not_after) values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '33333333-3333-4333-8333-333333333333', now() + interval '1 hour');
select pg_temp.assert_pilot((select count(*) = 1 from public.analytics_events where user_id = '33333333-3333-4333-8333-333333333333' and event = 'signup' and properties = '{}'::jsonb), 'signup event without properties');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated","session_id":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"}', true);
do $$ begin
  begin
    perform count(*) from public.analytics_events;
    raise exception 'analytics select should fail';
  exception when insufficient_privilege then null;
  end;
end $$;
insert into public.analytics_events(user_id, event, properties) values ('33333333-3333-4333-8333-333333333333', 'mission_view', '{"focus":"spiritual_life","day":1}'::jsonb);
do $$ begin
  begin
    insert into public.analytics_events(user_id, event, properties) values ('33333333-3333-4333-8333-333333333333', 'mission_view', '{}'::jsonb);
    raise exception 'duplicate mission view should fail';
  exception when unique_violation then null;
  end;
  begin
    insert into public.analytics_events(user_id, event, properties) values ('33333333-3333-4333-8333-333333333333', 'signup', '{}'::jsonb);
    raise exception 'client signup insert should fail';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.analytics_events(user_id, event, properties) values ('33333333-3333-4333-8333-333333333333', 'mission_view', '{"email":"a@example.test"}'::jsonb);
    raise exception 'pii property should fail';
  exception when check_violation then null;
  end;
end $$;
select public.set_reminder_email(true);
select pg_temp.assert_pilot((select reminder_email and reminder_opted_out_at is null from public.profiles where user_id = auth.uid()), 'reminder opt-in');
select public.set_reminder_email(false);
select pg_temp.assert_pilot((select not reminder_email and reminder_opted_out_at is not null from public.profiles where user_id = auth.uid()), 'reminder opt-out');
do $$ begin
  begin
    perform count(*) from public.content_review_decisions;
    raise exception 'review ledger should be unreadable';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

set local role service_role;
select pg_temp.assert_pilot(public.apply_content_review('spiritual_life', 1, 'needs_changes', 'Ajustar a analogia pastoral.', 'revisor@example.test') is not null, 'needs changes recorded');
reset role;
select pg_temp.assert_pilot((select review_status = 'needs_changes' from public.mission_templates where focus = 'spiritual_life' and day = 1), 'template synced');
select pg_temp.assert_pilot(not private.mission_available('spiritual_life', 1), 'needs_changes stays blocked');
set local role service_role;
select public.apply_content_review('spiritual_life', 1, 'approved', 'Leitura conferida nesta fixture descartável.', 'revisor@example.test');
reset role;
select pg_temp.assert_pilot(private.mission_available('spiritual_life', 1), 'explicit approval unlocks');
set local role authenticated;
select pg_temp.assert_pilot(not has_function_privilege('authenticated', 'public.apply_content_review(text,integer,text,text,text)', 'EXECUTE'), 'user cannot review');
reset role;
rollback;
