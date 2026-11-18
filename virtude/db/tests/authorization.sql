begin;
create function pg_temp.assert_ok(value boolean, label text) returns void language plpgsql as $$ begin if value is distinct from true then raise exception 'ASSERTION FAILED: %', label; end if; end $$;

select pg_temp.assert_ok((select count(*) = 4 from public.journey_templates), 'four focuses');
select pg_temp.assert_ok((select count(*) = 84 from public.mission_templates), '84 missions');
select pg_temp.assert_ok((select count(*) = 0 from public.mission_templates where review_status = 'approved'), 'nothing approved');
select pg_temp.assert_ok(not private.mission_available('spiritual_life', 1), 'spiritual life blocked');
select pg_temp.assert_ok(to_regclass('public.users') is not null and to_regclass('public.accounts') is not null and to_regclass('public.sessions') is not null and to_regclass('public.verification_tokens') is not null, 'auth.js tables');

insert into public.users(id, email, password_hash) values
  ('11111111-1111-4111-8111-111111111111','a@example.test','hash'),
  ('22222222-2222-4222-8222-222222222222','b@example.test','hash');
insert into public.profiles(user_id) values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');
insert into public.consents(user_id) values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');
insert into public.subscriptions(user_id, plan_code) values ('11111111-1111-4111-8111-111111111111','free'), ('22222222-2222-4222-8222-222222222222','free');
update public.mission_templates set review_status = 'approved', title = 'Fixture', reference = 'Tiago 1:19', practice = 'Pause', context = 'Fixture' where focus = 'self_control';
select public.complete_onboarding('11111111-1111-4111-8111-111111111111','Ana','self_control','Dificuldade','Objetivo','08:00',false,false,false);
select pg_temp.assert_ok((select count(*) = 1 from public.journeys where user_id = '11111111-1111-4111-8111-111111111111'), 'onboarding for A');

do $$ begin
  begin
    perform public.complete_onboarding('22222222-2222-4222-8222-222222222222','Bia','spiritual_life','Dificuldade','Objetivo','08:00',false,false,false);
    raise exception 'pending focus should stay blocked';
  exception when sqlstate 'P0001' then null;
  end;
end $$;

select public.set_reminder_email('11111111-1111-4111-8111-111111111111', true);
select pg_temp.assert_ok((select reminder_email from public.profiles where user_id = '11111111-1111-4111-8111-111111111111'), 'reminder opt-in');
select public.set_reminder_email('11111111-1111-4111-8111-111111111111', false);
select pg_temp.assert_ok((select not reminder_email and reminder_opted_out_at is not null from public.profiles where user_id = '11111111-1111-4111-8111-111111111111'), 'reminder opt-out');

grant usage on schema public to virtude_app;
grant select, insert, update, delete on all tables in schema public to virtude_app;
grant execute on function public.app_user(), public.content_visible(text) to virtude_app;
set role virtude_app;
select set_config('app.user_id', '11111111-1111-4111-8111-111111111111', false);
select pg_temp.assert_ok((select count(*) = 1 from public.profiles), 'A reads only own profile');
select pg_temp.assert_ok((select count(*) = 1 from public.journeys), 'A reads only own journey');
select pg_temp.assert_ok((select count(*) = 0 from public.analytics_events), 'A cannot read analytics');
select pg_temp.assert_ok((select count(*) = 0 from public.content_review_decisions), 'review ledger hidden');
select pg_temp.assert_ok((select count(*) = 21 from public.mission_templates), 'only approved focus is visible');
select set_config('app.user_id', '', false);
select pg_temp.assert_ok((select count(*) = 0 from public.profiles), 'missing session sees no profile');
reset role;
rollback;
