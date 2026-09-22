-- WalletStore — 08. AuthZ helper functions
--
-- These are SECURITY DEFINER functions owned by the migration role (table
-- owner), which makes them exempt from RLS when they query tables directly
-- (Postgres exempts table owners from RLS unless FORCE ROW LEVEL SECURITY is
-- set, which we never set). This is the standard Supabase pattern to avoid
-- infinite-recursion when a table's own RLS policy needs to query that same
-- table (e.g. organization_members policies).
--
-- IMPORTANT: every function here treats `auth.uid()` as the only trusted
-- identity input. Callers never pass a user id to check "as"; that would let
-- a malicious client impersonate another user.

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_platform_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.current_org_role(p_org_id uuid)
returns member_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.organization_members
  where organization_id = p_org_id and user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin() or exists (
    select 1 from public.organization_members
    where organization_id = p_org_id and user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(p_org_id uuid, p_roles member_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin() or exists (
    select 1 from public.organization_members
    where organization_id = p_org_id
      and user_id = auth.uid()
      and role = any(p_roles)
  );
$$;

-- True when the caller may act on the given branch: unrestricted roles
-- (OWNER/ADMIN) always pass; BRANCH_MANAGER/CASHIER must have the branch in
-- their assigned branch_ids (empty branch_ids means "all branches").
create or replace function public.can_access_branch(p_org_id uuid, p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin() or exists (
    select 1 from public.organization_members m
    where m.organization_id = p_org_id
      and m.user_id = auth.uid()
      and (
        m.role in ('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN')
        or m.branch_ids = '{}'
        or p_branch_id = any(m.branch_ids)
      )
  );
$$;

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Atomically creates an organization and makes the calling user its OWNER.
-- This is the only supported way to create an organization from the app;
-- it sidesteps the chicken-and-egg RLS problem (you can't be a member of an
-- org that doesn't exist yet to satisfy the organization_members insert
-- policy).
create or replace function public.create_organization(
  p_name text,
  p_slug text,
  p_category text default null,
  p_country text default 'MX',
  p_currency text default 'MXN',
  p_timezone text default 'America/Mexico_City',
  p_phone text default null,
  p_email text default null,
  p_website text default null
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  insert into public.organizations (
    name, slug, category, country, currency, timezone, phone, email, website, created_by
  ) values (
    p_name, p_slug, p_category, p_country, p_currency, p_timezone, p_phone, p_email, p_website, auth.uid()
  )
  returning * into v_org;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org.id, auth.uid(), 'ORGANIZATION_OWNER');

  insert into public.events (organization_id, type, payload)
  values (v_org.id, 'organization.created', jsonb_build_object('organization_id', v_org.id));

  return v_org;
end;
$$;

-- Accepts a pending invitation for the currently authenticated user (must be
-- signed in with the invited email address).
create or replace function public.accept_invitation(p_token uuid)
returns public.organization_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.invitations;
  v_member public.organization_members;
  v_user_email citext;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select email into v_user_email from auth.users where id = auth.uid();

  select * into v_invite from public.invitations
  where token = p_token and status = 'PENDING'
  for update;

  if not found then
    raise exception 'invitation not found or already used';
  end if;

  if v_invite.expires_at < now() then
    update public.invitations set status = 'EXPIRED' where id = v_invite.id;
    raise exception 'invitation expired';
  end if;

  if v_invite.email <> v_user_email then
    raise exception 'invitation email does not match authenticated user';
  end if;

  insert into public.organization_members (organization_id, user_id, role, branch_ids, invited_by)
  values (v_invite.organization_id, auth.uid(), v_invite.role, v_invite.branch_ids, v_invite.invited_by)
  on conflict (organization_id, user_id) do update
    set role = excluded.role, branch_ids = excluded.branch_ids
  returning * into v_member;

  update public.invitations set status = 'ACCEPTED', accepted_at = now() where id = v_invite.id;

  return v_member;
end;
$$;
