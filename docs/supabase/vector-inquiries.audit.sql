-- Read-only preflight/post-install audit. No contact content or credentials.
begin read only;

select current_database() as database_name,
       current_user as audit_role,
       exists(select 1 from pg_roles where rolname = 'service_role') as has_service_role,
       exists(select 1 from pg_roles where rolname = 'anon') as has_anon_role,
       exists(select 1 from pg_roles where rolname = 'authenticated') as has_authenticated_role;

with expected(name) as (values
 ('vector_inquiries'), ('vector_inquiry_limits'),
 ('vector_newsletter_subscriptions'), ('vector_unsubscribe_tokens'))
select e.name, c.oid is not null as present, c.relrowsecurity as rls_enabled,
       pg_get_userbyid(c.relowner) as owner
from expected e
left join pg_namespace n on n.nspname = 'public'
left join pg_class c on c.relnamespace = n.oid and c.relname = e.name
order by e.name;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('vector_inquiries', 'vector_inquiry_limits',
    'vector_newsletter_subscriptions', 'vector_unsubscribe_tokens')
order by table_name, grantee, privilege_type;

-- Check effective privileges as well as explicit grants, including PUBLIC and
-- inherited role membership. Missing roles are reported by the identity query.
select c.relname as table_name, r.rolname as role_name,
       has_table_privilege(r.oid, c.oid, 'SELECT') as can_read,
       has_table_privilege(r.oid, c.oid, 'INSERT') as can_insert,
       has_table_privilege(r.oid, c.oid, 'UPDATE') as can_update,
       has_table_privilege(r.oid, c.oid, 'DELETE') as can_delete
from pg_class c join pg_namespace n on n.oid = c.relnamespace
cross join pg_roles r
where n.nspname = 'public' and c.relname in
 ('vector_inquiries', 'vector_inquiry_limits', 'vector_newsletter_subscriptions', 'vector_unsubscribe_tokens')
 and r.rolname in ('anon', 'authenticated')
order by c.relname, r.rolname;

select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('vector_inquiries', 'vector_inquiry_limits',
    'vector_newsletter_subscriptions', 'vector_unsubscribe_tokens')
order by tablename, policyname;

select p.oid::regprocedure::text as signature, p.prosecdef as security_definer,
       p.proconfig as settings, pg_get_userbyid(p.proowner) as owner,
       p.proacl::text as grants
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in
 ('vector_submit_inquiry', 'vector_register_unsubscribe_token', 'vector_unsubscribe')
order by p.proname, p.oid;

select p.oid::regprocedure::text as signature, r.rolname as role_name,
       has_function_privilege(r.oid, p.oid, 'EXECUTE') as can_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
cross join pg_roles r
where n.nspname = 'public' and p.proname in
 ('vector_submit_inquiry', 'vector_register_unsubscribe_token', 'vector_unsubscribe')
 and r.rolname in ('anon', 'authenticated', 'service_role')
order by p.proname, p.oid, r.rolname;

-- Empty results are expected before the initial migration. Afterwards, all four
-- tables must use RLS; no public/anon/authenticated table grants or policies may
-- expose them, and only service_role may invoke the three security-definer RPCs.
rollback;
