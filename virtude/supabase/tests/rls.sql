-- Executable in a throwaway local Supabase database after migrations (or PGlite Auth mocks).
-- Uses a transaction and rolls back all fixtures. Never run destructive test fixtures in production.
begin;
create function pg_temp.assert_true(value boolean, label text) returns void language plpgsql as $$ begin if value is distinct from true then raise exception 'ASSERTION FAILED: %',label; end if; end $$;
create function pg_temp.expect_denied(statement text, label text) returns void language plpgsql as $$ begin
 begin execute statement;
 exception when insufficient_privilege or foreign_key_violation or check_violation or raise_exception or not_null_violation or invalid_parameter_value or sqlstate 'P0429' then return;
 end;
 raise exception 'EXPECTED DENIAL: %',label;
end $$;

insert into auth.users(id,email) values ('11111111-1111-4111-8111-111111111111','a@example.test'),('22222222-2222-4222-8222-222222222222','b@example.test');
insert into auth.sessions(id,user_id,not_after) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',now()+interval '1 hour'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222',now()+interval '1 hour');
select pg_temp.assert_true((select count(*)=2 from public.profiles where user_id in ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222')),'bootstrap profiles');
select pg_temp.assert_true((select count(*)=2 from public.subscriptions where user_id in ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222') and plan_code='free'),'bootstrap free plan');
select pg_temp.assert_true(not has_function_privilege('anon','public.consume_auth_limit(text,text)','EXECUTE'),'anon cannot consume auth server RPC');
select pg_temp.assert_true(not has_function_privilege('authenticated','public.consume_auth_limit(text,text)','EXECUTE'),'user cannot consume auth server RPC');
select pg_temp.assert_true(not has_function_privilege('authenticated','private.live_session()','EXECUTE'),'private session helper revoked');
select pg_temp.assert_true(has_function_privilege('service_role','public.consume_auth_limit(text,text)','EXECUTE'),'service role narrow auth RPC');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","session_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}',true);
select pg_temp.assert_true(public.session_is_valid(),'A has live session');
select pg_temp.expect_denied($$select public.create_activity('Early','Early')$$,'activity requires sensitive consent');
select pg_temp.assert_true((select count(*)=1 from public.profiles),'A reads own profile only');
select pg_temp.assert_true((select count(*)=0 from public.mission_templates),'pending content hidden in production');
select pg_temp.expect_denied($$select public.complete_onboarding('A','self_control','Dificuldade','Objetivo','08:00',true,true,true)$$,'pending production blocked');
reset role;
-- Human approval fixture, never a production approval workflow.
update public.mission_templates set title='Fixture',reference='Tiago 1:19',practice='Pause',context='Fixture' where focus='self_control';
update public.mission_templates set review_status='approved' where focus='self_control';
set local role authenticated;
select public.complete_onboarding('A','self_control','Dificuldade','Objetivo','08:00',true,true,true);
select pg_temp.expect_denied($$select public.complete_onboarding('A','self_control','Dificuldade','Objetivo','08:00',true,true,true)$$,'double onboarding blocked');
select pg_temp.assert_true((select count(*)=1 from public.journeys),'one active journey A');
select pg_temp.assert_true((select count(*)=1 from public.mission_assignments),'onboarding assignment atomic');
select pg_temp.expect_denied($$update public.subscriptions set plan_code='premium'$$,'client premium blocked');
select pg_temp.expect_denied($$update public.journeys set current_day=21$$,'direct progression blocked');
select pg_temp.expect_denied($$select public.change_journey('advance')$$,'advance requires check-in');
select public.save_checkin((select id from public.mission_assignments limit 1),'attempted','Minha reflexão','Aprendi');
select public.save_checkin((select id from public.mission_assignments limit 1),'completed','Atualizada','Aprendi');
select pg_temp.assert_true((select count(*)=1 from public.check_ins),'checkin upsert unique');
select public.change_journey('advance');
select pg_temp.assert_true((select current_day=2 from public.journeys limit 1),'progress exactly one');
select public.save_checkin((select id from public.mission_assignments where day=2),'completed',null,null);
select pg_temp.expect_denied($$select public.change_journey('advance')$$,'daily cap');
reset role;
-- Move the progression date back to emulate a later calendar day without changing the clock.
update public.journeys set last_advanced_on=(now() at time zone 'America/Sao_Paulo')::date-1 where user_id='11111111-1111-4111-8111-111111111111';
set local role authenticated;
select public.change_journey('advance');
select pg_temp.assert_true((select variant='deepened' from public.mission_assignments where day=3),'two completed days deepen next practice');
select public.save_checkin((select id from public.mission_assignments where day=3),'attempted',null,null);
reset role;
update public.journeys set last_advanced_on=(now() at time zone 'America/Sao_Paulo')::date-1 where user_id='11111111-1111-4111-8111-111111111111';
set local role authenticated;
select public.change_journey('advance');
select pg_temp.assert_true((select variant='simplified' from public.mission_assignments where day=4),'attempted practice simplifies next assignment');
select public.change_journey('restart');
select public.save_checkin((select id from public.mission_assignments where journey_id=(select id from public.journeys where status='active') and day=1),'completed',null,null);
select pg_temp.expect_denied($$select public.change_journey('advance')$$,'restart cannot bypass daily cap');
select public.change_journey('adapt');
select pg_temp.assert_true((select variant='simplified' from public.mission_assignments where journey_id=(select id from public.journeys where status='active') and day=1),'adapt variant');
select pg_temp.expect_denied($$select public.change_journey(null)$$,'null action blocked');

-- Direct narrative CRUD is denied; bounded RPCs are the only user write API.
select set_config('test.activity_id',public.create_activity('  A  ', E'\tPrivate\n')::text,true);
select pg_temp.expect_denied($$update public.activities set title='A'$$,'direct owner update denied');
select pg_temp.assert_true((select title='A' and description='Private' from public.activities where id=current_setting('test.activity_id')::uuid),'RPC trims title and description');
select pg_temp.expect_denied($$insert into public.activities(user_id,title,description) values('22222222-2222-4222-8222-222222222222','B','Foreign')$$,'A cannot insert for B');
select pg_temp.expect_denied($$update public.activities set user_id='22222222-2222-4222-8222-222222222222' where id=current_setting('test.activity_id')::uuid$$,'owner reassignment blocked');
do $$ declare t text; v text; begin
 foreach t in array array['activities','mentor_conversations','mentor_messages'] loop
  foreach v in array array['INSERT','UPDATE','DELETE'] loop
   perform pg_temp.assert_true(not has_table_privilege('authenticated','public.'||t,v),'direct narrative ACL '||t||'/'||v);
  end loop;
 end loop;
end $$;
select pg_temp.expect_denied($$select public.create_activity(null,'x')$$,'null title');
select pg_temp.expect_denied($$select public.create_activity(E'\t\n','x')$$,'whitespace title');
select pg_temp.expect_denied($$select public.create_activity(repeat('😀',51),'x')$$,'UTF16 title length');
select pg_temp.expect_denied($$select public.create_activity('x',repeat('x',501))$$,'description length');
do $$ begin
 for i in 2..20 loop perform public.create_activity('Quota fixture','Private'); end loop;
 perform pg_temp.expect_denied($q$select public.create_activity('Twenty first','Blocked')$q$,'activity 21 blocked');
end $$;
select pg_temp.assert_true((select count(*)=20 from public.activities),'activity quota exact and invalid input uncharged');
select public.save_mentor_exchange(null,'Pergunta A','Resposta A');
select pg_temp.assert_true((select count(*)=2 from public.mentor_messages),'mentor pair atomic');
select pg_temp.assert_true(public.consume_rate_limit(auth.uid(),'mentor_minute',999,1),'limit first');
select pg_temp.assert_true(public.consume_rate_limit(auth.uid(),'mentor_minute',999,60),'limit second');
select pg_temp.assert_true(public.consume_rate_limit(auth.uid(),'mentor_minute',999,999),'limit third');
select pg_temp.assert_true(not public.consume_rate_limit(auth.uid(),'mentor_minute',999,99999),'limit fourth blocked even with arbitrary windows');
select pg_temp.expect_denied($$select public.consume_rate_limit('22222222-2222-4222-8222-222222222222','mentor_daily',999,1)$$,'cannot use another quota');
select pg_temp.expect_denied($$select public.consume_rate_limit(auth.uid(),'invented',999,1)$$,'arbitrary operation blocked');
select pg_temp.expect_denied($$select public.delete_my_account()$$,'delete requires fresh password AMR');
select public.save_mentor_exchange(null,'Pair 2','Reply 2');
select public.save_mentor_exchange(null,'Pair 3','Reply 3');
select pg_temp.expect_denied($$select public.save_mentor_exchange(null,'Pair 4','Blocked')$$,'storage minute 4 blocked');
select pg_temp.assert_true((select count(*)=6 from public.mentor_messages),'minute denial leaves no partial pair');
reset role;
-- Privileged fixture simulates a later minute; callers cannot mutate counters or select windows.
delete from private.rate_limits where operation='mentor_storage_minute';
set local role authenticated;
select public.save_mentor_exchange(null,'Pair 4','Reply 4');
select public.save_mentor_exchange(null,'Pair 5','Reply 5');
select pg_temp.expect_denied($$select public.save_mentor_exchange(null,'Pair 6','Blocked')$$,'free storage day 6 blocked');
select pg_temp.assert_true((select count(*)=10 from public.mentor_messages),'daily denial leaves no partial pair');
select pg_temp.expect_denied($$update private.rate_limits set hits=0$$,'storage counters private');
select pg_temp.expect_denied($$select public.consume_rate_limit(auth.uid(),'mentor_storage_daily',999,1)$$,'storage operation not callable as quota reset');


select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","session_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}',true);
select public.complete_onboarding('B','self_control','Dificuldade','Objetivo','08:00',true,true,false);
select pg_temp.assert_true((select count(*)=0 from public.activities),'B cannot read A activity');
select pg_temp.expect_denied($$update public.activities set title='stolen'$$,'foreign activity update denied');
select pg_temp.expect_denied($$delete from public.activities$$,'direct activity delete denied');
select pg_temp.assert_true((select count(*)=0 from public.mentor_messages),'B cannot read A messages');
select pg_temp.assert_true((select count(*)=0 from public.check_ins),'B cannot read A checkins');
select pg_temp.expect_denied($$insert into public.mentor_messages(user_id,conversation_id,role,content) values(auth.uid(),(select id from public.mentor_conversations where user_id='11111111-1111-4111-8111-111111111111'),'user','cross')$$,'hidden conversation cannot attach');
reset role;
-- Explicit known foreign ID proves composite FK, independent of read filtering.
insert into public.mentor_conversations(id,user_id,title) values('44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222222','B');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","session_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}',true);
select pg_temp.expect_denied($$select public.save_mentor_exchange('44444444-4444-4444-8444-444444444444','cross','cross')$$,'known foreign conversation RPC denied');
-- Composite FK independently enforced even for an operator bypassing ACL/RLS.
reset role;
select pg_temp.expect_denied($$insert into public.mentor_messages(user_id,conversation_id,role,content) values('11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444','user','cross')$$,'known foreign composite FK');
set local role authenticated;
select pg_temp.assert_true((select title='A' from public.activities where id=current_setting('test.activity_id')::uuid),'B update/delete had zero effect');
select pg_temp.expect_denied($$delete from public.activities$$,'direct activity delete denied');
select pg_temp.assert_true((select count(*)=20 from public.activities),'denied delete preserves activities');
select public.update_settings(null,null,'{"ai":false}'::jsonb);
select pg_temp.assert_true((select count(*)=10 from public.mentor_messages),'revoking AI keeps independently consented history readable');
select pg_temp.expect_denied($$select public.save_mentor_exchange(null,'AI disabled','AI disabled')$$,'revoked AI blocks fresh history writes');
select public.update_settings(null,null,'{"history":false}'::jsonb);
select pg_temp.assert_true((select count(*)=0 from public.mentor_messages),'history hidden after revoke');
select pg_temp.expect_denied($$select public.save_mentor_exchange(null,'late request','late response')$$,'revoked history cannot recreate');
reset role;
select pg_temp.assert_true((select count(*)=0 from public.mentor_messages where user_id='11111111-1111-4111-8111-111111111111'),'history physically erased');
select pg_temp.assert_true((select count(*)=0 from public.mentor_conversations where user_id='11111111-1111-4111-8111-111111111111'),'conversations erased');
set local role authenticated;
select pg_temp.expect_denied($$select public.update_settings(null,null,'{"sensitiveData":false}'::jsonb)$$,'sensitive revoke requires deletion');

-- B isolation for every private relation, beyond CRUD representative activity.
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","session_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}',true);
do $$ declare t text; n integer; begin
 foreach t in array array['profiles','consents','personal_goals','journeys','mission_assignments','check_ins','mentor_conversations','mentor_messages','activities','subscriptions','product_events'] loop
  execute format('select count(*) from public.%I where user_id=''11111111-1111-4111-8111-111111111111''',t) into n;
  perform pg_temp.assert_true(n=0,'B isolation '||t);
 end loop;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claims','{}',true);
select pg_temp.expect_denied($$select public.session_is_valid()$$,'anon session wrapper denied');
select pg_temp.expect_denied($$select public.create_activity('Anon','Anon')$$,'anon activity RPC denied');
select pg_temp.expect_denied($$select public.save_mentor_exchange(null,'Anon','Anon')$$,'anon storage RPC denied');
select pg_temp.expect_denied($$select public.complete_onboarding('X','self_control','D','G','08:00',true,true,true)$$,'anon onboarding denied');
do $$ declare t text; begin
 foreach t in array array['profiles','consents','personal_goals','journeys','mission_assignments','check_ins','mentor_conversations','mentor_messages','activities','subscriptions','product_events'] loop
  perform pg_temp.expect_denied(format('select * from public.%I',t),'anon read '||t);
  perform pg_temp.expect_denied(format('delete from public.%I',t),'anon delete '||t);
 end loop;
end $$;
reset role;

-- A still presents its unexpired JWT after deleting auth.sessions. Every request must fail.
delete from auth.sessions where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","session_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}',true);
select pg_temp.assert_true(not public.session_is_valid(),'revoked session immediate denial');
do $$ declare t text; n integer; begin
 foreach t in array array['profiles','consents','personal_goals','journeys','mission_assignments','check_ins','mentor_conversations','mentor_messages','activities','subscriptions','product_events'] loop
  execute format('select count(*) from public.%I',t) into n;
  perform pg_temp.assert_true(n=0,'revoked read '||t);
 end loop;
end $$;
select pg_temp.expect_denied($$insert into public.activities(user_id,title,description) values(auth.uid(),'Revoked','Denied')$$,'revoked insert');
select pg_temp.expect_denied($$update public.activities set title='revoked update'$$,'revoked update denied');
select pg_temp.expect_denied($$delete from public.activities$$,'revoked delete denied');
select pg_temp.expect_denied($$select public.create_activity('Late','Late')$$,'revoked activity RPC');
select pg_temp.expect_denied($$select public.update_settings('Revoked',null,null)$$,'revoked settings');
select pg_temp.expect_denied($$select public.change_journey('restart')$$,'revoked progression');
select pg_temp.expect_denied($$select public.consume_rate_limit(auth.uid(),'mentor_daily',5,86400)$$,'revoked rate RPC');
select pg_temp.expect_denied($$select public.save_mentor_exchange(null,'x','y')$$,'revoked mentor RPC');
reset role;
select pg_temp.assert_true((select title='A' from public.activities where id=current_setting('test.activity_id')::uuid),'revoked update/delete no effect');
insert into auth.sessions(id,user_id,not_after) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',now()-interval '1 minute');
set local role authenticated;
select pg_temp.assert_true(not public.session_is_valid(),'expired session denied');
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","session_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}',true);
select pg_temp.assert_true(not public.session_is_valid(),'foreign session id denied');
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
select pg_temp.assert_true(not public.session_is_valid(),'missing session denied');
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","session_id":"malformed"}',true);
select pg_temp.assert_true(not public.session_is_valid(),'malformed session denied');
reset role;
set local role service_role;
do $$ declare i integer; begin
 for i in 1..10 loop perform pg_temp.assert_true(public.consume_auth_limit(repeat('a',64),'login'),'auth quota allowed'); end loop;
 perform pg_temp.assert_true(not public.consume_auth_limit(repeat('a',64),'login'),'auth quota persistent denial');
end $$;
reset role;
-- Isolate B's mutation allowance from earlier fixtures, then exhaust via direct RPC.
delete from private.rate_limits where subject='22222222-2222-4222-8222-222222222222' and operation='journey_storage_minute';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","session_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}',true);
do $$ declare n integer; begin
 select count(*) into n from public.journeys;
 for i in 1..30 loop perform public.change_journey('restart'); end loop;
 perform pg_temp.expect_denied($q$select public.change_journey('restart')$q$,'restart 31 blocked');
 perform pg_temp.assert_true((select count(*)=n+30 from public.journeys),'restart denial leaves no partial journey');
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub','22222222-2222-4222-8222-222222222222','role','authenticated','session_id','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',floor(extract(epoch from now())))))::text,true);
select public.delete_my_account();
select pg_temp.assert_true(not public.session_is_valid(),'deleted account revoked');
reset role;
select pg_temp.assert_true(not exists(select 1 from auth.users where id='22222222-2222-4222-8222-222222222222'),'Auth user actually deleted');
select pg_temp.assert_true(not exists(select 1 from auth.sessions where user_id='22222222-2222-4222-8222-222222222222'),'all sessions actually revoked');
select pg_temp.assert_true(not exists(select 1 from public.profiles where user_id='22222222-2222-4222-8222-222222222222'),'profile cascade deleted');
select pg_temp.assert_true(not exists(select 1 from public.journeys where user_id='22222222-2222-4222-8222-222222222222'),'journey cascade deleted');
select pg_temp.assert_true(not exists(select 1 from public.mentor_conversations where user_id='22222222-2222-4222-8222-222222222222'),'history cascade deleted');
rollback;
