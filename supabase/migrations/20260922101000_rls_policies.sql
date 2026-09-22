-- WalletStore — 11. Row Level Security
--
-- Every business table gets RLS enabled. Where a table is only ever written
-- through a SECURITY DEFINER function (see 08/09/10), we deliberately do NOT
-- add an INSERT/UPDATE policy for `authenticated`/`anon`: RLS default-denies
-- direct writes, while the function (owned by the table owner) still bypasses
-- RLS. This makes the ledger and other sensitive write paths tamper-proof
-- even against a compromised or buggy client.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_platform_admin());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create or replace function public.protect_profile_admin_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_platform_admin is distinct from old.is_platform_admin and not public.is_platform_admin() then
    new.is_platform_admin = old.is_platform_admin;
  end if;
  return new;
end;
$$;

create trigger trg_protect_profile_admin_flag
  before update on public.profiles
  for each row execute function public.protect_profile_admin_flag();

-- ---------------------------------------------------------------------------
-- organizations
-- Branding fields (name, slug, logo, colors) must be readable by anonymous
-- visitors on the public /join/[slug] page, so SELECT is intentionally open.
-- This table holds no secrets (billing lives in `subscriptions`).
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;

create policy "organizations_select_public"
  on public.organizations for select
  using (true);

create policy "organizations_update_owner_admin"
  on public.organizations for update
  using (public.has_org_role(id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]))
  with check (public.has_org_role(id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]));

-- No INSERT/DELETE policy: creation goes through public.create_organization();
-- deletion is a platform-admin-only operation done via service_role.

-- ---------------------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------------------
alter table public.organization_members enable row level security;

create policy "org_members_select"
  on public.organization_members for select
  using (public.is_org_member(organization_id));

create policy "org_members_update_owner_admin"
  on public.organization_members for update
  using (public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]))
  with check (public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]));

create policy "org_members_delete_owner_admin"
  on public.organization_members for delete
  using (public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]));

-- No direct INSERT policy: membership is created by create_organization() or
-- accept_invitation().

-- ---------------------------------------------------------------------------
-- branches
-- ---------------------------------------------------------------------------
alter table public.branches enable row level security;

create policy "branches_select"
  on public.branches for select
  using (public.is_org_member(organization_id));

create policy "branches_insert_owner_admin"
  on public.branches for insert
  with check (public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]));

create policy "branches_update_owner_admin"
  on public.branches for update
  using (public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]))
  with check (public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]));

create policy "branches_delete_owner_admin"
  on public.branches for delete
  using (public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]));

-- ---------------------------------------------------------------------------
-- invitations — owner/admin only, never exposed to anon.
-- ---------------------------------------------------------------------------
alter table public.invitations enable row level security;

create policy "invitations_manage_owner_admin"
  on public.invitations for all
  using (public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]))
  with check (public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]));

-- ---------------------------------------------------------------------------
-- programs / program_rules / rewards
-- Publicly readable when active (needed by the /join/[slug] landing page);
-- writes restricted to owner/admin.
-- ---------------------------------------------------------------------------
alter table public.programs enable row level security;

create policy "programs_select_public_active_or_member"
  on public.programs for select
  using (is_active or public.is_org_member(organization_id));

create policy "programs_insert_owner_admin"
  on public.programs for insert
  with check (public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]));

create policy "programs_update_owner_admin"
  on public.programs for update
  using (public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]))
  with check (public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]));

create policy "programs_delete_owner_admin"
  on public.programs for delete
  using (public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]));

alter table public.program_rules enable row level security;

create policy "program_rules_select_public"
  on public.program_rules for select
  using (true);

create policy "program_rules_manage_owner_admin"
  on public.program_rules for all
  using (public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]))
  with check (public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]));

alter table public.rewards enable row level security;

create policy "rewards_select_public_active_or_member"
  on public.rewards for select
  using (is_active or public.is_org_member(organization_id));

create policy "rewards_manage_owner_admin"
  on public.rewards for all
  using (public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]))
  with check (public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]));

-- ---------------------------------------------------------------------------
-- customers / consents / enrollments — staff-only, never public.
-- ---------------------------------------------------------------------------
alter table public.customers enable row level security;

create policy "customers_select_staff"
  on public.customers for select
  using (public.is_org_member(organization_id));

create policy "customers_update_staff"
  on public.customers for update
  using (public.has_org_role(organization_id, array[
    'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'BRANCH_MANAGER', 'CASHIER'
  ]::member_role[]))
  with check (public.has_org_role(organization_id, array[
    'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'BRANCH_MANAGER', 'CASHIER'
  ]::member_role[]));

-- No direct INSERT policy: public registration goes through
-- public.register_customer(); staff-created customers use the same RPC.

alter table public.customer_consents enable row level security;

create policy "customer_consents_select_staff"
  on public.customer_consents for select
  using (public.is_org_member(organization_id));

alter table public.customer_program_enrollments enable row level security;

create policy "enrollments_select_staff"
  on public.customer_program_enrollments for select
  using (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- purchase_transactions / loyalty_ledger / customer_rewards
-- Branch-scoped visibility for managers/cashiers restricted to specific
-- branches; owner/admin see everything. All writes go through the RPCs in
-- migration 09.
-- ---------------------------------------------------------------------------
alter table public.purchase_transactions enable row level security;

create policy "purchase_tx_select_scoped"
  on public.purchase_transactions for select
  using (public.is_org_member(organization_id) and public.can_access_branch(organization_id, branch_id));

alter table public.loyalty_ledger enable row level security;

create policy "loyalty_ledger_select_scoped"
  on public.loyalty_ledger for select
  using (
    public.is_org_member(organization_id)
    and (branch_id is null or public.can_access_branch(organization_id, branch_id))
  );

alter table public.customer_rewards enable row level security;

create policy "customer_rewards_select_staff"
  on public.customer_rewards for select
  using (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- wallet_passes / wallet_devices — staff read-only; all writes are done by
-- the server (service_role) when issuing/updating passes.
-- ---------------------------------------------------------------------------
alter table public.wallet_passes enable row level security;

create policy "wallet_passes_select_staff"
  on public.wallet_passes for select
  using (public.is_org_member(organization_id));

alter table public.wallet_devices enable row level security;

create policy "wallet_devices_select_staff"
  on public.wallet_devices for select
  using (
    exists (
      select 1 from public.wallet_passes wp
      where wp.id = wallet_pass_id and public.is_org_member(wp.organization_id)
    )
  );

-- ---------------------------------------------------------------------------
-- segments
-- ---------------------------------------------------------------------------
alter table public.segments enable row level security;

create policy "segments_select_staff"
  on public.segments for select
  using (public.is_org_member(organization_id));

create policy "segments_manage_owner_admin"
  on public.segments for all
  using (public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]))
  with check (public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]));

-- ---------------------------------------------------------------------------
-- campaigns / campaign_audiences / campaign_deliveries
-- ---------------------------------------------------------------------------
alter table public.campaigns enable row level security;

create policy "campaigns_select_staff"
  on public.campaigns for select
  using (public.is_org_member(organization_id));

create policy "campaigns_manage_owner_admin"
  on public.campaigns for all
  using (public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]))
  with check (public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]));

alter table public.campaign_audiences enable row level security;

create policy "campaign_audiences_select_staff"
  on public.campaign_audiences for select
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id and public.is_org_member(c.organization_id)
    )
  );

alter table public.campaign_deliveries enable row level security;

create policy "campaign_deliveries_select_staff"
  on public.campaign_deliveries for select
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id and public.is_org_member(c.organization_id)
    )
  );

-- ---------------------------------------------------------------------------
-- billing: plans (public pricing) / plan_features (public) / subscriptions
-- (owner+admin only) / usage_records (owner+admin only)
-- ---------------------------------------------------------------------------
alter table public.plans enable row level security;

create policy "plans_select_public"
  on public.plans for select
  using (is_active);

alter table public.plan_features enable row level security;

create policy "plan_features_select_public"
  on public.plan_features for select
  using (true);

alter table public.subscriptions enable row level security;

create policy "subscriptions_select_owner_admin"
  on public.subscriptions for select
  using (public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]));

alter table public.usage_records enable row level security;

create policy "usage_records_select_owner_admin"
  on public.usage_records for select
  using (public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]));

-- ---------------------------------------------------------------------------
-- platform: events / webhooks / webhook_deliveries / audit_logs / fraud_flags
-- ---------------------------------------------------------------------------
alter table public.events enable row level security;

create policy "events_select_owner_admin"
  on public.events for select
  using (organization_id is not null and public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]));

alter table public.webhooks enable row level security;

create policy "webhooks_manage_owner_admin"
  on public.webhooks for all
  using (public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]))
  with check (public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]));

alter table public.webhook_deliveries enable row level security;

create policy "webhook_deliveries_select_owner_admin"
  on public.webhook_deliveries for select
  using (
    exists (
      select 1 from public.webhooks w
      where w.id = webhook_id and public.has_org_role(w.organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[])
    )
  );

alter table public.audit_logs enable row level security;

create policy "audit_logs_select_owner_admin_or_platform"
  on public.audit_logs for select
  using (
    public.is_platform_admin()
    or (organization_id is not null and public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]))
  );

alter table public.fraud_flags enable row level security;

create policy "fraud_flags_select_owner_admin"
  on public.fraud_flags for select
  using (public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]));

-- ---------------------------------------------------------------------------
-- privacy_requests — write-only from the public RPC; readable by org staff.
-- ---------------------------------------------------------------------------
alter table public.privacy_requests enable row level security;

create policy "privacy_requests_select_owner_admin"
  on public.privacy_requests for select
  using (organization_id is not null and public.has_org_role(organization_id, array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]));

-- ---------------------------------------------------------------------------
-- Lock down direct table grants for anon/authenticated. Supabase grants
-- broad table privileges to these roles by default; RLS policies above are
-- the real gate, but we also revoke write privileges the policies never use
-- so a future policy bug fails closed instead of open.
-- ---------------------------------------------------------------------------
revoke insert, update, delete on public.purchase_transactions from anon, authenticated;
revoke insert, update, delete on public.loyalty_ledger from anon, authenticated;
revoke insert, update, delete on public.customer_rewards from anon, authenticated;
revoke insert, update, delete on public.customer_program_enrollments from anon, authenticated;
revoke insert, update, delete on public.customer_consents from anon, authenticated;
revoke insert on public.customers from anon, authenticated;
revoke insert, update, delete on public.organizations from anon, authenticated;
revoke insert, update, delete on public.organization_members from anon;
revoke insert on public.organization_members from authenticated;
revoke all on public.wallet_passes from anon;
revoke insert, update, delete on public.wallet_passes from authenticated;
revoke all on public.wallet_devices from anon;
revoke insert, update, delete on public.wallet_devices from authenticated;
revoke all on public.events from anon;
revoke insert, update, delete on public.events from authenticated;
revoke all on public.audit_logs from anon;
revoke insert, update, delete on public.audit_logs from authenticated;
revoke all on public.subscriptions from anon;
revoke insert, update, delete on public.subscriptions from authenticated;
revoke all on public.webhook_deliveries from anon;
revoke insert, update, delete on public.webhook_deliveries from authenticated;
revoke all on public.fraud_flags from anon;
revoke insert, update, delete on public.fraud_flags from authenticated;
revoke insert, update, delete on public.privacy_requests from anon, authenticated;
