-- WalletStore — 02. Core tables: profiles, organizations, members, branches, invitations

-- One row per auth.users, created automatically by a trigger (see functions migration).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  slug citext not null unique,
  category text,
  country text not null default 'MX',
  currency text not null default 'MXN',
  timezone text not null default 'America/Mexico_City',
  phone text,
  email text,
  website text,
  logo_url text,
  banner_url text,
  brand_primary_color text not null default '#171717',
  brand_secondary_color text not null default '#ffffff',
  status organization_status not null default 'TRIAL',
  trial_ends_at timestamptz default (now() + interval '14 days'),
  is_demo boolean not null default false,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$')
);

create trigger trg_organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create index organizations_status_idx on public.organizations (status);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role member_role not null,
  branch_ids uuid[] not null default '{}',
  invited_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create trigger trg_organization_members_updated_at
  before update on public.organization_members
  for each row execute function public.set_updated_at();

create index organization_members_user_idx on public.organization_members (user_id);
create index organization_members_org_idx on public.organization_members (organization_id);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  address text,
  latitude double precision,
  longitude double precision,
  phone text,
  timezone text,
  opening_hours jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_branches_updated_at
  before update on public.branches
  for each row execute function public.set_updated_at();

create index branches_org_idx on public.branches (organization_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email citext not null,
  role member_role not null,
  branch_ids uuid[] not null default '{}',
  token uuid not null default gen_random_uuid() unique,
  invited_by uuid references auth.users (id),
  status invitation_status not null default 'PENDING',
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index invitations_org_idx on public.invitations (organization_id);
create index invitations_email_idx on public.invitations (email);
create unique index invitations_pending_unique on public.invitations (organization_id, email)
  where status = 'PENDING';
