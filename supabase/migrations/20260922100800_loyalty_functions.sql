-- WalletStore — 09. Loyalty engine functions
--
-- These are the ONLY supported write paths for purchases, rewards and
-- balances. All of them are SECURITY DEFINER + run inside the implicit
-- function transaction, so a purchase's transaction row, ledger row, cached
-- balance update and reward-unlock evaluation are atomic (all-or-nothing).
-- Idempotency is enforced by the unique (organization_id, idempotency_key)
-- constraints on purchase_transactions and loyalty_ledger: a retried request
-- with the same key returns the original result instead of double-crediting.

-- Recomputes a customer's balance for a program directly from the ledger.
-- Used for reconciliation/testing; the cached balance in
-- customer_program_enrollments is what the app reads day to day.
create or replace function public.recompute_customer_balance(p_customer_id uuid, p_program_id uuid)
returns table (stamps_balance int, points_balance numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(sum(stamps_delta), 0)::int,
    coalesce(sum(points_delta), 0)::numeric
  from public.loyalty_ledger
  where customer_id = p_customer_id and program_id = p_program_id;
$$;

-- Registers a purchase, writes the ledger, updates the cached balance and
-- unlocks any rewards the customer now qualifies for.
create or replace function public.record_purchase_transaction(
  p_organization_id uuid,
  p_branch_id uuid,
  p_customer_id uuid,
  p_program_id uuid,
  p_amount_cents int,
  p_idempotency_key text,
  p_external_reference text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.purchase_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.purchase_transactions;
  v_tx public.purchase_transactions;
  v_rules public.program_rules;
  v_program public.programs;
  v_stamps_earned int := 0;
  v_points_earned numeric := 0;
  v_enrollment public.customer_program_enrollments;
  v_reward record;
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not public.has_org_role(p_organization_id, array[
    'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'BRANCH_MANAGER', 'CASHIER'
  ]::member_role[]) then
    raise exception 'not authorized for this organization';
  end if;

  if not public.can_access_branch(p_organization_id, p_branch_id) then
    raise exception 'not authorized for this branch';
  end if;

  -- Idempotency: a retried request with the same key returns the original row.
  select * into v_existing from public.purchase_transactions
  where organization_id = p_organization_id and idempotency_key = p_idempotency_key;
  if found then
    return v_existing;
  end if;

  select * into v_program from public.programs
  where id = p_program_id and organization_id = p_organization_id and is_active;
  if not found then
    raise exception 'program not found or inactive';
  end if;

  select * into v_rules from public.program_rules where program_id = p_program_id;
  if not found then
    raise exception 'program has no rules configured';
  end if;

  if p_amount_cents < v_rules.min_purchase_amount_cents then
    raise exception 'purchase amount below program minimum';
  end if;

  if v_program.type = 'STAMPS' then
    v_stamps_earned := v_rules.stamps_per_purchase;
  else
    if v_rules.points_per_currency_unit is not null and v_rules.currency_unit_cents > 0 then
      v_points_earned := floor(p_amount_cents / v_rules.currency_unit_cents::numeric) * v_rules.points_per_currency_unit;
    end if;
  end if;

  insert into public.purchase_transactions (
    organization_id, branch_id, customer_id, program_id, staff_user_id,
    amount_cents, stamps_earned, points_earned, external_reference, metadata,
    idempotency_key
  ) values (
    p_organization_id, p_branch_id, p_customer_id, p_program_id, auth.uid(),
    p_amount_cents, v_stamps_earned, v_points_earned, p_external_reference, p_metadata,
    p_idempotency_key
  )
  returning * into v_tx;

  insert into public.loyalty_ledger (
    organization_id, customer_id, program_id, branch_id, type,
    stamps_delta, points_delta, purchase_transaction_id, staff_user_id,
    description, idempotency_key
  ) values (
    p_organization_id, p_customer_id, p_program_id, p_branch_id,
    case when v_program.type = 'STAMPS' then 'STAMP_EARN' else 'POINTS_EARN' end,
    v_stamps_earned, v_points_earned, v_tx.id, auth.uid(),
    'Compra registrada', p_idempotency_key || ':purchase'
  );

  insert into public.customer_program_enrollments (
    customer_id, program_id, organization_id, stamps_balance, points_balance,
    lifetime_stamps, lifetime_points, visits_count, total_spend_cents, last_visit_at
  ) values (
    p_customer_id, p_program_id, p_organization_id, v_stamps_earned, v_points_earned,
    v_stamps_earned, v_points_earned, 1, p_amount_cents, now()
  )
  on conflict (customer_id, program_id) do update set
    stamps_balance = customer_program_enrollments.stamps_balance + excluded.stamps_balance,
    points_balance = customer_program_enrollments.points_balance + excluded.points_balance,
    lifetime_stamps = customer_program_enrollments.lifetime_stamps + excluded.lifetime_stamps,
    lifetime_points = customer_program_enrollments.lifetime_points + excluded.lifetime_points,
    visits_count = customer_program_enrollments.visits_count + 1,
    total_spend_cents = customer_program_enrollments.total_spend_cents + excluded.total_spend_cents,
    last_visit_at = now()
  returning * into v_enrollment;

  insert into public.events (organization_id, type, payload)
  values (
    p_organization_id, 'purchase.completed',
    jsonb_build_object('transaction_id', v_tx.id, 'customer_id', p_customer_id, 'program_id', p_program_id)
  );
  insert into public.events (organization_id, type, payload)
  values (
    p_organization_id, 'loyalty.earned',
    jsonb_build_object(
      'customer_id', p_customer_id, 'program_id', p_program_id,
      'stamps_earned', v_stamps_earned, 'points_earned', v_points_earned
    )
  );

  -- Evaluate reward unlocks for this program's active rewards.
  for v_reward in
    select * from public.rewards
    where program_id = p_program_id
      and is_active
      and (valid_until is null or valid_until > now())
      and (
        (cost_stamps is not null and v_enrollment.stamps_balance >= cost_stamps)
        or (cost_points is not null and v_enrollment.points_balance >= cost_points)
      )
  loop
    -- Skip if the customer already has an AVAILABLE instance of this reward.
    continue when exists (
      select 1 from public.customer_rewards
      where customer_id = p_customer_id and reward_id = v_reward.id and status = 'AVAILABLE'
    );
    -- Enforce per-customer lifetime limit (counts REDEEMED + AVAILABLE).
    continue when v_reward.per_customer_limit is not null and (
      select count(*) from public.customer_rewards
      where customer_id = p_customer_id and reward_id = v_reward.id
        and status in ('AVAILABLE', 'REDEEMED')
    ) >= v_reward.per_customer_limit;

    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    insert into public.customer_rewards (
      organization_id, customer_id, program_id, reward_id, redemption_code, expires_at
    ) values (
      p_organization_id, p_customer_id, p_program_id, v_reward.id, v_code,
      case when v_reward.valid_until is not null then v_reward.valid_until else null end
    );

    insert into public.events (organization_id, type, payload)
    values (
      p_organization_id, 'reward.unlocked',
      jsonb_build_object('customer_id', p_customer_id, 'reward_id', v_reward.id)
    );
  end loop;

  return v_tx;
end;
$$;

-- Redeems an AVAILABLE reward instance. Uses SELECT ... FOR UPDATE to
-- prevent a double-redeem race between two concurrent cashier requests.
create or replace function public.redeem_customer_reward(
  p_customer_reward_id uuid,
  p_branch_id uuid
)
returns public.customer_rewards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward_instance public.customer_rewards;
  v_reward public.rewards;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_reward_instance from public.customer_rewards
  where id = p_customer_reward_id
  for update;

  if not found then
    raise exception 'reward instance not found';
  end if;

  if not public.has_org_role(v_reward_instance.organization_id, array[
    'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'BRANCH_MANAGER', 'CASHIER'
  ]::member_role[]) then
    raise exception 'not authorized for this organization';
  end if;

  if not public.can_access_branch(v_reward_instance.organization_id, p_branch_id) then
    raise exception 'not authorized for this branch';
  end if;

  if v_reward_instance.status = 'REDEEMED' then
    raise exception 'reward already redeemed';
  end if;

  if v_reward_instance.status <> 'AVAILABLE' then
    raise exception 'reward is not available (%.)', v_reward_instance.status;
  end if;

  if v_reward_instance.expires_at is not null and v_reward_instance.expires_at < now() then
    update public.customer_rewards set status = 'EXPIRED' where id = v_reward_instance.id;
    raise exception 'reward has expired';
  end if;

  select * into v_reward from public.rewards where id = v_reward_instance.reward_id;

  update public.customer_rewards set
    status = 'REDEEMED',
    redeemed_at = now(),
    redeemed_by_staff_id = auth.uid(),
    redeemed_branch_id = p_branch_id
  where id = v_reward_instance.id
  returning * into v_reward_instance;

  if v_reward.cost_stamps is not null or v_reward.cost_points is not null then
    insert into public.loyalty_ledger (
      organization_id, customer_id, program_id, branch_id, type,
      stamps_delta, points_delta, reward_instance_id, staff_user_id, description, idempotency_key
    ) values (
      v_reward_instance.organization_id, v_reward_instance.customer_id, v_reward_instance.program_id, p_branch_id,
      'REDEMPTION', coalesce(-v_reward.cost_stamps, 0), coalesce(-v_reward.cost_points, 0),
      v_reward_instance.id, auth.uid(), 'Canje de recompensa: ' || v_reward.name,
      'redeem:' || v_reward_instance.id::text
    );

    update public.customer_program_enrollments set
      stamps_balance = stamps_balance - coalesce(v_reward.cost_stamps, 0),
      points_balance = points_balance - coalesce(v_reward.cost_points, 0)
    where customer_id = v_reward_instance.customer_id and program_id = v_reward_instance.program_id;
  end if;

  insert into public.events (organization_id, type, payload)
  values (
    v_reward_instance.organization_id, 'reward.redeemed',
    jsonb_build_object('customer_id', v_reward_instance.customer_id, 'reward_id', v_reward_instance.reward_id)
  );

  return v_reward_instance;
end;
$$;

-- Voids/refunds a purchase, reversing its ledger effect. Cannot be called
-- twice on the same transaction.
create or replace function public.refund_purchase_transaction(p_transaction_id uuid)
returns public.purchase_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.purchase_transactions;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_tx from public.purchase_transactions where id = p_transaction_id for update;
  if not found then
    raise exception 'transaction not found';
  end if;

  if not public.has_org_role(v_tx.organization_id, array[
    'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'BRANCH_MANAGER'
  ]::member_role[]) then
    raise exception 'not authorized for this organization';
  end if;

  if v_tx.status <> 'COMPLETED' then
    raise exception 'transaction already %', v_tx.status;
  end if;

  update public.purchase_transactions set status = 'REFUNDED' where id = v_tx.id
  returning * into v_tx;

  insert into public.loyalty_ledger (
    organization_id, customer_id, program_id, branch_id, type,
    stamps_delta, points_delta, purchase_transaction_id, staff_user_id, description, idempotency_key
  ) values (
    v_tx.organization_id, v_tx.customer_id, v_tx.program_id, v_tx.branch_id, 'REFUND',
    -v_tx.stamps_earned, -v_tx.points_earned, v_tx.id, auth.uid(), 'Reembolso de compra',
    v_tx.idempotency_key || ':refund'
  );

  update public.customer_program_enrollments set
    stamps_balance = stamps_balance - v_tx.stamps_earned,
    points_balance = points_balance - v_tx.points_earned
  where customer_id = v_tx.customer_id and program_id = v_tx.program_id;

  return v_tx;
end;
$$;

-- Manual point/stamp adjustment (bonus or correction). Requires a reason and
-- is restricted to managers+ to satisfy the "no silent point grants" rule.
create or replace function public.adjust_customer_balance(
  p_organization_id uuid,
  p_customer_id uuid,
  p_program_id uuid,
  p_stamps_delta int,
  p_points_delta numeric,
  p_reason text
)
returns public.customer_program_enrollments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enrollment public.customer_program_enrollments;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'a reason is required for manual adjustments';
  end if;

  if not public.has_org_role(p_organization_id, array[
    'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'BRANCH_MANAGER'
  ]::member_role[]) then
    raise exception 'not authorized for this organization';
  end if;

  insert into public.loyalty_ledger (
    organization_id, customer_id, program_id, type, stamps_delta, points_delta,
    staff_user_id, description, idempotency_key
  ) values (
    p_organization_id, p_customer_id, p_program_id, 'ADJUSTMENT', p_stamps_delta, p_points_delta,
    auth.uid(), p_reason, 'adj:' || gen_random_uuid()::text
  );

  insert into public.customer_program_enrollments (
    customer_id, program_id, organization_id, stamps_balance, points_balance
  ) values (
    p_customer_id, p_program_id, p_organization_id, p_stamps_delta, p_points_delta
  )
  on conflict (customer_id, program_id) do update set
    stamps_balance = customer_program_enrollments.stamps_balance + excluded.stamps_balance,
    points_balance = customer_program_enrollments.points_balance + excluded.points_balance
  returning * into v_enrollment;

  return v_enrollment;
end;
$$;
