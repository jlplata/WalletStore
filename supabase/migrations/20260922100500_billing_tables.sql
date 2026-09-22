-- WalletStore — 06. Billing (plans, features, subscriptions, usage)
-- Provider-agnostic: `subscriptions.billing_provider` selects the adapter
-- (see src/lib/billing/). Stripe is implemented first; Mercado Pago later.

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, -- STARTER | PRO | PREMIUM
  name text not null,
  description text,
  price_monthly_cents int not null,
  price_yearly_cents int,
  currency text not null default 'MXN',
  is_active boolean not null default true,
  sort_order int not null default 0,
  stripe_price_id_monthly text,
  stripe_price_id_yearly text,
  created_at timestamptz not null default now()
);

create table public.plan_features (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  key text not null, -- branches_limit | staff_limit | customers_limit | campaigns_enabled | advanced_segments | exports | api_access | white_label
  value jsonb not null,
  unique (plan_id, key)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade unique,
  plan_id uuid not null references public.plans (id),
  billing_provider text not null default 'stripe',
  provider_customer_id text,
  provider_subscription_id text,
  status subscription_status not null default 'TRIALING',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create index subscriptions_provider_sub_idx on public.subscriptions (provider_subscription_id);

create table public.usage_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  metric text not null, -- e.g. 'customers_count', 'staff_count', 'campaigns_sent'
  value bigint not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  created_at timestamptz not null default now()
);

create index usage_records_org_idx on public.usage_records (organization_id, metric, period_start desc);
