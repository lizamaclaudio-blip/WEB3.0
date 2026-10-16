-- Synthetic QA only. No SMTP, no HTTP, no historical mutations; all fixtures ROLLBACK.
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';
create temporary table web51_qa_ids(key text primary key,id uuid not null) on commit drop;
insert into web51_qa_ids values('user',gen_random_uuid()),('second',gen_random_uuid()),('admin',gen_random_uuid()),('unverified',gen_random_uuid()),('session',gen_random_uuid()),('second_session',gen_random_uuid()),('admin_session',gen_random_uuid()),('unverified_session',gen_random_uuid()),('a',gen_random_uuid()),('b',gen_random_uuid()),('c',gen_random_uuid());
insert into auth.users(id,email,email_confirmed_at,role,aud)
 select id,'qa-'||id::text||'@example.test',case when key='unverified' then null else now() end,'authenticated','authenticated' from web51_qa_ids where key in('user','second','admin','unverified');
insert into auth.sessions(id,user_id,not_after)
 select s.id,u.id,now()+interval '1 hour' from web51_qa_ids u join web51_qa_ids s on s.key=case u.key when 'user' then 'session' when 'second' then 'second_session' when 'admin' then 'admin_session' else 'unverified_session' end where u.key in('user','second','admin','unverified');
insert into vector_community_private.moderators(user_id) select id from web51_qa_ids where key='admin';
insert into public.vector_community_proposals(id,title,description,category,published)
 select id,'Synthetic idea '||key,'Synthetic QA proposal, not a real user idea or product commitment.','other',key<>'a' from web51_qa_ids where key in('a','b','c');
insert into vector_community_private.authors select p.id,u.id,'2026-10-community-v1' from web51_qa_ids p cross join web51_qa_ids u where p.key in('a','b','c') and u.key='user';

do $qa$
declare u uuid; s uuid; a uuid; ad uuid; ads uuid; b uuid; c uuid; second_user uuid; second_session uuid; result jsonb; before_mail bigint; before_legacy bigint; outcome text; rpt uuid;
begin
 select id into u from web51_qa_ids where key='user';select id into s from web51_qa_ids where key='session';
 select id into ad from web51_qa_ids where key='admin';select id into ads from web51_qa_ids where key='admin_session';
 select id into a from web51_qa_ids where key='a';select id into b from web51_qa_ids where key='b';select id into c from web51_qa_ids where key='c';
 select id into second_user from web51_qa_ids where key='second';select id into second_session from web51_qa_ids where key='second_session';
 select count(*) into before_mail from public.vector_mail_outbox;
 select count(*) into before_legacy from public.pw3_settings;
 result:=public.vector_community_list(null,null,a);if jsonb_array_length(result->'items')<>0 then raise exception 'Pending proposal leaked';end if;
 if result::text like '%email%' or result::text like '%user_id%' then raise exception 'Identity leaked';end if;
 if public.vector_community_submit(second_user,second_session,'A synthetic pilot idea','A synthetic proposal with enough detail for a meaningful moderation test.','planning','QA alias',repeat('b',64))<>'pending_moderation' then raise exception 'Proposal submission not persisted';end if;
 if not exists(select 1 from public.vector_community_proposals p join vector_community_private.authors aa on aa.proposal_id=p.id where aa.user_id=second_user and not p.published and not p.hidden) then raise exception 'Submission bypassed moderation or lost authorship';end if;
 begin perform public.vector_community_identity(u,ads);raise exception 'Cross-user session accepted';exception when insufficient_privilege then null;end;
 begin perform public.vector_community_identity((select id from web51_qa_ids where key='unverified'),(select id from web51_qa_ids where key='unverified_session'));raise exception 'Unverified identity accepted';exception when insufficient_privilege then null;end;
 begin perform public.vector_community_admin(u,s,'read');raise exception 'Ordinary user became moderator';exception when insufficient_privilege then null;end;
 if public.vector_community_vote(u,s,a,true,repeat('a',64))<>'not_found' then raise exception 'Pending idea vote accepted';end if;
 perform public.vector_community_admin(ad,ads,'moderate',jsonb_build_object('id',a,'status','evaluacion','response','Synthetic review','published',true,'hidden',false,'featured',true));
 perform public.vector_community_vote(u,s,a,true,repeat('a',64));perform public.vector_community_vote(u,s,a,true,repeat('a',64));
 if (select votes from public.vector_community_proposals where id=a)<>1 then raise exception 'Duplicate vote inflated count';end if;
 perform public.vector_community_vote(second_user,second_session,a,true,repeat('b',64));
 if (select votes from public.vector_community_proposals where id=a)<>2 then raise exception 'Second distinct vote missing';end if;
 perform public.vector_community_vote(u,s,a,false,repeat('a',64));perform public.vector_community_vote(u,s,a,false,repeat('a',64));
 if (select votes from public.vector_community_proposals where id=a)<>1 then raise exception 'Withdrawal not idempotent';end if;
 perform public.vector_community_vote(u,s,a,true,repeat('a',64));perform public.vector_community_vote(u,s,b,true,repeat('a',64));
 perform public.vector_community_admin(ad,ads,'merge',jsonb_build_object('id',a,'targetId',b));
 if (select votes from public.vector_community_proposals where id=b)<>2 then raise exception 'Merge inflated union of voters';end if;
 perform public.vector_community_admin(ad,ads,'merge',jsonb_build_object('id',b,'targetId',c));
 result:=public.vector_community_list(null,null,a);
 if result->'items'->0->>'id'<>c::text then raise exception 'Historic merged link lost';end if;
 perform public.vector_community_vote(u,s,a,false,repeat('a',64));
 if (select votes from public.vector_community_proposals where id=c)<>1 then raise exception 'Historic-link withdrawal lied';end if;
 perform public.vector_community_report(u,s,c,'Synthetic moderation report',repeat('a',64));
 select id into rpt from vector_community_private.reports where proposal_id=c and user_id=u;
 perform public.vector_community_admin(ad,ads,'report',jsonb_build_object('id',rpt,'hidden',true));
 if jsonb_array_length(public.vector_community_list(null,null,c)->'items')<>0 then raise exception 'Hidden content leaked';end if;
 begin perform public.vector_community_admin(ad,ads,'roadmap','{"items":[{}],"launchDate":null}');raise exception 'Invalid roadmap accepted';exception when raise_exception then if sqlerrm='Invalid roadmap accepted' then raise;end if;end;
 result:=public.vector_community_roadmap();
 if jsonb_array_length(result->'items')<>16 or result->>'launchDate' is not null then raise exception 'Invented release date or lost reviewed roadmap';end if;
 perform public.vector_community_admin(ad,ads,'roadmap',jsonb_build_object('items',jsonb_build_array(jsonb_build_object('id','qa-stage','status','testing','title',jsonb_build_object('es','QA','en','QA','fr','QA','private','REMOVE'),'description',jsonb_build_object('es','Descripción QA','en','QA description','fr','Description QA'),'evidenceNote',jsonb_build_object('es','QA sintético','en','Synthetic QA','fr','QA synthétique'),'privateField','REMOVE')),'launchDate',null));
 if public.vector_community_roadmap()::text like '%REMOVE%' then raise exception 'Unknown private roadmap fields leaked';end if;
 outcome:=public.vector_founders_register('qa-'||u::text||'@example.test',repeat('f',64),'QA Pilot','es',null,false,repeat('f',64));
 if outcome<>'saved_pending_verification' then raise exception 'Founder storage failed';end if;
 perform public.vector_founders_register('qa-'||u::text||'@example.test',repeat('f',64),'QA Pilot','es',null,false,repeat('f',64));
 if (select count(*) from vector_community_private.founders_notices where email_hash=repeat('f',64))<>1 then raise exception 'Duplicate founder record';end if;
 perform public.vector_founders_confirm(u,s,false);perform public.vector_founders_confirm(u,s,false);
 if (select status from vector_community_private.founders_notices where email_hash=repeat('f',64))<>'confirmed' then raise exception 'Verified notice failed';end if;
 perform public.vector_founders_confirm(u,s,true);perform public.vector_founders_confirm(u,s,true);
 perform public.vector_founders_register('qa-'||u::text||'@example.test',repeat('f',64),'QA Pilot','es',null,false,repeat('f',64));
 if (select status from vector_community_private.founders_notices where email_hash=repeat('f',64))<>'pending' then raise exception 'New explicit notice consent not renewed safely';end if;
 if (select count(*) from public.vector_mail_outbox)<>before_mail then raise exception 'Notice-only consent queued commercial mail';end if;
 perform public.vector_founders_register('qa-'||u::text||'@example.test',repeat('f',64),'QA Pilot','es',null,true,repeat('f',64));
 set constraints all immediate;
 if (select count(*) from public.vector_newsletter_subscriptions where email_hash=repeat('f',64))<>1 then raise exception 'Separate newsletter consent was not stored';end if;
 perform public.vector_founders_register('qa-'||u::text||'@example.test',repeat('f',64),'QA Pilot','es',null,true,repeat('f',64));
 if (select count(*) from public.vector_mail_outbox o join public.vector_newsletter_subscriptions ns on ns.id=o.subscription_id where ns.email_hash=repeat('f',64) and o.kind='newsletter_confirm')<>1 then raise exception 'Repeated opt-in duplicated confirmation';end if;
 if (select count(*) from public.pw3_settings)<>before_legacy then raise exception 'Historical data changed';end if;
 if not exists(select 1 from vector_community_private.audit where actor=ad and action='merge') then raise exception 'Moderation audit missing';end if;
 update auth.sessions set not_after=now()-interval '1 second' where id=s;
 begin perform public.vector_community_vote(u,s,c,false,repeat('a',64));raise exception 'Expired session accepted';exception when insufficient_privilege then null;end;
end $qa$;

set local role anon;
do $$begin
 if (select count(*) from public.vector_community_proposals where title like 'Synthetic idea%')<>0 then raise exception 'RLS exposed hidden rows';end if;
 begin perform * from vector_community_private.founders_notices;raise exception 'Anon read private emails';exception when insufficient_privilege then null;end;
 begin perform public.vector_community_admin(gen_random_uuid(),gen_random_uuid(),'read');raise exception 'Anon called privileged RPC';exception when insufficient_privilege then null;end;
 begin insert into public.vector_community_proposals(title,description,category) values('Anon attack','Synthetic unauthorized proposal injection','other');raise exception 'Anon write';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role authenticated;
do $$begin
 begin perform * from vector_community_private.votes;raise exception 'Authenticated voter identities leaked';exception when insufficient_privilege then null;end;
 begin perform public.vector_founders_register('qa@example.test',repeat('e',64),'QA','es',null,false,repeat('e',64));raise exception 'User invoked privileged founder RPC';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'passed' as web51_community_integration, 'rollback' as transaction, 0 as emails_sent;
rollback;
