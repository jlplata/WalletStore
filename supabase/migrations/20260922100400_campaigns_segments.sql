-- WalletStore — 05. Campaigns & segments

-- Custom/future segment definitions. The built-in segments (NEW, ACTIVE,
-- REPEAT, VIP, AT_RISK, INACTIVE_30, INACTIVE_60, BIRTHDAY_MONTH,
-- NEAR_REWARD) are computed live via public.customer_segments() and are not
-- stored per-customer (see docs/database.md).
create table public.segments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  rules jsonb not null default '{}'::jsonb,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create trigger trg_segments_updated_at
  before update on public.segments
  for each row execute function public.set_updated_at();

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  program_id uuid references public.programs (id),
  name text not null,
  type campaign_type not null,
  status campaign_status not null default 'DRAFT',
  channel campaign_channel not null default 'EMAIL',
  subject text,
  message text,
  audience_segment text not null default 'ALL',
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_campaigns_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

create index campaigns_org_idx on public.campaigns (organization_id);

-- Resolved audience snapshot at send time (so a later change in segment
-- membership doesn't retroactively change who a sent campaign targeted).
create table public.campaign_audiences (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (campaign_id, customer_id)
);

create table public.campaign_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  channel campaign_channel not null,
  status delivery_status not null default 'QUEUED',
  provider_message_id text,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index campaign_deliveries_campaign_idx on public.campaign_deliveries (campaign_id);
create index campaign_deliveries_customer_idx on public.campaign_deliveries (customer_id);
