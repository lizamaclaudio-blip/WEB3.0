-- Prepared QA-only registration guard. Hook activation is a separate Auth setting.
-- Does not change existing users, sessions, moderators or form policies.
begin;
create table vector_community_private.qa_registration_intents (
 email text primary key check(email='patagonia@patagoniaw.com'),
 token_hash text not null check(token_hash ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz not null,
 consumed_at timestamptz
);
alter table vector_community_private.qa_registration_intents enable row level security;
revoke all on vector_community_private.qa_registration_intents from public,anon,authenticated,service_role;
grant usage on schema vector_community_private to supabase_auth_admin;
grant select,update on vector_community_private.qa_registration_intents to supabase_auth_admin;
create policy qa_auth_read on vector_community_private.qa_registration_intents
 for select to supabase_auth_admin using(true);
create policy qa_auth_consume on vector_community_private.qa_registration_intents
 for update to supabase_auth_admin using(true) with check(true);

create function public.vector_community_qa_register_intent(p_email text,p_token_hash text)
returns text language plpgsql security definer set search_path=pg_catalog as $$
declare changed integer;
begin
 if p_email is distinct from 'patagonia@patagoniaw.com' or p_token_hash is null
   or p_token_hash !~ '^[a-f0-9]{64}$' then return 'unavailable'; end if;
 insert into vector_community_private.qa_registration_intents(email,token_hash,expires_at)
 values(p_email,p_token_hash,clock_timestamp()+interval '60 seconds')
 on conflict(email) do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at
 where qa_registration_intents.consumed_at is null and qa_registration_intents.expires_at<clock_timestamp();
 get diagnostics changed=row_count;
 return case when changed=1 then 'prepared' else 'unavailable' end;
end;
$$;
revoke all on function public.vector_community_qa_register_intent(text,text) from public,anon,authenticated,supabase_auth_admin;
grant execute on function public.vector_community_qa_register_intent(text,text) to service_role;

create function public.vector_before_user_created_qa(event jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog as $$
declare nonce text; changed integer;
begin
 nonce=event#>>'{user,user_metadata,qa_registration_nonce}';
 if event#>>'{metadata,name}' is distinct from 'before-user-created'
  or event#>>'{user,email}' is distinct from 'patagonia@patagoniaw.com'
  or event#>>'{user,is_anonymous}' is distinct from 'false'
  or nonce is null or nonce !~ '^[A-Za-z0-9_-]{43}$' then
  return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Registration is unavailable.'));
 end if;
 -- The user-editable nonce is only proof of a server-created, one-use intent.
 -- It never grants a role and is never used to authorize an existing session.
 update vector_community_private.qa_registration_intents set consumed_at=clock_timestamp()
 where email='patagonia@patagoniaw.com' and consumed_at is null and expires_at>clock_timestamp()
  and token_hash=encode(sha256(convert_to(nonce,'UTF8')),'hex');
 get diagnostics changed=row_count;
 if changed=1 then return '{}'::jsonb; end if;
 return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Registration is unavailable.'));
end;
$$;
revoke all on function public.vector_before_user_created_qa(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.vector_before_user_created_qa(jsonb) to supabase_auth_admin;
commit;
