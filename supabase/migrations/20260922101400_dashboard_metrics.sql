-- WalletStore — 15. Dashboard metrics
--
-- Single round-trip aggregate for the org dashboard (section 17 of the
-- product spec). Real computed values only — never used to fabricate
-- numbers; callers render an empty state when everything is zero.

create or replace function public.org_dashboard_metrics(
  p_organization_id uuid,
  p_period_start timestamptz,
  p_period_end timestamptz
)
returns table (
  customers_total bigint,
  customers_new bigint,
  customers_active bigint,
  customers_inactive_30 bigint,
  customers_inactive_60 bigint,
  transactions_count bigint,
  revenue_cents bigint,
  stamps_awarded bigint,
  points_awarded numeric,
  rewards_unlocked bigint,
  rewards_redeemed bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from customers c where c.organization_id = p_organization_id),
    (select count(*) from customers c
      where c.organization_id = p_organization_id
        and c.created_at between p_period_start and p_period_end),
    (select count(distinct e.customer_id) from customer_program_enrollments e
      where e.organization_id = p_organization_id
        and e.last_visit_at between p_period_start and p_period_end),
    (select count(distinct e.customer_id) from customer_program_enrollments e
      where e.organization_id = p_organization_id
        and e.last_visit_at < now() - interval '30 days'),
    (select count(distinct e.customer_id) from customer_program_enrollments e
      where e.organization_id = p_organization_id
        and e.last_visit_at < now() - interval '60 days'),
    (select count(*) from purchase_transactions t
      where t.organization_id = p_organization_id and t.status = 'COMPLETED'
        and t.created_at between p_period_start and p_period_end),
    (select coalesce(sum(t.amount_cents), 0) from purchase_transactions t
      where t.organization_id = p_organization_id and t.status = 'COMPLETED'
        and t.created_at between p_period_start and p_period_end),
    (select coalesce(sum(l.stamps_delta), 0) from loyalty_ledger l
      where l.organization_id = p_organization_id and l.stamps_delta > 0
        and l.created_at between p_period_start and p_period_end),
    (select coalesce(sum(l.points_delta), 0) from loyalty_ledger l
      where l.organization_id = p_organization_id and l.points_delta > 0
        and l.created_at between p_period_start and p_period_end),
    (select count(*) from customer_rewards r
      where r.organization_id = p_organization_id
        and r.unlocked_at between p_period_start and p_period_end),
    (select count(*) from customer_rewards r
      where r.organization_id = p_organization_id and r.redeemed_at is not null
        and r.redeemed_at between p_period_start and p_period_end)
  where public.has_org_role(p_organization_id, array[
    'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'BRANCH_MANAGER'
  ]::member_role[]);
$$;

revoke all on function public.org_dashboard_metrics from public, anon;
grant execute on function public.org_dashboard_metrics to authenticated;

-- Daily transaction volume for the dashboard's activity chart.
create or replace function public.org_daily_transactions(
  p_organization_id uuid,
  p_period_start timestamptz,
  p_period_end timestamptz
)
returns table (day date, transactions_count bigint, revenue_cents bigint)
language sql
stable
security definer
set search_path = public
as $$
  select date_trunc('day', t.created_at)::date as day, count(*), coalesce(sum(t.amount_cents), 0)
  from purchase_transactions t
  where t.organization_id = p_organization_id
    and t.status = 'COMPLETED'
    and t.created_at between p_period_start and p_period_end
    and public.has_org_role(p_organization_id, array[
      'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'BRANCH_MANAGER'
    ]::member_role[])
  group by 1
  order by 1;
$$;

revoke all on function public.org_daily_transactions from public, anon;
grant execute on function public.org_daily_transactions to authenticated;
