-- Reversible DB integration check using the confirmed owner's actual session.
-- This is not a substitute for browser persistence proof. No idea is published.
begin;
do $$
declare actor uuid; session_id uuid; idea uuid; result text;
begin
 select u.id,s.id into actor,session_id from auth.users u
 join auth.sessions s on s.user_id=u.id
 where lower(u.email)='patagonia@patagoniaw.com' and u.email_confirmed_at is not null
 order by s.created_at desc limit 1;
 if actor is null then raise exception 'Verified QA owner required'; end if;
 if public.vector_community_identity(actor,session_id)->>'admin' <> 'false' then raise exception 'Unexpected moderator'; end if;
 insert into public.vector_community_proposals(title,description,category,published)
 values('QA WEB53 rollback-only vote fixture','Temporary database integration fixture. It is never committed or published to visitors.','other',false)
 returning id into idea;
 if public.vector_community_vote(actor,session_id,idea,true,repeat('a',64))<>'not_found' then raise exception 'Unpublished vote allowed'; end if;
 -- Publication exists only inside this uncommitted transaction.
 update public.vector_community_proposals set published=true where id=idea;
 result=public.vector_community_vote(actor,session_id,idea,true,repeat('a',64));
 if result<>'saved' then raise exception 'First vote failed'; end if;
 perform public.vector_community_vote(actor,session_id,idea,true,repeat('a',64));
 if (select count(*) from vector_community_private.votes where proposal_id=idea and user_id=actor)<>1 then raise exception 'Duplicate vote'; end if;
 if (select votes from public.vector_community_proposals where id=idea)<>1 then raise exception 'Incorrect counter'; end if;
 if not exists(select 1 from jsonb_array_elements(public.vector_community_list(actor,session_id,idea)->'items')) then raise exception 'Approved view missing'; end if;
 perform public.vector_community_vote(actor,session_id,idea,false,repeat('a',64));
 perform public.vector_community_vote(actor,session_id,idea,false,repeat('a',64));
 if (select count(*) from vector_community_private.votes where proposal_id=idea)<>0 then raise exception 'Withdrawal failed'; end if;
 if (select votes from public.vector_community_proposals where id=idea)<>0 then raise exception 'Withdrawal counter'; end if;
end $$;
rollback;
select 'PASS: actual verified identity, no moderator, unpublished denied, approved visible, duplicate prevented, withdrawal idempotent; all fixture changes rolled back' as result;
