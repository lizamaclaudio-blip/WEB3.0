-- Web 5.1: new isolated community data. No historical tables/policies, mail jobs,
-- credentials, extensions or schedules are changed. No administrator is seeded.
create schema vector_community_private;
revoke all on schema vector_community_private from public, anon, authenticated;
grant usage on schema vector_community_private to service_role;

create table public.vector_community_proposals (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(title) between 8 and 140),
 description text not null check (char_length(description) between 30 and 4000),
 category text not null check (category in ('copilot','navigation','planning','aircraft','systems','ground','career','acars','landing','performance','interface','other')),
 alias text not null default '' check (char_length(alias)<=60),
 created_at timestamptz not null default now(),
 status text not null default 'propuesta' check (status in ('propuesta','evaluacion','planificada','desarrollo','implementada','no_planificada')),
 developer_response text not null default '' check (char_length(developer_response)<=3000),
 published boolean not null default false,
 hidden boolean not null default false,
 featured boolean not null default false,
 votes integer not null default 0 check (votes>=0),
 merged_into uuid references public.vector_community_proposals(id),
 check (merged_into is null or merged_into<>id)
);
create index vector_community_public_sort on public.vector_community_proposals(featured desc,votes desc,created_at desc) where published and not hidden and merged_into is null;
create index vector_community_merge on public.vector_community_proposals(merged_into) where merged_into is not null;
alter table public.vector_community_proposals enable row level security;
revoke all on public.vector_community_proposals from public,anon,authenticated;
grant select on public.vector_community_proposals to anon,authenticated;
grant all on public.vector_community_proposals to service_role;
create policy community_published_only on public.vector_community_proposals for select to anon,authenticated using (published and not hidden and merged_into is null);

create table vector_community_private.authors (
 proposal_id uuid primary key references public.vector_community_proposals(id),
 user_id uuid not null references auth.users(id),
 consent_version text not null check (consent_version='2026-10-community-v1')
);
create index community_author_user on vector_community_private.authors(user_id);
create table vector_community_private.votes (
 proposal_id uuid not null references public.vector_community_proposals(id),
 user_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 primary key(proposal_id,user_id)
);
create index community_votes_user on vector_community_private.votes(user_id);
create table vector_community_private.moderators (user_id uuid primary key references auth.users(id), active boolean not null default true);
create table vector_community_private.reports (
 id uuid primary key default gen_random_uuid(), proposal_id uuid not null references public.vector_community_proposals(id),
 user_id uuid not null references auth.users(id), reason text not null check(char_length(reason) between 10 and 1000),
 created_at timestamptz not null default now(), resolved boolean not null default false,
 unique(proposal_id,user_id)
);
create table vector_community_private.audit (
 id bigint generated always as identity primary key, actor uuid not null references auth.users(id),
 action text not null, target uuid, details jsonb not null default '{}', created_at timestamptz not null default now()
);
create table vector_community_private.limits (
 scope text not null, fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'), bucket timestamptz not null,
 hits integer not null, primary key(scope,fingerprint,bucket)
);
create table vector_community_private.founders_notices (
 id uuid primary key default gen_random_uuid(), email text not null unique check(char_length(email)<=254 and email=lower(email)),
 email_hash text not null unique check(email_hash ~ '^[a-f0-9]{64}$'), name text not null check(char_length(name) between 1 and 100),
 locale text not null check(locale in ('es','en','fr')), country text check(char_length(country)<=80),
 notice_consent_version text not null check(notice_consent_version='2026-10-founders-notice-v1'),
 notice_consented_at timestamptz not null default now(),
 newsletter_consent boolean not null default false,
 status text not null default 'pending' check(status in ('pending','confirmed','withdrawn')),
 confirmed_at timestamptz, withdrawn_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.vector_public_roadmap (
 singleton boolean primary key default true check(singleton), items jsonb not null default '[]' check(jsonb_typeof(items)='array'),
 launch_date date, updated_at timestamptz not null default now()
);
alter table public.vector_public_roadmap enable row level security;
revoke all on public.vector_public_roadmap from public,anon,authenticated;
grant select on public.vector_public_roadmap to anon,authenticated;
grant all on public.vector_public_roadmap to service_role;
create policy roadmap_public_read on public.vector_public_roadmap for select to anon,authenticated using(true);

do $$ declare t text; begin
 foreach t in array array['authors','votes','moderators','reports','audit','limits','founders_notices'] loop
  execute format('alter table vector_community_private.%I enable row level security',t);
  execute format('revoke all on vector_community_private.%I from public,anon,authenticated',t);
  execute format('grant all on vector_community_private.%I to service_role',t);
 end loop;
end $$;
grant usage,select on all sequences in schema vector_community_private to service_role;

create function vector_community_private.identity(p_actor uuid,p_session uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if p_actor is null or p_session is null or not exists (
  select 1 from auth.users u join auth.sessions s on s.user_id=u.id
  where u.id=p_actor and s.id=p_session and u.email_confirmed_at is not null
   and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now())
   and (s.not_after is null or s.not_after>now())) then
  raise insufficient_privilege using message='Verified active session required';
 end if;
 return exists(select 1 from vector_community_private.moderators m where m.user_id=p_actor and m.active);
end $$;
create function vector_community_private.allow_request(p_scope text,p_hash text,p_max integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare n integer; b timestamptz:=date_trunc('hour',now());
begin
 if p_hash is null or p_hash !~ '^[a-f0-9]{64}$' or p_max not between 1 and 500 then return false; end if;
 insert into vector_community_private.limits(scope,fingerprint,bucket,hits) values(p_scope,p_hash,b,1)
 on conflict(scope,fingerprint,bucket) do update set hits=least(vector_community_private.limits.hits+1,p_max+1) returning hits into n;
 return n<=p_max;
end $$;
create function public.vector_community_rate(p_scope text,p_hash text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if p_scope not in ('login','register','read','founders','admin') then return false; end if;
 return vector_community_private.allow_request(p_scope,p_hash,case p_scope when 'login' then 15 when 'register' then 4 when 'read' then 300 when 'admin' then 100 else 5 end);
end $$;
create function public.vector_community_identity(p_actor uuid,p_session uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin return jsonb_build_object('admin',vector_community_private.identity(p_actor,p_session)); end $$;
create function public.vector_community_roadmap() returns jsonb
language sql security definer set search_path='' as $$
 select jsonb_build_object('items',items,'launchDate',launch_date) from public.vector_public_roadmap where singleton;
$$;

create function public.vector_community_list(p_actor uuid default null,p_session uuid default null,p_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a boolean:=false; items jsonb;
begin
 if p_actor is not null then a:=vector_community_private.identity(p_actor,p_session); end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'title',q.title,'description',q.description,'category',q.category,'alias',q.alias,
 'createdAt',q.created_at,'votes',q.votes,'status',q.status,'response',q.developer_response,'featured',q.featured,
 'voted',exists(select 1 from vector_community_private.votes v where v.proposal_id=q.id and v.user_id=p_actor)) order by q.featured desc,q.votes desc,q.created_at desc),'[]') into items
 from (select p.* from public.vector_community_proposals p where p.published and not p.hidden and p.merged_into is null and
  (p_id is null or p.id=p_id or p.id=(select p2.merged_into from public.vector_community_proposals p2 where p2.id=p_id))
  order by p.featured desc,p.votes desc,p.created_at desc limit 100) q;
 return jsonb_build_object('ok',true,'items',items,'authenticated',p_actor is not null,'admin',a);
end $$;
create function public.vector_community_submit(p_actor uuid,p_session uuid,p_title text,p_description text,p_category text,p_alias text,p_hash text) returns text
language plpgsql security definer set search_path='' as $$
declare item uuid;
begin
 perform vector_community_private.identity(p_actor,p_session);
 if not vector_community_private.allow_request('submit',p_hash,5) then return 'rate_limited'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,51));
 if (select count(*) from vector_community_private.authors a join public.vector_community_proposals p on p.id=a.proposal_id where a.user_id=p_actor and p.created_at>now()-interval '1 day')>=3 then return 'rate_limited'; end if;
 insert into public.vector_community_proposals(title,description,category,alias) values(p_title,p_description,p_category,coalesce(p_alias,'')) returning id into item;
 insert into vector_community_private.authors values(item,p_actor,'2026-10-community-v1');
 return 'pending_moderation';
end $$;
create function public.vector_community_vote(p_actor uuid,p_session uuid,p_id uuid,p_vote boolean,p_hash text) returns text
language plpgsql security definer set search_path='' as $$
declare q public.vector_community_proposals; canonical uuid;
begin
 perform vector_community_private.identity(p_actor,p_session);
 if p_vote is null then return 'invalid'; end if;
 if not vector_community_private.allow_request('vote',p_hash,100) or not vector_community_private.allow_request('vote-user',encode(sha256(convert_to(p_actor::text,'UTF8')),'hex'),100) then return 'rate_limited'; end if;
 select coalesce(merged_into,id) into canonical from public.vector_community_proposals where id=p_id;
 select * into q from public.vector_community_proposals where id=canonical for update;
 if found and q.merged_into is not null then return 'merged'; end if;
 if not found or (p_vote and (not q.published or q.hidden or q.merged_into is not null)) then return 'not_found'; end if;
 if p_vote then insert into vector_community_private.votes(proposal_id,user_id) values(canonical,p_actor) on conflict do nothing;
 else delete from vector_community_private.votes where proposal_id=canonical and user_id=p_actor; end if;
 update public.vector_community_proposals set votes=(select count(*) from vector_community_private.votes where proposal_id=canonical) where id=canonical;
 return 'saved';
end $$;
create function public.vector_community_report(p_actor uuid,p_session uuid,p_id uuid,p_reason text,p_hash text) returns text
language plpgsql security definer set search_path='' as $$
begin
 perform vector_community_private.identity(p_actor,p_session);
 if not vector_community_private.allow_request('report',p_hash,10) or not vector_community_private.allow_request('report-user',encode(sha256(convert_to(p_actor::text,'UTF8')),'hex'),10) then return 'rate_limited'; end if;
 if not exists(select 1 from public.vector_community_proposals where id=p_id and published and not hidden and merged_into is null) then return 'not_found'; end if;
 insert into vector_community_private.reports(proposal_id,user_id,reason) values(p_id,p_actor,p_reason) on conflict(proposal_id,user_id) do nothing;
 return 'saved';
end $$;

create function public.vector_community_admin(p_actor uuid,p_session uuid,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare item uuid; target uuid; r jsonb; e jsonb; language text; normalized jsonb:='[]';
begin
 if not vector_community_private.identity(p_actor,p_session) then raise insufficient_privilege using message='Moderator required'; end if;
 if p_action='read' then
  return jsonb_build_object('ok',true,'items',coalesce((select jsonb_agg(to_jsonb(p) order by created_at desc) from (select * from public.vector_community_proposals order by created_at desc limit 100) p),'[]'),
   'reports',coalesce((select jsonb_agg(jsonb_build_object('id',id,'proposalId',proposal_id,'reason',reason,'createdAt',created_at,'resolved',resolved) order by created_at desc) from (select * from vector_community_private.reports order by created_at desc limit 100) rr),'[]'),
   'roadmap',coalesce((select items from public.vector_public_roadmap where singleton),'[]'),'launchDate',(select launch_date from public.vector_public_roadmap where singleton));
 end if;
 if p_action in ('moderate','merge','report') then item:=(p_payload->>'id')::uuid; end if;
 if p_action='moderate' then
  update public.vector_community_proposals set status=p_payload->>'status',developer_response=coalesce(p_payload->>'response',''),
   published=(p_payload->>'published')::boolean,hidden=coalesce((p_payload->>'hidden')::boolean,false),featured=(p_payload->>'featured')::boolean where id=item and merged_into is null;
  if not found then raise exception 'Invalid proposal'; end if;
 elsif p_action='merge' then
  perform pg_advisory_xact_lock(hashtextextended('community-merges',51));
  target:=(p_payload->>'targetId')::uuid;
  if item=target then raise exception 'Invalid merge'; end if;
  perform id from public.vector_community_proposals where id in (item,target) order by id for update;
  if (select count(*) from public.vector_community_proposals where id in(item,target) and merged_into is null)<>2 then raise exception 'Invalid merge'; end if;
  insert into vector_community_private.votes(proposal_id,user_id) select target,user_id from vector_community_private.votes where proposal_id=item on conflict do nothing;
  update public.vector_community_proposals set votes=(select count(*) from vector_community_private.votes where proposal_id=target) where id=target;
  update public.vector_community_proposals set merged_into=target,published=false,hidden=true,featured=false where id=item;
  update public.vector_community_proposals set merged_into=target where merged_into=item;
 elsif p_action='report' then
  update vector_community_private.reports set resolved=true where id=item;
  if not found then raise exception 'Invalid report'; end if;
  if p_payload->>'hidden'='true' then update public.vector_community_proposals set hidden=true,published=false where id=(select proposal_id from vector_community_private.reports where id=item); end if;
 elsif p_action='roadmap' then
  r:=p_payload->'items';
  if coalesce(jsonb_typeof(r),'')<>'array' or jsonb_array_length(r) not between 1 and 40 then raise exception 'Invalid roadmap'; end if;
  for e in select value from jsonb_array_elements(r) loop
   if coalesce(e->>'id','') !~ '^[a-z][a-z0-9-]{1,79}$' or coalesce(e->>'status','') not in('completed','testing','development','upcoming','study') then raise exception 'Invalid roadmap'; end if;
   foreach language in array array['es','en','fr'] loop
    if coalesce(jsonb_typeof(e->'title'->language),'')<>'string' or char_length(e->'title'->>language) not between 1 and 180
     or coalesce(jsonb_typeof(e->'description'->language),'')<>'string' or char_length(e->'description'->>language) not between 1 and 1500
     or coalesce(jsonb_typeof(e->'evidenceNote'->language),'')<>'string' or char_length(e->'evidenceNote'->>language) not between 1 and 800 then raise exception 'Invalid roadmap'; end if;
   end loop;
   normalized:=normalized||jsonb_build_array(jsonb_build_object('id',e->>'id','status',e->>'status',
    'title',jsonb_build_object('es',e->'title'->>'es','en',e->'title'->>'en','fr',e->'title'->>'fr'),
    'description',jsonb_build_object('es',e->'description'->>'es','en',e->'description'->>'en','fr',e->'description'->>'fr'),
    'evidenceNote',jsonb_build_object('es',e->'evidenceNote'->>'es','en',e->'evidenceNote'->>'en','fr',e->'evidenceNote'->>'fr')));
  end loop;
  if (select count(distinct value->>'id') from jsonb_array_elements(r))<>jsonb_array_length(r) then raise exception 'Duplicate roadmap ID'; end if;
  insert into public.vector_public_roadmap(singleton,items,launch_date) values(true,normalized,(p_payload->>'launchDate')::date)
   on conflict(singleton) do update set items=excluded.items,launch_date=excluded.launch_date,updated_at=now();
 else raise exception 'Unknown action'; end if;
 insert into vector_community_private.audit(actor,action,target,details) values(p_actor,p_action,item,jsonb_build_object('targetId',target));
 return jsonb_build_object('ok',true,'code','SAVED');
end $$;

create function public.vector_founders_register(p_email text,p_email_hash text,p_name text,p_locale text,p_country text,p_newsletter boolean,p_ip_hash text) returns text
language plpgsql security definer set search_path='' as $$
declare inserted uuid; outcome text; old_status text; old_newsletter boolean;
begin
 if p_email is null or p_email !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$' or p_newsletter is null then return 'invalid'; end if;
 if not vector_community_private.allow_request('founders',p_ip_hash,5) then return 'rate_limited'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_email,51));
 select status,newsletter_consent into old_status,old_newsletter from vector_community_private.founders_notices where email=p_email for update;
 insert into vector_community_private.founders_notices(email,email_hash,name,locale,country,notice_consent_version,newsletter_consent)
 values(p_email,p_email_hash,p_name,p_locale,p_country,'2026-10-founders-notice-v1',p_newsletter) on conflict(email) do nothing returning id into inserted;
 if inserted is null then
  update vector_community_private.founders_notices set status=case when status='withdrawn' then 'pending' else status end,
   notice_consented_at=case when status='withdrawn' then now() else notice_consented_at end,
   newsletter_consent=newsletter_consent or p_newsletter where email=p_email;
 end if;
 if p_newsletter and (inserted is not null or not coalesce(old_newsletter,false)) then
  outcome:=public.vector_submit_inquiry('interest',p_email,p_name,'',p_locale,'2026-10-v1',p_ip_hash,p_email_hash,true,'2026-10-news-v1');
  if outcome<>'accepted' then raise exception 'Storage unavailable'; end if;
 end if;
 return 'saved_pending_verification';
end $$;
create function public.vector_founders_confirm(p_actor uuid,p_session uuid,p_withdraw boolean default false) returns text
language plpgsql security definer set search_path='' as $$
declare address text;
begin
 perform vector_community_private.identity(p_actor,p_session);
 select lower(email) into address from auth.users where id=p_actor;
 if p_withdraw then update vector_community_private.founders_notices set status='withdrawn',withdrawn_at=now() where email=address and status<>'withdrawn';
 else update vector_community_private.founders_notices set status='confirmed',confirmed_at=now(),withdrawn_at=null where email=address and status='pending'; end if;
 if not found and not exists(select 1 from vector_community_private.founders_notices where email=address and status=case when p_withdraw then 'withdrawn' else 'confirmed' end) then return 'not_found'; end if;
 return case when p_withdraw then 'withdrawn' else 'confirmed' end;
end $$;

-- All writes are server-only. The verified BFF derives actor/session from Supabase
-- Auth, never from request JSON. Private helpers cannot be called via Data API.
revoke all on all functions in schema vector_community_private from public,anon,authenticated;
do $$ declare r record; begin
 for r in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and (p.proname like 'vector_community_%' or p.proname like 'vector_founders_%') loop
  execute format('revoke all on function %s from public,anon,authenticated',r.signature);
  execute format('grant execute on function %s to service_role',r.signature);
 end loop;
end $$;

-- Reviewed public development content, no dates or invented progress.
insert into public.vector_public_roadmap(singleton,items,launch_date) values(true,$reviewed$[{"id":"vector-core","status":"testing","title":{"es":"El corazón de VECTOR","en":"The heart of VECTOR","fr":"Le cœur de VECTOR"},"description":{"es":"Una base local que reúne el estado del avión, las fases del vuelo y su diario en una misma experiencia.","en":"A local foundation bringing aircraft state, flight phases and your logbook into one experience.","fr":"Une base locale qui réunit l’état de l’aéronef, les phases du vol et votre journal dans une seule expérience."},"evidenceNote":{"es":"Implementado y probado en QA. La validación con MSFS real sigue pendiente; aún no disponible comercialmente.","en":"Implemented and tested in QA. Live MSFS validation is still pending; not commercially available yet.","fr":"Implémenté et testé en QA. La validation avec MSFS réel reste à effectuer ; pas encore disponible commercialement."}},{"id":"flight-planning","status":"testing","title":{"es":"Prepara tu próxima ruta","en":"Prepare your next route","fr":"Préparez votre prochain itinéraire"},"description":{"es":"DESPACHO reúne el plan de vuelo, la importación de SimBrief, los pesos y el combustible planificado, con acceso al OFP completo.","en":"DISPATCH brings together the flight plan, SimBrief import, weights and planned fuel, with access to the full OFP.","fr":"DISPATCH réunit le plan de vol, l’import SimBrief, les masses et le carburant prévu, avec accès à l’OFP complet."},"evidenceNote":{"es":"Implementado y probado en QA. La validación con MSFS real sigue pendiente; aún no disponible comercialmente.","en":"Implemented and tested in QA. Live MSFS validation is still pending; not commercially available yet.","fr":"Implémenté et testé en QA. La validation avec MSFS réel reste à effectuer ; pas encore disponible commercialement."}},{"id":"operational-copilot","status":"testing","title":{"es":"Un copiloto durante cada etapa","en":"A copilot for every stage","fr":"Un copilote à chaque étape"},"description":{"es":"Checklists, supervisión operacional y ayuda contextual que distinguen lo observado de lo confirmado por el piloto.","en":"Checklists, operational monitoring and contextual guidance distinguish observations from pilot confirmations.","fr":"Les checklists, le suivi opérationnel et l’aide contextuelle distinguent les observations des confirmations du pilote."},"evidenceNote":{"es":"Implementado y probado en QA. La validación con MSFS real sigue pendiente; aún no disponible comercialmente.","en":"Implemented and tested in QA. Live MSFS validation is still pending; not commercially available yet.","fr":"Implémenté et testé en QA. La validation avec MSFS réel reste à effectuer ; pas encore disponible commercialement."}},{"id":"flight-monitor","status":"testing","title":{"es":"Tu vuelo, de un vistazo","en":"Your flight at a glance","fr":"Votre vol en un coup d’œil"},"description":{"es":"MONITOR EN VIVO reúne instrumentos y estados del avión cuando el simulador entrega esos datos.","en":"LIVE MONITOR brings together instruments and aircraft states when the simulator provides those data.","fr":"LIVE MONITOR réunit les instruments et les états de l’aéronef lorsque le simulateur fournit ces données."},"evidenceNote":{"es":"Implementado y probado en QA. La validación con MSFS real sigue pendiente; aún no disponible comercialmente.","en":"Implemented and tested in QA. Live MSFS validation is still pending; not commercially available yet.","fr":"Implémenté et testé en QA. La validation avec MSFS réel reste à effectuer ; pas encore disponible commercialement."}},{"id":"vector-academy","status":"testing","title":{"es":"Aprende con VECTOR ACADEMY","en":"Learn with VECTOR ACADEMY","fr":"Apprenez avec VECTOR ACADEMY"},"description":{"es":"Tutoriales por aeronave y rutas de aprendizaje integrados con las checklists y el copiloto.","en":"Aircraft tutorials and learning paths integrated with checklists and the copilot.","fr":"Tutoriels par aéronef et parcours d’apprentissage intégrés aux checklists et au copilote."},"evidenceNote":{"es":"Implementado y probado en QA. La validación con MSFS real sigue pendiente; aún no disponible comercialmente.","en":"Implemented and tested in QA. Live MSFS validation is still pending; not commercially available yet.","fr":"Implémenté et testé en QA. La validation avec MSFS réel reste à effectuer ; pas encore disponible commercialement."}},{"id":"vector-performance","status":"testing","title":{"es":"Prepara las condiciones del vuelo","en":"Prepare for the flight conditions","fr":"Préparez les conditions du vol"},"description":{"es":"VECTOR PERFORMANCE calcula componentes de viento y conversiones. Las velocidades introducidas por el piloto se identifican como manuales.","en":"VECTOR PERFORMANCE calculates wind components and conversions. Pilot-entered speeds are identified as manual.","fr":"VECTOR PERFORMANCE calcule les composantes du vent et les conversions. Les vitesses saisies par le pilote sont identifiées comme manuelles."},"evidenceNote":{"es":"Implementado en QA; no calcula velocidades ni distancias de fabricante. Pendiente de validación real.","en":"Implemented in QA; does not calculate manufacturer speeds or distances. Live validation pending.","fr":"Implémenté en QA ; ne calcule pas les vitesses ou distances constructeur. Validation réelle à effectuer."}},{"id":"aircraft-studio","status":"testing","title":{"es":"Una cabina a tu medida","en":"A cabin of your own","fr":"Une cabine à votre mesure"},"description":{"es":"AIRCRAFT STUDIO permite editar y guardar layouts e integrarlos con CARGA Y CABINA.","en":"AIRCRAFT STUDIO lets you edit and save layouts and integrate them with LOAD & CABIN.","fr":"AIRCRAFT STUDIO permet de modifier et enregistrer des plans, puis de les intégrer à CHARGEMENT ET CABINE."},"evidenceNote":{"es":"Implementado en QA. La posición de pasajeros es ilustrativa; MSFS y GSX reales pendientes de validación.","en":"Implemented in QA. Passenger positions are illustrative; live MSFS and GSX validation pending.","fr":"Implémenté en QA. La position des passagers est illustrative ; validation réelle MSFS et GSX à effectuer."}},{"id":"career-acars-local","status":"testing","title":{"es":"Construye tu carrera local","en":"Build your local career","fr":"Construisez votre carrière locale"},"description":{"es":"CAREER LOCAL y ACARS LOCAL reúnen piloto, aerolínea personal, misiones, progreso y PIREP, con cola offline y DIARIO.","en":"CAREER LOCAL and ACARS LOCAL bring together your pilot, personal airline, missions, progress and PIREPs, with an offline queue and LOGBOOK.","fr":"CAREER LOCAL et ACARS LOCAL réunissent pilote, compagnie personnelle, missions, progression et PIREP, avec file hors ligne et JOURNAL."},"evidenceNote":{"es":"Implementados en QA. Sin sincronización online ni aerolíneas multiusuario; validación con MSFS real pendiente.","en":"Implemented in QA. No online sync or multi-user airlines; live MSFS validation pending.","fr":"Implémentés en QA. Sans synchronisation en ligne ni compagnies multiutilisateurs ; validation MSFS réelle à effectuer."}},{"id":"real-flight-validation","status":"upcoming","title":{"es":"La prueba del vuelo real","en":"The real-flight test","fr":"L’épreuve du vol réel"},"description":{"es":"Validar sesiones completas con MSFS y las aeronaves compatibles antes de confirmar disponibilidad comercial.","en":"Validate full sessions with MSFS and supported aircraft before confirming commercial availability.","fr":"Valider des sessions complètes avec MSFS et les aéronefs compatibles avant de confirmer la disponibilité commerciale."},"evidenceNote":{"es":"Trabajo futuro. Alcance y prioridades sujetos a revisión; sin fecha comprometida.","en":"Future work. Scope and priorities remain under review; no committed date.","fr":"Travail futur. Périmètre et priorités à réexaminer ; aucune date engagée."}},{"id":"vector-live-panel","status":"study","title":{"es":"VECTOR LIVE PANEL","en":"VECTOR LIVE PANEL","fr":"VECTOR LIVE PANEL"},"description":{"es":"Evaluar nuevas formas de consultar la operación en paneles complementarios. La experiencia final aún está por definir.","en":"Explore new ways to follow operations in companion panels. The final experience is still to be defined.","fr":"Explorer de nouvelles façons de suivre les opérations dans des panneaux complémentaires. L’expérience finale reste à définir."},"evidenceNote":{"es":"Trabajo futuro. Alcance y prioridades sujetos a revisión; sin fecha comprometida.","en":"Future work. Scope and priorities remain under review; no committed date.","fr":"Travail futur. Périmètre et priorités à réexaminer ; aucune date engagée."}},{"id":"live-flight-map","status":"study","title":{"es":"LIVE FLIGHT MAP","en":"LIVE FLIGHT MAP","fr":"LIVE FLIGHT MAP"},"description":{"es":"Estudiar una vista de seguimiento del vuelo, diferenciada del mapa del plan que ya existe en DESPACHO.","en":"Study a flight-tracking view, separate from the existing planned-route map in DISPATCH.","fr":"Étudier une vue de suivi du vol, distincte de la carte de l’itinéraire prévu déjà présente dans DISPATCH."},"evidenceNote":{"es":"Trabajo futuro. Alcance y prioridades sujetos a revisión; sin fecha comprometida.","en":"Future work. Scope and priorities remain under review; no committed date.","fr":"Travail futur. Périmètre et priorités à réexaminer ; aucune date engagée."}},{"id":"landing-analysis","status":"testing","title":{"es":"Aprende de cada aterrizaje","en":"Learn from every landing","fr":"Apprenez de chaque atterrissage"},"description":{"es":"LANDING LAB permite revisar la aproximación, los contactos y el replay, con la procedencia y los límites de cada dato.","en":"LANDING LAB lets you review the approach, touchdown sequence and replay, with each data source and its limits identified.","fr":"LANDING LAB permet de revoir l’approche, les contacts et le replay, avec la provenance et les limites de chaque donnée."},"evidenceNote":{"es":"Implementado en QA. Captura avanzada y correspondencia de sensores por aeronave pendientes de validación real.","en":"Implemented in QA. Advanced recording and aircraft-specific sensor mapping await live validation.","fr":"Implémenté en QA. L’enregistrement avancé et la correspondance des capteurs par aéronef attendent la validation réelle."}},{"id":"commercial-editions","status":"development","title":{"es":"Licencias y ediciones","en":"Licensing and editions","fr":"Licences et éditions"},"description":{"es":"Preparar TAKEOFF, HORIZON y COMMANDER, la edición completa, junto al futuro sistema seguro de cuentas y licencias.","en":"Prepare TAKEOFF, HORIZON and COMMANDER, the complete edition, alongside a future secure account and licensing system.","fr":"Préparer TAKEOFF, HORIZON et COMMANDER, l’édition complète, ainsi qu’un futur système sécurisé de comptes et licences."},"evidenceNote":{"es":"Preparación técnica interna. Contrato de activación pendiente; no hay precios, ventas ni instalador público.","en":"Internal technical preparation. Activation contract pending; no prices, sales or public installer.","fr":"Préparation technique interne. Contrat d’activation en attente ; aucun prix, vente ou installateur public."}},{"id":"stability-validation","status":"upcoming","title":{"es":"Estabilidad y compatibilidad","en":"Stability and compatibility","fr":"Stabilité et compatibilité"},"description":{"es":"Revisar rendimiento, recuperación y compatibilidad a lo largo de vuelos completos y diferentes equipos.","en":"Review performance, recovery and compatibility throughout complete flights and across different computers.","fr":"Examiner les performances, la reprise et la compatibilité sur des vols complets et différents ordinateurs."},"evidenceNote":{"es":"Trabajo futuro. Alcance y prioridades sujetos a revisión; sin fecha comprometida.","en":"Future work. Scope and priorities remain under review; no committed date.","fr":"Travail futur. Périmètre et priorités à réexaminer ; aucune date engagée."}},{"id":"commercial-launch","status":"upcoming","title":{"es":"El primer despegue comercial","en":"The first commercial takeoff","fr":"Le premier décollage commercial"},"description":{"es":"Anunciaremos la apertura cuando finalicen las pruebas de calidad y compatibilidad. Fecha de lanzamiento por confirmar.","en":"We will announce availability when quality and compatibility testing is complete. Launch date to be confirmed.","fr":"Nous annoncerons l’ouverture lorsque les tests de qualité et de compatibilité seront terminés. Date de lancement à confirmer."},"evidenceNote":{"es":"No abierto. No se aceptan compras ni se distribuye la aplicación.","en":"Not open. Purchases are not accepted and the application is not distributed.","fr":"Non ouvert. Aucun achat accepté et aucune distribution de l’application."}},{"id":"community-future","status":"study","title":{"es":"El futuro, con los pilotos","en":"The future, with pilots","fr":"L’avenir, avec les pilotes"},"description":{"es":"Propuestas de Community Lab y una futura plataforma CAREER ONLINE. Las prioridades podrán evolucionar con la comunidad.","en":"Community Lab ideas and a future CAREER ONLINE platform. Priorities can evolve with the community.","fr":"Les idées du Community Lab et une future plateforme CAREER ONLINE. Les priorités pourront évoluer avec la communauté."},"evidenceNote":{"es":"CAREER ONLINE y las aerolíneas multiusuario no están desarrolladas. No se promete su inclusión en una licencia local.","en":"CAREER ONLINE and multi-user airlines are not developed. Inclusion in a local licence is not promised.","fr":"CAREER ONLINE et les compagnies multiutilisateurs ne sont pas développés. Leur inclusion dans une licence locale n’est pas promise."}}]$reviewed$::jsonb,null);
