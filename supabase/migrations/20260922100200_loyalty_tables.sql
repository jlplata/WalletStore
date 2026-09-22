-- WalletStore — 03. Loyalty engine tables

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  slug citext not null,
  type program_type not null,
  description text,
  reward_headline text,
  is_active boolean not null default true,
  primary_color text not null default '#171717',
  secondary_color text not null default '#ffffff',
  logo_url text,
  banner_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create trigger trg_programs_updated_at
  before update on public.programs
  for each row execute function public.set_updated_at();

create index programs_org_idx on public.programs (organization_id);

-- One active ruleset per program (MVP). Versioning noted in TODO.md.
create table public.program_rules (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade unique,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  -- STAMPS
  stamps_required int,
  stamps_per_purchase int not null default 1,
  min_purchase_amount_cents int not null default 0,
  -- POINTS
  points_per_currency_unit numeric,
  currency_unit_cents int not null default 100,
  points_expire_days int,
  manual_points_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_rules_stamps_positive check (stamps_required is null or stamps_required > 0),
  constraint program_rules_points_positive check (points_per_currency_unit is null or points_per_currency_unit > 0)
);

create trigger trg_program_rules_updated_at
  before update on public.program_rules
  for each row execute function public.set_updated_at();

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  public_code text not null, -- short human-friendly code for manual search, NOT used as a security token
  first_name text not null,
  last_name text,
  phone text,
  email citext,
  birthdate date,
  marketing_consent boolean not null default false,
  terms_accepted_at timestamptz,
  terms_version text,
  consent_source text,
  consent_ip inet,
  qr_token uuid not null default gen_random_uuid() unique, -- opaque, unpredictable identifier used in QR codes
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'BLOCKED')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, public_code)
);

create trigger trg_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create index customers_org_idx on public.customers (organization_id);
create index customers_phone_idx on public.customers (organization_id, phone);
create index customers_email_idx on public.customers (organization_id, email);
create index customers_qr_token_idx on public.customers (qr_token);

create table public.customer_consents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  consent_type consent_type not null,
  granted boolean not null,
  version text,
  source text,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index customer_consents_customer_idx on public.customer_consents (customer_id);

-- Cached balance per customer/program. Reconstructible 100% from loyalty_ledger
-- via public.recompute_customer_balance(). Source of truth is the ledger.
create table public.customer_program_enrollments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  stamps_balance int not null default 0,
  points_balance numeric not null default 0,
  lifetime_stamps int not null default 0,
  lifetime_points numeric not null default 0,
  visits_count int not null default 0,
  total_spend_cents bigint not null default 0,
  last_visit_at timestamptz,
  enrolled_at timestamptz not null default now(),
  unique (customer_id, program_id)
);

create index enrollments_org_idx on public.customer_program_enrollments (organization_id);
create index enrollments_program_idx on public.customer_program_enrollments (program_id);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  name text not null,
  description text,
  type reward_type not null,
  cost_stamps int,
  cost_points numeric,
  discount_amount_cents int,
  discount_percentage numeric,
  is_active boolean not null default true,
  per_customer_limit int,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rewards_cost_check check (cost_stamps is not null or cost_points is not null)
);

create trigger trg_rewards_updated_at
  before update on public.rewards
  for each row execute function public.set_updated_at();

create index rewards_program_idx on public.rewards (program_id);

create table public.purchase_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  branch_id uuid not null references public.branches (id),
  customer_id uuid not null references public.customers (id),
  program_id uuid not null references public.programs (id),
  staff_user_id uuid references auth.users (id),
  amount_cents int not null default 0,
  currency text not null default 'MXN',
  stamps_earned int not null default 0,
  points_earned numeric not null default 0,
  external_reference text,
  metadata jsonb not null default '{}'::jsonb,
  status transaction_status not null default 'COMPLETED',
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

create index purchase_tx_org_idx on public.purchase_transactions (organization_id, created_at desc);
create index purchase_tx_customer_idx on public.purchase_transactions (customer_id, created_at desc);
create index purchase_tx_branch_idx on public.purchase_transactions (branch_id);

create table public.customer_rewards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  program_id uuid not null references public.programs (id),
  reward_id uuid not null references public.rewards (id),
  status reward_instance_status not null default 'AVAILABLE',
  redemption_code text not null unique,
  unlocked_at timestamptz not null default now(),
  redeemed_at timestamptz,
  redeemed_by_staff_id uuid references auth.users (id),
  redeemed_branch_id uuid references public.branches (id),
  redemption_transaction_id uuid references public.purchase_transactions (id),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index customer_rewards_customer_idx on public.customer_rewards (customer_id);
create index customer_rewards_org_idx on public.customer_rewards (organization_id);
-- Prevents a double-redeem race: only one AVAILABLE instance transition happens
-- per redemption_code; the app layer also uses SELECT ... FOR UPDATE.
create index customer_rewards_status_idx on public.customer_rewards (status);

-- Immutable ledger. Source of truth for every stamp/point/refund. Never UPDATE
-- a row here; corrections are new ADJUSTMENT/REFUND rows.
create table public.loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id),
  program_id uuid not null references public.programs (id),
  branch_id uuid references public.branches (id),
  type ledger_entry_type not null,
  stamps_delta int not null default 0,
  points_delta numeric not null default 0,
  purchase_transaction_id uuid references public.purchase_transactions (id),
  reward_instance_id uuid references public.customer_rewards (id),
  staff_user_id uuid references auth.users (id),
  description text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

create index loyalty_ledger_customer_idx on public.loyalty_ledger (customer_id, created_at desc);
create index loyalty_ledger_org_idx on public.loyalty_ledger (organization_id, created_at desc);
create index loyalty_ledger_program_idx on public.loyalty_ledger (program_id);
