-- T07 PlanDoSee Diary 2: authentication ownership and five-day experiment schema.
-- The live database received these changes while T07 was prepared; this file records the reproducible target schema.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter table public.plans
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

create or replace function private.pds_session_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.sessions s
    where s.user_id = (select auth.uid())
      and s.id::text = coalesce((select auth.jwt() ->> 'session_id'), '')
  );
$$;
revoke all on function private.pds_session_active() from public, anon;
grant execute on function private.pds_session_active() to authenticated;

alter table public.plans enable row level security;
alter table public.plan_revisions enable row level security;
alter table public.tasks enable row level security;
alter table public.work_logs enable row level security;
alter table public.completion_events enable row level security;
alter table public.plan_reviews enable row level security;

revoke all on table public.plans, public.plan_revisions, public.tasks, public.work_logs, public.completion_events, public.plan_reviews from anon;
grant select, insert, update, delete on table public.plans to authenticated;
grant select, insert on table public.plan_revisions to authenticated;
grant select, insert, update, delete on table public.tasks, public.work_logs, public.plan_reviews to authenticated;
grant select, insert, delete on table public.completion_events to authenticated;

create policy pds_plans_select_own on public.plans for select to authenticated
using ((select private.pds_session_active()) and owner_id = (select auth.uid()));
create policy pds_plans_insert_own on public.plans for insert to authenticated
with check ((select private.pds_session_active()) and owner_id = (select auth.uid()));
create policy pds_plans_update_own on public.plans for update to authenticated
using ((select private.pds_session_active()) and owner_id = (select auth.uid()))
with check ((select private.pds_session_active()) and owner_id = (select auth.uid()));
create policy pds_plans_delete_own on public.plans for delete to authenticated
using ((select private.pds_session_active()) and owner_id = (select auth.uid()));

create policy pds_plan_revisions_select_own on public.plan_revisions for select to authenticated
using ((select private.pds_session_active()) and exists (select 1 from public.plans p where p.id=plan_revisions.plan_id and p.owner_id=(select auth.uid())));
create policy pds_plan_revisions_insert_own on public.plan_revisions for insert to authenticated
with check ((select private.pds_session_active()) and exists (select 1 from public.plans p where p.id=plan_revisions.plan_id and p.owner_id=(select auth.uid())));

create policy pds_tasks_select_own on public.tasks for select to authenticated
using ((select private.pds_session_active()) and exists (select 1 from public.plans p where p.id=tasks.plan_id and p.owner_id=(select auth.uid())));
create policy pds_tasks_insert_own on public.tasks for insert to authenticated
with check ((select private.pds_session_active()) and exists (select 1 from public.plans p where p.id=tasks.plan_id and p.owner_id=(select auth.uid())));
create policy pds_tasks_update_own on public.tasks for update to authenticated
using ((select private.pds_session_active()) and exists (select 1 from public.plans p where p.id=tasks.plan_id and p.owner_id=(select auth.uid())))
with check ((select private.pds_session_active()) and exists (select 1 from public.plans p where p.id=tasks.plan_id and p.owner_id=(select auth.uid())));
create policy pds_tasks_delete_own on public.tasks for delete to authenticated
using ((select private.pds_session_active()) and exists (select 1 from public.plans p where p.id=tasks.plan_id and p.owner_id=(select auth.uid())));

create policy pds_work_logs_select_own on public.work_logs for select to authenticated
using ((select private.pds_session_active()) and exists (select 1 from public.tasks t join public.plans p on p.id=t.plan_id where t.id=work_logs.task_id and p.owner_id=(select auth.uid())));
create policy pds_work_logs_insert_own on public.work_logs for insert to authenticated
with check ((select private.pds_session_active()) and exists (select 1 from public.tasks t join public.plans p on p.id=t.plan_id where t.id=work_logs.task_id and p.owner_id=(select auth.uid())));
create policy pds_work_logs_update_own on public.work_logs for update to authenticated
using ((select private.pds_session_active()) and exists (select 1 from public.tasks t join public.plans p on p.id=t.plan_id where t.id=work_logs.task_id and p.owner_id=(select auth.uid())))
with check ((select private.pds_session_active()) and exists (select 1 from public.tasks t join public.plans p on p.id=t.plan_id where t.id=work_logs.task_id and p.owner_id=(select auth.uid())));
create policy pds_work_logs_delete_own on public.work_logs for delete to authenticated
using ((select private.pds_session_active()) and exists (select 1 from public.tasks t join public.plans p on p.id=t.plan_id where t.id=work_logs.task_id and p.owner_id=(select auth.uid())));

create policy pds_completion_events_select_own on public.completion_events for select to authenticated
using ((select private.pds_session_active()) and exists (select 1 from public.tasks t join public.plans p on p.id=t.plan_id where t.id=completion_events.task_id and p.owner_id=(select auth.uid())));
create policy pds_completion_events_insert_own on public.completion_events for insert to authenticated
with check ((select private.pds_session_active()) and exists (select 1 from public.tasks t join public.plans p on p.id=t.plan_id where t.id=completion_events.task_id and p.owner_id=(select auth.uid())));
create policy pds_completion_events_delete_own on public.completion_events for delete to authenticated
using ((select private.pds_session_active()) and exists (select 1 from public.tasks t join public.plans p on p.id=t.plan_id where t.id=completion_events.task_id and p.owner_id=(select auth.uid())));

create policy pds_plan_reviews_select_own on public.plan_reviews for select to authenticated
using ((select private.pds_session_active()) and exists (select 1 from public.plans p where p.id=plan_reviews.plan_id and p.owner_id=(select auth.uid())));
create policy pds_plan_reviews_insert_own on public.plan_reviews for insert to authenticated
with check ((select private.pds_session_active()) and exists (select 1 from public.plans p where p.id=plan_reviews.plan_id and p.owner_id=(select auth.uid())) and (carried_to_plan_id is null or exists (select 1 from public.plans p2 where p2.id=plan_reviews.carried_to_plan_id and p2.owner_id=(select auth.uid()))));
create policy pds_plan_reviews_update_own on public.plan_reviews for update to authenticated
using ((select private.pds_session_active()) and exists (select 1 from public.plans p where p.id=plan_reviews.plan_id and p.owner_id=(select auth.uid())))
with check ((select private.pds_session_active()) and exists (select 1 from public.plans p where p.id=plan_reviews.plan_id and p.owner_id=(select auth.uid())) and (carried_to_plan_id is null or exists (select 1 from public.plans p2 where p2.id=plan_reviews.carried_to_plan_id and p2.owner_id=(select auth.uid()))));
create policy pds_plan_reviews_delete_own on public.plan_reviews for delete to authenticated
using ((select private.pds_session_active()) and exists (select 1 from public.plans p where p.id=plan_reviews.plan_id and p.owner_id=(select auth.uid())));

create table if not exists public.pds_experiments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  question text not null, metric_name text not null, unit text not null, calculation_rule text not null,
  missing_value_rule text not null, duplicate_value_rule text not null, outlier_rule text not null, rounding_rule text not null,
  week_start_day text not null default 'Monday', original_planning_rule text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.pds_daily_observations (
  id uuid primary key default gen_random_uuid(), experiment_id uuid not null references public.pds_experiments(id) on delete cascade,
  record_date date not null, estimated_minutes integer not null check (estimated_minutes>0), actual_minutes integer not null check (actual_minutes>=0),
  metric_value numeric not null check (metric_value>=0), note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(experiment_id,record_date)
);
create table if not exists public.pds_rule_changes (
  id uuid primary key default gen_random_uuid(), experiment_id uuid not null unique references public.pds_experiments(id) on delete cascade,
  changed_at timestamptz not null default now(), before_rule text not null, after_rule text not null, reason text not null,
  day1_observation_id uuid not null references public.pds_daily_observations(id) on delete restrict,
  day2_observation_id uuid not null references public.pds_daily_observations(id) on delete restrict,
  created_at timestamptz not null default now(), check(day1_observation_id<>day2_observation_id)
);
alter table public.pds_experiments enable row level security;
alter table public.pds_daily_observations enable row level security;
alter table public.pds_rule_changes enable row level security;
revoke all on table public.pds_experiments, public.pds_daily_observations, public.pds_rule_changes from anon;
grant select,insert,update,delete on table public.pds_experiments, public.pds_daily_observations, public.pds_rule_changes to authenticated;
create policy pds_experiments_all_own on public.pds_experiments for all to authenticated using ((select private.pds_session_active()) and owner_id=(select auth.uid())) with check ((select private.pds_session_active()) and owner_id=(select auth.uid()));
create policy pds_daily_observations_all_own on public.pds_daily_observations for all to authenticated using ((select private.pds_session_active()) and exists(select 1 from public.pds_experiments e where e.id=pds_daily_observations.experiment_id and e.owner_id=(select auth.uid()))) with check ((select private.pds_session_active()) and exists(select 1 from public.pds_experiments e where e.id=pds_daily_observations.experiment_id and e.owner_id=(select auth.uid())));
create policy pds_rule_changes_all_own on public.pds_rule_changes for all to authenticated using ((select private.pds_session_active()) and exists(select 1 from public.pds_experiments e where e.id=pds_rule_changes.experiment_id and e.owner_id=(select auth.uid()))) with check ((select private.pds_session_active()) and exists(select 1 from public.pds_experiments e where e.id=pds_rule_changes.experiment_id and e.owner_id=(select auth.uid())));

create or replace view public.pds_plan_review with (security_invoker=true) as
select p.id as plan_id,
 (select count(*)::integer from public.tasks t where t.plan_id=p.id and t.deleted_at is null) total_tasks,
 (select count(*)::integer from public.tasks t where t.plan_id=p.id and t.deleted_at is null and t.status='done') completed_tasks,
 (select count(*)::integer from public.tasks t where t.plan_id=p.id and t.deleted_at is null and t.status<>'done' and t.due_date is not null and t.due_date<(now() at time zone 'Asia/Seoul')::date) delayed_tasks,
 (select count(distinct t.id)::integer from public.tasks t join public.work_logs w on w.task_id=t.id where t.plan_id=p.id and t.deleted_at is null and nullif(trim(w.blocker_reason),'') is not null) blocked_tasks,
 (select coalesce(sum(t.estimated_minutes),0)::integer from public.tasks t where t.plan_id=p.id and t.deleted_at is null) estimated_minutes,
 (select coalesce(sum(w.actual_minutes),0)::integer from public.tasks t join public.work_logs w on w.task_id=t.id where t.plan_id=p.id and t.deleted_at is null) actual_minutes,
 (select coalesce(sum(w.actual_minutes),0)::integer from public.tasks t join public.work_logs w on w.task_id=t.id where t.plan_id=p.id and t.deleted_at is null)-(select coalesce(sum(t.estimated_minutes),0)::integer from public.tasks t where t.plan_id=p.id and t.deleted_at is null) time_difference_minutes
from public.plans p;
revoke all on table public.pds_plan_review from anon;
grant select on table public.pds_plan_review to authenticated;
