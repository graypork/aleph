-- This reconciliation was applied to the live Supabase project during T07 implementation.
revoke all on table public.pds_experiments, public.pds_daily_observations, public.pds_rule_changes from anon;

create or replace view public.pds_plan_review
with (security_invoker = true)
as
select
  p.id as plan_id,
  (select count(*)::integer from public.tasks t where t.plan_id=p.id and t.deleted_at is null) as total_tasks,
  (select count(*)::integer from public.tasks t where t.plan_id=p.id and t.deleted_at is null and t.status='done') as completed_tasks,
  (select count(*)::integer from public.tasks t where t.plan_id=p.id and t.deleted_at is null and t.status<>'done' and t.due_date is not null and t.due_date < (now() at time zone 'Asia/Seoul')::date) as delayed_tasks,
  (select count(distinct t.id)::integer from public.tasks t join public.work_logs w on w.task_id=t.id where t.plan_id=p.id and t.deleted_at is null and nullif(trim(w.blocker_reason),'') is not null) as blocked_tasks,
  (select coalesce(sum(t.estimated_minutes),0)::integer from public.tasks t where t.plan_id=p.id and t.deleted_at is null) as estimated_minutes,
  (select coalesce(sum(w.actual_minutes),0)::integer from public.tasks t join public.work_logs w on w.task_id=t.id where t.plan_id=p.id and t.deleted_at is null) as actual_minutes,
  (select coalesce(sum(w.actual_minutes),0)::integer from public.tasks t join public.work_logs w on w.task_id=t.id where t.plan_id=p.id and t.deleted_at is null)
    - (select coalesce(sum(t.estimated_minutes),0)::integer from public.tasks t where t.plan_id=p.id and t.deleted_at is null) as time_difference_minutes
from public.plans p;

revoke all on table public.pds_plan_review from anon;
grant select on table public.pds_plan_review to authenticated;
