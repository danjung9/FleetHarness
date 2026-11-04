-- Browser access is through the authenticated HTTP API. RLS denies direct access.
create table public.fleet_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{"backend":"pi","provider":"openai","model":"","rememberKey":true}',
  encrypted_key text, model_ids jsonb not null default '[]', last_checked_at timestamptz, catalog jsonb
);
create table public.fleet_projects (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id)
);
create index fleet_projects_owner on public.fleet_projects(user_id,updated_at desc);
create table public.fleet_runs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null, status text not null check (status in ('queued','running','pausing','paused','failed','review','approved','delivered')),
  epoch integer not null default 1 check (epoch>0), state jsonb not null default '{"metadata":{}}', model text not null,
  model_requests integer not null default 0 check (model_requests>=0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(project_id,user_id) references public.fleet_projects(id,user_id) on delete cascade, unique(id,user_id)
);
create unique index fleet_one_active_account on public.fleet_runs(user_id) where status in ('queued','running','pausing');
create index fleet_runs_project on public.fleet_runs(project_id,created_at desc);
create table public.fleet_shares (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'), user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null, run_id uuid not null, manifest jsonb not null, title text not null, created_at timestamptz not null default now(),
  foreign key(project_id,user_id) references public.fleet_projects(id,user_id) on delete cascade,
  foreign key(run_id,user_id) references public.fleet_runs(id,user_id) on delete cascade
);
alter table public.fleet_accounts enable row level security;
alter table public.fleet_projects enable row level security;
alter table public.fleet_runs enable row level security;
alter table public.fleet_shares enable row level security;
revoke all on public.fleet_accounts,public.fleet_projects,public.fleet_runs,public.fleet_shares from anon,authenticated;
grant all on public.fleet_accounts,public.fleet_projects,public.fleet_runs,public.fleet_shares to service_role;
insert into storage.buckets(id,name,public,file_size_limit) values('fleet-artifacts','fleet-artifacts',false,10485760)
on conflict(id) do update set public=false,file_size_limit=10485760;
-- No storage.objects client policy: all reads are authorized and checked by API.

create function public.fleet_save_catalog(p_user uuid,p_catalog jsonb) returns boolean
language plpgsql set search_path=public,pg_temp as $$
begin
  insert into fleet_accounts(user_id,catalog) values(p_user,p_catalog)
  on conflict(user_id) do update set catalog=excluded.catalog;
  return true;
end $$;

create function public.fleet_save_settings(p_user uuid,p_settings jsonb,p_key text,p_models jsonb) returns boolean
language plpgsql set search_path=public,pg_temp as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
  if exists(select 1 from fleet_runs where user_id=p_user and status in ('queued','running','pausing')) then
    raise exception using errcode='FH409',message='Active build';
  end if;
  insert into fleet_accounts(user_id,settings,encrypted_key,model_ids,last_checked_at)
  values(p_user,p_settings,p_key,p_models,case when p_key is null then null else now() end)
  on conflict(user_id) do update set settings=excluded.settings,encrypted_key=excluded.encrypted_key,
    model_ids=excluded.model_ids,last_checked_at=excluded.last_checked_at;
  return true;
end $$;

create function public.fleet_update_project(p_user uuid,p_project uuid,p_input jsonb) returns jsonb
language plpgsql set search_path=public,pg_temp as $$
declare p fleet_projects;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
  select * into p from fleet_projects where id=p_project and user_id=p_user for update;
  if not found then raise exception using errcode='P0002',message='Project not found'; end if;
  if exists(select 1 from fleet_runs where project_id=p_project and status in ('queued','running','pausing')) then
    raise exception using errcode='FH409',message='Active build';
  end if;
  update fleet_projects set data=(data-array['runId','report','approvedAt','exportedTo','error','phasePlan','globalTools','systemDesign','checkpointStage','qualityVersion','sourceChallenge','challengeId'])
    ||p_input||jsonb_build_object('status','draft','canResume',false,'feedback','','logs','[]'::jsonb,
      'stages',(select jsonb_agg(s||'{"status":"queued"}'::jsonb) from jsonb_array_elements(data->'stages') s)),
    updated_at=now() where id=p_project returning * into p;
  return to_jsonb(p);
end $$;

create function public.fleet_claim_run(p_user uuid,p_project uuid,p_mode text,p_model text) returns jsonb
language plpgsql set search_path=public,pg_temp as $$
declare p fleet_projects; r fleet_runs; account fleet_accounts; stages jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
  select * into p from fleet_projects where id=p_project and user_id=p_user for update;
  if not found then raise exception using errcode='P0002',message='Project not found'; end if;
  if p_mode not in ('start','resume') then raise exception using errcode='FH400',message='Invalid mode'; end if;
  select * into account from fleet_accounts where user_id=p_user;
  if account.encrypted_key is null or account.settings->>'model' is distinct from p_model or not(account.model_ids ? p_model) then
    raise exception using errcode='FH400',message='Connect model first';
  end if;
  if exists(select 1 from fleet_runs where user_id=p_user and status in ('queued','running','pausing')) then
    raise exception using errcode='FH429',message='Active build';
  end if;
  if p_mode='resume' then
    select * into r from fleet_runs where id=(p.data->>'runId')::uuid and user_id=p_user and project_id=p_project for update;
    if not found or r.status not in ('paused','failed') or r.model is distinct from p_model then
      raise exception using errcode='FH400',message='Run cannot be resumed';
    end if;
    update fleet_runs set epoch=epoch+1,status='queued',state=state-array['workflowId','sandboxId','commandId'],updated_at=now()
      where id=r.id returning * into r;
  else
    insert into fleet_runs(user_id,project_id,status,model) values(p_user,p_project,'queued',p_model) returning * into r;
  end if;
  select jsonb_agg(s||'{"status":"queued"}'::jsonb) into stages from jsonb_array_elements(p.data->'stages') s;
  update fleet_projects set data=(data-array['report','approvedAt','exportedTo','error'])||jsonb_build_object(
    'runId',r.id,'model',p_model,'backend','pi','qualityVersion',1,'status','running','canResume',false,'feedback','',
    'logs',case when p_mode='start' then '[]'::jsonb else data->'logs' end,
    'stages',case when p_mode='start' then stages else data->'stages' end,
    'checkpointStage',r.state->'checkpointStage'),updated_at=now() where id=p_project returning * into p;
  return jsonb_build_object('run',to_jsonb(r),'project',to_jsonb(p));
end $$;

create function public.fleet_patch_run(p_run uuid,p_epoch integer,p_patch jsonb,p_project_patch jsonb) returns jsonb
language plpgsql set search_path=public,pg_temp as $$
declare r fleet_runs; owner uuid; next_status text; patch jsonb;
begin
  select user_id into owner from fleet_runs where id=p_run;
  if not found then return null; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner::text,0));
  select * into r from fleet_runs where id=p_run for update;
  if r.epoch<>p_epoch or r.status not in ('queued','running','pausing') then return null; end if;
  if not exists(select 1 from fleet_projects where id=r.project_id and data->>'runId'=p_run::text) then return null; end if;
  next_status:=coalesce(p_patch->>'status',r.status);
  if next_status not in ('queued','running','pausing','paused','failed','review') then
    raise exception using errcode='FH400',message='Invalid worker state';
  end if;
  -- Preserve a pause requested between a worker read and checkpoint write.
  if r.status='pausing' and next_status in ('queued','running') then next_status:='pausing'; end if;
  patch:=p_project_patch-array['id','createdAt','updatedAt','runId','approvedAt','exportedTo','title','description','criteria','resources','links','challengeId','sourceChallenge'];
  patch:=patch||jsonb_build_object('status',case when next_status='queued' then 'running' else next_status end,
    'canResume',case when next_status in ('paused','failed') then coalesce((p_project_patch->>'canResume')::boolean,coalesce(p_patch->>'checkpointStage',r.state->>'checkpointStage') is not null) else false end);
  update fleet_runs set status=next_status,state=state||(p_patch-array['id','userId','projectId','epoch','status','model','createdAt','updatedAt','modelRequests']),updated_at=now()
    where id=p_run returning * into r;
  update fleet_projects set data=data||patch,updated_at=now() where id=r.project_id;
  return to_jsonb(r);
end $$;

create function public.fleet_pause_run(p_user uuid,p_project uuid) returns jsonb
language plpgsql set search_path=public,pg_temp as $$
declare p fleet_projects; r fleet_runs;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
  select * into p from fleet_projects where id=p_project and user_id=p_user for update;
  if not found then raise exception using errcode='P0002',message='Project not found'; end if;
  select * into r from fleet_runs where id=(p.data->>'runId')::uuid and user_id=p_user and project_id=p_project for update;
  if not found then raise exception using errcode='P0002',message='Run not found'; end if;
  if r.status in ('pausing','paused') then return to_jsonb(r); end if;
  if r.status not in ('queued','running') then raise exception using errcode='FH409',message='Build is not active'; end if;
  update fleet_runs set status='pausing',updated_at=now() where id=r.id returning * into r;
  update fleet_projects set data=data||'{"status":"pausing","canResume":false}'::jsonb,updated_at=now() where id=p_project;
  return to_jsonb(r);
end $$;

create function public.fleet_claim_model_request(p_run uuid,p_epoch integer,p_max integer default 120) returns boolean
language plpgsql set search_path=public,pg_temp as $$
begin
  update fleet_runs set model_requests=model_requests+1
    where id=p_run and epoch=p_epoch and status in ('running','pausing') and model_requests<least(120,greatest(1,p_max));
  return found;
end $$;

create function public.fleet_approve_project(p_user uuid,p_project uuid,p_run uuid,p_hash text,p_feedback text) returns jsonb
language plpgsql set search_path=public,pg_temp as $$
declare p fleet_projects; r fleet_runs; report jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
  select * into p from fleet_projects where id=p_project and user_id=p_user for update;
  if not found then raise exception using errcode='P0002',message='Project not found'; end if;
  select * into r from fleet_runs where id=p_run and user_id=p_user and project_id=p_project for update;
  report:=p.data->'report';
  if not found or p.data->>'runId' is distinct from p_run::text or r.status<>'review'
    or r.state->'manifest'->>'sourceHash' is distinct from p_hash or report->>'sourceHash' is distinct from p_hash
    or coalesce((report->>'exitCode')::int,-1)<>0 or coalesce((report->>'passed')::int,0)<=0
    or (report->>'total')::int is distinct from (report->>'passed')::int
    or coalesce((report->>'failed')::int,-1)<>0 or coalesce((report->>'skipped')::int,-1)<>0
    or (p.data->>'qualityVersion'='1' and report->'quality'->>'status' is distinct from 'passed') then
    raise exception using errcode='FH409',message='Version is not verified';
  end if;
  update fleet_runs set status='approved',state=state||jsonb_build_object('approvedHash',p_hash),updated_at=now() where id=p_run;
  update fleet_projects set data=data||jsonb_build_object('status','approved','approvedAt',now(),'feedback',left(p_feedback,8000),'canResume',false),updated_at=now()
    where id=p_project returning * into p;
  return to_jsonb(p);
end $$;

create function public.fleet_mark_delivered(p_user uuid,p_project uuid,p_run uuid,p_hash text) returns boolean
language plpgsql set search_path=public,pg_temp as $$
declare p fleet_projects; r fleet_runs;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
  select * into p from fleet_projects where id=p_project and user_id=p_user for update;
  if not found then raise exception using errcode='P0002',message='Project not found'; end if;
  select * into r from fleet_runs where id=p_run and user_id=p_user and project_id=p_project for update;
  if not found or p.data->>'runId' is distinct from p_run::text or r.status not in ('approved','delivered')
    or r.state->>'approvedHash' is distinct from p_hash or r.state->'manifest'->>'sourceHash' is distinct from p_hash then
    raise exception using errcode='FH403',message='Approval required';
  end if;
  update fleet_runs set status='delivered',updated_at=now() where id=p_run;
  update fleet_projects set data=data||'{"status":"delivered"}'::jsonb,updated_at=now() where id=p_project;
  return true;
end $$;

create function public.fleet_create_share(p_user uuid,p_project uuid,p_token_hash text) returns boolean
language plpgsql set search_path=public,pg_temp as $$
declare p fleet_projects; r fleet_runs;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
  select * into p from fleet_projects where id=p_project and user_id=p_user for update;
  if not found then raise exception using errcode='P0002',message='Project not found'; end if;
  select * into r from fleet_runs where id=(p.data->>'runId')::uuid and user_id=p_user and project_id=p_project for update;
  if not found or r.status not in ('approved','delivered') or r.state->'manifest'->>'sourceHash' is distinct from r.state->>'approvedHash' then
    raise exception using errcode='FH403',message='Approval required';
  end if;
  insert into fleet_shares(token_hash,user_id,project_id,run_id,manifest,title)
    values(p_token_hash,p_user,p_project,r.id,r.state->'manifest',p.data->>'title');
  return true;
end $$;

create function public.fleet_get_share(p_token_hash text) returns jsonb
language sql stable set search_path=public,pg_temp as $$
  select jsonb_build_object('run',to_jsonb(r),'manifest',s.manifest,'title',s.title)
  from fleet_shares s join fleet_runs r on r.id=s.run_id and r.user_id=s.user_id where s.token_hash=p_token_hash
$$;

-- PostgreSQL grants EXECUTE to PUBLIC by default. Keep server RPCs private.
revoke all on function public.fleet_save_catalog(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.fleet_save_settings(uuid,jsonb,text,jsonb) from public,anon,authenticated;
revoke all on function public.fleet_update_project(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.fleet_claim_run(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.fleet_patch_run(uuid,integer,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.fleet_pause_run(uuid,uuid) from public,anon,authenticated;
revoke all on function public.fleet_claim_model_request(uuid,integer,integer) from public,anon,authenticated;
revoke all on function public.fleet_approve_project(uuid,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.fleet_mark_delivered(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.fleet_create_share(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.fleet_get_share(text) from public,anon,authenticated;
grant execute on function public.fleet_save_catalog(uuid,jsonb),public.fleet_save_settings(uuid,jsonb,text,jsonb),
  public.fleet_update_project(uuid,uuid,jsonb),public.fleet_claim_run(uuid,uuid,text,text),
  public.fleet_patch_run(uuid,integer,jsonb,jsonb),public.fleet_pause_run(uuid,uuid),
  public.fleet_claim_model_request(uuid,integer,integer),public.fleet_approve_project(uuid,uuid,uuid,text,text),
  public.fleet_mark_delivered(uuid,uuid,uuid,text),public.fleet_create_share(uuid,uuid,text),public.fleet_get_share(text)
to service_role;
