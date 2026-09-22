-- WalletStore — 12. Built-in computed segments
--
-- Per architecture decision, the standard segments (NEW, ACTIVE, REPEAT,
-- VIP, AT_RISK, INACTIVE_30, INACTIVE_60, BIRTHDAY_MONTH, NEAR_REWARD) are
-- NOT stored per-customer; they're computed live from
-- customer_program_enrollments + loyalty_ledger. This keeps them always
-- correct and avoids a sync job. If this becomes a performance problem at
-- scale, revisit with a materialized view (see TODO.md).

create or replace function public.customer_segments(p_customer_id uuid, p_program_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  with e as (
    select * from public.customer_program_enrollments
    where customer_id = p_customer_id and program_id = p_program_id
  ),
  c as (
    select * from public.customers where id = p_customer_id
  ),
  nearest_reward as (
    select min(
      case
        when r.cost_stamps is not null and (select stamps_balance from e) is not null
          then r.cost_stamps - (select stamps_balance from e)
        when r.cost_points is not null and (select points_balance from e) is not null
          then r.cost_points - (select points_balance from e)
      end
    ) as gap
    from public.rewards r
    where r.program_id = p_program_id and r.is_active
  )
  select array_remove(array[
    case when (select visits_count from e) <= 1 then 'NEW' end,
    case when (select last_visit_at from e) >= now() - interval '30 days' then 'ACTIVE' end,
    case when (select visits_count from e) >= 5 then 'REPEAT' end,
    case when (select lifetime_stamps from e) >= 50 or (select lifetime_points from e) >= 500 then 'VIP' end,
    case when (select last_visit_at from e) < now() - interval '30 days'
      and (select last_visit_at from e) >= now() - interval '60 days' then 'AT_RISK' end,
    case when (select last_visit_at from e) < now() - interval '30 days'
      and (select last_visit_at from e) >= now() - interval '60 days' then 'INACTIVE_30' end,
    case when (select last_visit_at from e) < now() - interval '60 days' then 'INACTIVE_60' end,
    case when (select birthdate from c) is not null
      and extract(month from (select birthdate from c)) = extract(month from now()) then 'BIRTHDAY_MONTH' end,
    case when (select gap from nearest_reward) is not null and (select gap from nearest_reward) between 0 and 2 then 'NEAR_REWARD' end
  ], null);
$$;

-- Returns customers in an organization matching a built-in segment code, for
-- a given program. Used by the /customers filters and campaign audience
-- builder.
create or replace function public.customers_in_segment(p_organization_id uuid, p_program_id uuid, p_segment text)
returns setof public.customers
language sql
stable
security definer
set search_path = public
as $$
  select c.* from public.customers c
  join public.customer_program_enrollments e on e.customer_id = c.id and e.program_id = p_program_id
  where c.organization_id = p_organization_id
    and p_segment = any(public.customer_segments(c.id, p_program_id));
$$;
