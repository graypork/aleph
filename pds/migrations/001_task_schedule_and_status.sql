-- Applied to the PlanDoSee Supabase project on 2026-10-08.
-- Adds task date ranges, explicit execution states, and editable blocker reasons.

alter table public.tasks
  add column if not exists start_date date,
  add column if not exists blocker_reason text;

update public.tasks t
set start_date = p.start_date
from public.plans p
where t.plan_id = p.id
  and t.start_date is null;

alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks
  add constraint tasks_status_check
  check (status = any (array['todo'::text,'doing'::text,'blocked'::text,'done'::text]));

alter table public.tasks drop constraint if exists tasks_date_range_check;
alter table public.tasks
  add constraint tasks_date_range_check
  check (start_date is null or due_date is null or start_date <= due_date);

create or replace view public.pds_plan_review
with (security_invoker = true)
as
select
  p.id as plan_id,
  (select count(*)::integer from public.tasks t where t.plan_id=p.id and t.deleted_at is null) as total_tasks,
  (select count(*)::integer from public.tasks t where t.plan_id=p.id and t.deleted_at is null and t.status='done') as completed_tasks,
  (select count(*)::integer from public.tasks t where t.plan_id=p.id and t.deleted_at is null and t.status<>'done' and t.due_date is not null and t.due_date < (now() at time zone 'Asia/Seoul')::date) as delayed_tasks,
  (select count(*)::integer from public.tasks t where t.plan_id=p.id and t.deleted_at is null and t.status='blocked') as blocked_tasks,
  (select coalesce(sum(t.estimated_minutes),0)::integer from public.tasks t where t.plan_id=p.id and t.deleted_at is null) as estimated_minutes,
  (select coalesce(sum(w.actual_minutes),0)::integer from public.tasks t join public.work_logs w on w.task_id=t.id where t.plan_id=p.id and t.deleted_at is null) as actual_minutes,
  (select coalesce(sum(w.actual_minutes),0)::integer from public.tasks t join public.work_logs w on w.task_id=t.id where t.plan_id=p.id and t.deleted_at is null)
  - (select coalesce(sum(t.estimated_minutes),0)::integer from public.tasks t where t.plan_id=p.id and t.deleted_at is null) as time_difference_minutes
from public.plans p;
